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

use App\Models\WalletLedgerEntry;

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
        $suggestedPercentage = 30; // Changed to 30% based on GEMINI2.md

        if ($payments->count() > 0) {
            $hasDeposit = $payments->where('milestone', 'DEPOSIT')->count() > 0;
            $hasInterim = $payments->where('milestone', 'INTERIM')->count() > 0;

            if ($hasDeposit && !$hasInterim) {
                $nextMilestone = 'INTERIM';
                $suggestedPercentage = 30; // 30% Interim
            } elseif ($hasDeposit && $hasInterim) {
                $nextMilestone = 'FINAL';
                $suggestedPercentage = 40; // 40% Final
            } else {
                $nextMilestone = 'CUSTOM';
                $suggestedPercentage = 0;
            }
        }

        $suggestedAmount = ($booking->agreed_amount * $suggestedPercentage) / 100;

        return $this->successResponse('Payment info fetched successfully', [
            'booking' => new \App\Http\Resources\EventVendorResource($booking),
            'payments' => \App\Http\Resources\VendorPaymentResource::collection($payments),
            'event_wallet_balance' => (float)($booking->event->wallet->current_balance ?? 0),
            'next_suggested' => [
                'milestone' => $nextMilestone,
                'percentage' => $suggestedPercentage,
                'amount' => $suggestedAmount
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
            'proof_attachment' => 'nullable|file|mimetypes:image/jpeg,image/png,image/jpg,image/webp,application/pdf|max:10240',
            'notes' => 'nullable|string',
            'metadata' => 'nullable|array'
        ]);

        $booking = EventVendor::with(['event', 'event.wallet', 'vendor', 'vendor.user'])->findOrFail($bookingId);
        
        // Security check
        if ($booking->event->owner_user_id !== auth()->id()) {
            return $this->errorResponse('Unauthorized.', [], 403);
        }

        // Wallet check
        $wallet = $booking->event->wallet;
        if (!$wallet || $wallet->current_balance < $request->amount) {
            return $this->errorResponse('Insufficient funds in Event Wallet.', [], 422);
        }

        DB::beginTransaction();
        try {
            // Handle Proof Upload
            $proofUrl = null;
            if ($request->hasFile('proof_attachment')) {
                $proofUrl = $request->file('proof_attachment')->store('vendor_payments/proofs', 'public');
            }

            // DEPOSIT/INTERIM (30%/30%) are released to vendor immediately.
            // FINAL (40%) is held until Host confirms service delivery.
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
                'payment_status' => 'SUCCESS',
                'transaction_reference' => $request->transaction_reference,
                'proof_attachment_url' => $proofUrl,
                'payment_date' => now(),
                'notes' => $request->notes,
                'recorded_by' => auth()->id(),
                'is_released' => $isReleased,
                'metadata' => $request->metadata
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

            // NEW: Auto-transition Budget Item Status to IN_PROGRESS
            if ($booking->budgetItem) {
                $booking->budgetItem->update(['budget_item_status' => 'IN_PROGRESS']);
            }

            // 5. Write to Ledger (Perfect Traceability)
            WalletLedgerEntry::create([
                'id' => (string) Str::uuid(),
                'wallet_id' => $wallet->id,
                'event_id' => $booking->event_id,
                'entry_type' => 'DEBIT',
                'source_type' => 'VENDOR_PAYMENT',
                'source_id' => $payment->id,
                'amount' => $request->amount,
                'description' => "Milestone Payment ({$request->milestone}) to {$booking->vendor->business_name}",
                'entry_date' => now(),
                'created_by' => auth()->id(),
                'metadata' => array_merge($request->metadata ?? [], ['vendor_name' => $booking->vendor->business_name])
            ]);

            // 6. Automatically Transition Event to ACTIVE on first Deposit
            if ($request->milestone === 'DEPOSIT' && $booking->event->event_status === 'PLANNING') {
                $booking->event->update(['event_status' => 'ACTIVE']);
            }

            // 7. Notify Vendor
            NotificationService::notify(
                $booking->vendor->user,
                "Payment Received: " . formatCurrency($request->amount),
                "A payment of " . formatCurrency($request->amount) . " has been recorded for " . $booking->event->event_name . " (" . $request->milestone . "). Please confirm receipt once you see it in your account.",
                [
                    'icon' => 'DollarSign', 
                    'event_id' => $booking->event_id, 
                    'booking_id' => $booking->id,
                    'link' => '/vendor/dashboard'
                ],
                auth()->user()
            );

            DB::commit();
            return $this->successResponse('Payment recorded successfully.', new \App\Http\Resources\VendorPaymentResource($payment));
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Payment failed: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Vendor confirms they have received the payment in their real account
     */
    public function confirmReceipt($paymentId)
    {
        $payment = VendorPayment::with(['vendor', 'vendor.user', 'event', 'event.owner'])->findOrFail($paymentId);

        // Security check: Only the vendor who received the payment can confirm it
        if ($payment->vendor->user_id !== auth()->id()) {
            return $this->errorResponse('Unauthorized.', [], 403);
        }

        if ($payment->is_vendor_confirmed) {
            return $this->errorResponse('This payment has already been confirmed.', [], 422);
        }

        DB::beginTransaction();
        try {
            $payment->update([
                'is_vendor_confirmed' => true,
                'vendor_confirmed_at' => now()
            ]);

            // Notify Host
            NotificationService::notify(
                $payment->event->owner,
                "Payment Confirmed by Vendor",
                "{$payment->vendor->business_name} has confirmed receipt of the " . formatCurrency($payment->amount) . " payment for {$payment->event->event_name}.",
                [
                    'icon' => 'CheckCircle', 
                    'event_id' => $payment->event_id, 
                    'payment_id' => $payment->id,
                    'link' => "/events/{$payment->event_id}?tab=vendors"
                ],
                auth()->user()
            );

            DB::commit();
            return $this->successResponse('Payment receipt confirmed successfully.', new \App\Http\Resources\VendorPaymentResource($payment));
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Confirmation failed: ' . $e->getMessage(), [], 500);
        }
    }
}

// Global Helper for internal use in controller if not already available
if (!function_exists('formatCurrency')) {
    function formatCurrency($amount) {
        return "TZS " . number_format($amount, 0);
    }
}
