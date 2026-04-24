<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventVendor;
use App\Models\EventBudgetItem;
use App\Models\Vendor;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class EventBookingController extends Controller
{
    use \App\Traits\ApiResponse;

    /**
     * Host sends an Inquiry to a Vendor
     */
    public function sendInquiry(Request $request, $eventId)
    {
        $request->validate([
            'vendor_id' => 'required|exists:vendors,id',
            'budget_item_id' => 'required|exists:event_budget_items,id',
            'assigned_service' => 'required|string|max:255',
            'contract_notes' => 'nullable|string',
        ]);

        $event = Event::findOrFail($eventId);

        // SECURITY CHECK: Ensure the authenticated user owns this event
        if ($event->owner_user_id !== auth()->id()) {
            return $this->errorResponse('Unauthorized. You can only inquire for events you own.', [], 403);
        }

        $vendor = Vendor::with('user')->findOrFail($request->vendor_id);

        // Check if already inquiring this vendor for this service
        $exists = EventVendor::where('event_id', $eventId)
            ->where('vendor_id', $request->vendor_id)
            ->whereIn('status', ['INQUIRY', 'QUOTED', 'ACCEPTED'])
            ->exists();

        if ($exists) {
            return $this->errorResponse('You already have an active inquiry/booking with this vendor.', [], 422);
        }

        $eventVendor = EventVendor::create([
            'id' => (string) Str::uuid(),
            'event_id' => $eventId,
            'vendor_id' => $request->vendor_id,
            'budget_item_id' => $request->budget_item_id,
            'status' => 'INQUIRY',
            'assigned_service' => $request->assigned_service,
            'contract_notes' => $request->contract_notes,
            'created_by' => auth()->id(),
        ]);

        // Notify Vendor
        NotificationService::notify(
            $vendor->user,
            "New Inquiry for " . $event->event_name,
            "A host has sent you an inquiry for " . $request->assigned_service . ". Please review and provide a quote.",
            [
                'icon' => 'MessageSquare', 
                'event_id' => $eventId, 
                'booking_id' => $eventVendor->id,
                'link' => '/vendor/dashboard'
            ],
            auth()->user()
        );

        return $this->successResponse('Inquiry sent successfully.', $eventVendor);
    }

    /**
     * Vendor sends a Quote (Professional Invoice Proposal) back to the Host
     */
    public function sendQuote(Request $request, $bookingId)
    {
        $request->validate([
            'quote_amount' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $booking = EventVendor::with(['event', 'event.owner', 'vendor'])->findOrFail($bookingId);
        
        // Ensure only the vendor user can send a quote
        if (auth()->id() !== $booking->vendor->user_id) {
            return $this->errorResponse('Unauthorized.', [], 403);
        }

        // Check if vendor has a primary payout account
        $primaryAccount = \App\Models\VendorPayoutAccount::where('vendor_id', $booking->vendor_id)
            ->where('is_primary', true)
            ->first();

        if (!$primaryAccount) {
            return $this->errorResponse('Please set up a primary payout account (Bank or Mobile Money) before sending an invoice.', [
                'payout_account' => ['A primary payout account is required for invoices.']
            ], 422);
        }

        // Automatically structure the 30/30/40 Milestones in metadata
        $milestones = [
            'phase_1' => [
                'name' => 'Deposit (30%)',
                'percentage' => 30,
                'amount' => $request->quote_amount * 0.30,
                'description' => 'Required immediately to lock the vendor and the date.',
                'status' => 'PENDING'
            ],
            'phase_2' => [
                'name' => 'Interim (30%)',
                'percentage' => 30,
                'amount' => $request->quote_amount * 0.30,
                'description' => 'Due closer to the event for material and logistical preparation.',
                'status' => 'PENDING'
            ],
            'phase_3' => [
                'name' => 'Final (40%)',
                'percentage' => 40,
                'amount' => $request->quote_amount * 0.40,
                'description' => 'Escrow payment. Released after service delivery confirmation.',
                'status' => 'PENDING'
            ],
            'payment_instructions' => [
                'account_name' => $primaryAccount->account_name,
                'provider' => $primaryAccount->provider_name,
                'account_number' => $primaryAccount->account_number,
                'vendor_phone' => $booking->vendor->phone,
                'type' => $primaryAccount->account_type
            ]
        ];

        $booking->update([
            'status' => 'QUOTED',
            'last_quote_amount' => $request->quote_amount,
            'contract_notes' => $booking->contract_notes . "\n\nInvoice Note: " . $request->notes,
            'metadata' => array_merge($booking->metadata ?? [], ['milestones' => $milestones])
        ]);

        // Notify Host
        NotificationService::notify(
            $booking->event->owner,
            "New Invoice Received",
            $booking->vendor->business_name . " has sent a detailed milestone invoice for TZS " . number_format($request->quote_amount) . ".",
            [
                'icon' => 'FileText', 
                'event_id' => $booking->event_id, 
                'booking_id' => $booking->id,
                'link' => "/events/{$booking->event_id}?tab=vendors"
            ],
            auth()->user()
        );

        return $this->successResponse('Invoice proposal sent successfully.', $booking);
    }

    /**
     * Host accepts the Quote/Invoice
     */
    public function acceptQuote(Request $request, $bookingId)
    {
        $booking = EventVendor::with(['event', 'vendor', 'vendor.user', 'budgetItem'])->findOrFail($bookingId);

        if (auth()->id() !== $booking->event->owner_user_id) {
            return $this->errorResponse('Unauthorized.', [], 403);
        }

        DB::beginTransaction();
        try {
            $booking->update([
                'status' => 'ACCEPTED',
                'agreed_amount' => $booking->last_quote_amount,
                'balance_due' => $booking->last_quote_amount,
            ]);

            // Sync with Budget Item
            if ($booking->budgetItem) {
                $booking->budgetItem->update([
                    'actual_cost' => $booking->last_quote_amount,
                    'budget_item_status' => 'APPROVED'
                ]);
            }

            // Notify Vendor
            NotificationService::notify(
                $booking->vendor->user,
                "Invoice Accepted!",
                "Great news! Your invoice for " . $booking->event->event_name . " has been accepted. Expect your first deposit soon.",
                [
                    'icon' => 'CheckCircle', 
                    'event_id' => $booking->event_id, 
                    'booking_id' => $booking->id,
                    'link' => '/vendor/dashboard'
                ],
                auth()->user()
            );

            DB::commit();
            return $this->successResponse('Invoice accepted successfully.', $booking);
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to accept invoice.', [], 500);
        }
    }

    /**
     * Fetch a professional invoice view for the host or vendor
     */
    public function getInvoice($bookingId)
    {
        $booking = EventVendor::with(['event', 'vendor', 'vendor.user', 'payments'])->findOrFail($bookingId);

        // Security check
        $user = auth()->user();
        if ($booking->event->owner_user_id !== $user->id && $booking->vendor->user_id !== $user->id && !$user->hasRole('SUPER_ADMIN')) {
            return $this->errorResponse('Unauthorized.', [], 403);
        }

        $data = [
            'vendor' => [
                'business_name' => $booking->vendor->business_name,
                'phone' => $booking->vendor->phone,
                'email' => $booking->vendor->email,
                'address' => $booking->vendor->address,
            ],
            'event' => [
                'name' => $booking->event->event_name,
                'date' => $booking->event->event_date,
                'type' => $booking->event->event_type,
            ],
            'milestones' => $booking->metadata['milestones'] ?? [],
            'payment_history' => \App\Http\Resources\VendorPaymentResource::collection($booking->payments),
            'summary' => [
                'total_amount' => (float)$booking->agreed_amount,
                'amount_paid' => (float)$booking->amount_paid,
                'balance_due' => (float)$booking->balance_due,
                'status' => $booking->status
            ]
        ];

        return $this->successResponse('Invoice details fetched successfully.', $data);
    }

    /**
     * Host confirms service delivery to release final payment and mark as COMPLETED
     */
    public function confirmServiceReceived($bookingId)
    {
        // ... (existing code remains identical)
        $booking = EventVendor::with(['event', 'vendor', 'vendor.user'])->findOrFail($bookingId);

        if (auth()->id() !== $booking->event->owner_user_id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        if ($booking->status !== 'ACCEPTED') {
            return response()->json(['success' => false, 'message' => 'Only accepted bookings can be confirmed as completed.'], 422);
        }

        DB::beginTransaction();
        try {
            // 1. Update Booking Status
            $booking->update(['status' => 'COMPLETED']);

            // NEW: Auto-transition Budget Item Status to PAID
            if ($booking->budgetItem) {
                $booking->budgetItem->update(['budget_item_status' => 'PAID']);
            }

            // 2. Identify unreleased payments (held in pending_balance)
            $unreleasedPayments = \App\Models\VendorPayment::where('event_vendor_id', $bookingId)
                ->where('is_released', false)
                ->get();

            $releaseAmount = $unreleasedPayments->sum('amount');

            if ($releaseAmount > 0) {
                // 3. Move from Pending to Available in Vendor Wallet
                $wallet = \App\Models\VendorWallet::where('vendor_id', $booking->vendor_id)->first();
                if ($wallet) {
                    $wallet->decrement('pending_balance', $releaseAmount);
                    $wallet->increment('available_balance', $releaseAmount);
                }

                // 4. Mark payments as released
                \App\Models\VendorPayment::where('event_vendor_id', $bookingId)
                    ->where('is_released', false)
                    ->update(['is_released' => true]);
            }

            // 5. Notify Vendor
            NotificationService::notify(
                $booking->vendor->user,
                "Service Confirmed! Funds Released",
                "The host of " . $booking->event->event_name . " has confirmed receipt of your service. Your remaining balance has been moved to your available balance.",
                [
                    'icon' => 'Award', 
                    'event_id' => $booking->event_id, 
                    'booking_id' => $booking->id,
                    'link' => '/vendor/dashboard'
                ],
                auth()->user()
            );

            DB::commit();
            return response()->json(['success' => true, 'message' => 'Service confirmed and funds released.', 'data' => $booking]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Confirmation failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Cancel an inquiry or quoted booking (Host side)
     */
    public function destroy($id)
    {
        $booking = EventVendor::with(['event', 'vendor', 'vendor.user'])->findOrFail($id);

        // Security check
        if ($booking->event->owner_user_id !== auth()->id()) {
            return $this->errorResponse('Unauthorized.', [], 403);
        }

        // Only allow if not yet accepted/paid
        if (!in_array($booking->status, ['INQUIRY', 'QUOTED'])) {
            return $this->errorResponse('Cannot delete an accepted or completed booking.', [], 422);
        }

        DB::beginTransaction();
        try {
            // Update status to CANCELLED instead of hard deleting to preserve logs
            $booking->update(['status' => 'CANCELLED']);

            // Notify Vendor
            NotificationService::notify(
                $booking->vendor->user,
                "Inquiry Cancelled",
                "The host of " . $booking->event->event_name . " has cancelled their inquiry/request for " . $booking->assigned_service . ".",
                [
                    'icon' => 'XCircle', 
                    'event_id' => $booking->event_id,
                    'link' => '/vendor/dashboard'
                ],
                auth()->user()
            );

            DB::commit();
            return $this->successResponse('Booking cancelled successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to cancel booking: ' . $e->getMessage(), [], 500);
        }
    }
}
