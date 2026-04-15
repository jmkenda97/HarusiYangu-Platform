<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventVendor;
use App\Models\VendorPayment;
use App\Models\VendorWallet;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class VendorPaymentController extends Controller
{
    /**
     * Get payment history and next suggested milestone for a vendor
     */
    public function getPaymentInfo($bookingId)
    {
        $booking = EventVendor::with(['event', 'event.wallet', 'vendor'])->findOrFail($bookingId);
        $payments = VendorPayment::where('event_vendor_id', $bookingId)->orderBy('created_at', 'desc')->get();

        $nextMilestone = 'DEPOSIT';
        $suggestedPercentage = 20;

        if ($payments->count() > 0) {
            $hasDeposit = $payments->where('milestone', 'DEPOSIT')->count() > 0;
            $hasInterim = $payments->where('milestone', 'INTERIM')->count() > 0;

            if ($hasDeposit && !$hasInterim) {
                $nextMilestone = 'INTERIM';
                $suggestedPercentage = 50;
            } elseif ($hasDeposit && $hasInterim) {
                $nextMilestone = 'FINAL';
                $suggestedPercentage = 30;
            } else {
                // If it's a custom payment or something else, default to 0
                $nextMilestone = 'CUSTOM';
                $suggestedPercentage = 0;
            }
        }

        $suggestedAmount = ($booking->agreed_amount * $suggestedPercentage) / 100;

        return response()->json([
            'success' => true,
            'data' => [
                'booking' => $booking,
                'payments' => $payments,
                'event_wallet_balance' => $booking->event->wallet->current_balance ?? 0,
                'next_suggested' => [
                    'milestone' => $nextMilestone,
                    'percentage' => $suggestedPercentage,
                    'amount' => $suggestedAmount
                ]
            ]
        ]);
    }

    /**
     * Record a milestone payment
     */
    public function store(Request $request, $bookingId)
    {
        $request->validate([
            'amount' => 'required|numeric|min:1',
            'milestone' => 'required|string|in:DEPOSIT,INTERIM,FINAL,CUSTOM',
            'payment_method' => 'required|string',
            'transaction_reference' => 'nullable|string',
            'notes' => 'nullable|string'
        ]);

        $booking = EventVendor::with(['event', 'event.wallet', 'vendor', 'vendor.user'])->findOrFail($bookingId);
        
        // Security check
        if ($booking->event->owner_user_id !== auth()->id()) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        // Wallet check
        $wallet = $booking->event->wallet;
        if (!$wallet || $wallet->current_balance < $request->amount) {
            return response()->json(['success' => false, 'message' => 'Insufficient funds in Event Wallet.'], 422);
        }

        DB::beginTransaction();
        try {
            // Following GEMINI.md: DEPOSIT/INTERIM are released to lock date/work.
            // FINAL is held until Host confirms service delivery.
            $isReleased = in_array($request->milestone, ['DEPOSIT', 'INTERIM']);

            // 1. Create Payment Record
            $payment = VendorPayment::create([
                'id' => (string) Str::uuid(),
                'event_id' => $booking->event_id,
                'event_vendor_id' => $booking->id,
                'vendor_id' => $booking->vendor_id,
                'amount' => $request->amount,
                'milestone' => $request->milestone,
                'payment_method' => $request->payment_method,
                'payment_status' => 'COMPLETED',
                'transaction_reference' => $request->transaction_reference,
                'payment_date' => now(),
                'notes' => $request->notes,
                'recorded_by' => auth()->id(),
                'is_released' => $isReleased
            ]);

            // 2. Update Event Wallet (Deduct)
            $wallet->decrement('current_balance', $request->amount);
            $wallet->increment('total_outflow', $request->amount);

            // 3. Update Vendor Wallet (Credit)
            $vendorWallet = VendorWallet::firstOrCreate(
                ['vendor_id' => $booking->vendor_id],
                ['id' => (string) Str::uuid()]
            );
            
            if ($isReleased) {
                $vendorWallet->increment('available_balance', $request->amount);
            } else {
                $vendorWallet->increment('pending_balance', $request->amount);
            }
            $vendorWallet->increment('total_earnings', $request->amount);

            // 4. Update Booking Totals
            $booking->increment('amount_paid', $request->amount);
            $booking->decrement('balance_due', $request->amount);

            // 5. Notify Vendor
            NotificationService::notify(
                $booking->vendor->user,
                "Payment Received: " . formatCurrency($request->amount),
                "A payment of " . formatCurrency($request->amount) . " has been recorded for " . $booking->event->event_name . " (" . $request->milestone . ").",
                ['icon' => 'DollarSign', 'event_id' => $booking->event_id],
                auth()->user()
            );

            DB::commit();
            return response()->json(['success' => true, 'message' => 'Payment recorded successfully.', 'data' => $payment]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Payment failed: ' . $e->getMessage()], 500);
        }
    }
}

// Global Helper for internal use in controller if not already available
if (!function_exists('formatCurrency')) {
    function formatCurrency($amount) {
        return "TZS " . number_format($amount, 0);
    }
}
