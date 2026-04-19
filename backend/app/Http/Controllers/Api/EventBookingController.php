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
            return response()->json(['success' => false, 'message' => 'Unauthorized. You can only inquire for events you own.'], 403);
        }

        $vendor = Vendor::with('user')->findOrFail($request->vendor_id);

        // Check if already inquiring this vendor for this service
        $exists = EventVendor::where('event_id', $eventId)
            ->where('vendor_id', $request->vendor_id)
            ->whereIn('status', ['INQUIRY', 'QUOTED', 'ACCEPTED'])
            ->exists();

        if ($exists) {
            return response()->json(['success' => false, 'message' => 'You already have an active inquiry/booking with this vendor.'], 422);
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
            ['icon' => 'MessageSquare', 'event_id' => $eventId, 'booking_id' => $eventVendor->id],
            auth()->user()
        );

        return response()->json(['success' => true, 'message' => 'Inquiry sent successfully.', 'data' => $eventVendor]);
    }

    /**
     * Vendor sends a Quote back to the Host
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
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        $booking->update([
            'status' => 'QUOTED',
            'last_quote_amount' => $request->quote_amount,
            'contract_notes' => $booking->contract_notes . "\n\nQuote Response: " . $request->notes
        ]);

        // Notify Host
        NotificationService::notify(
            $booking->event->owner,
            "New Quote Received",
            $booking->vendor->business_name . " has sent a quote of TZS " . number_format($request->quote_amount) . " for your event.",
            [
                'icon' => 'DollarSign', 
                'event_id' => $booking->event_id, 
                'booking_id' => $booking->id,
                'link' => "/events/{$booking->event_id}?tab=vendors"
            ],
            auth()->user()
        );

        return response()->json(['success' => true, 'message' => 'Quote sent successfully.', 'data' => $booking]);
    }

    /**
     * Host accepts the Quote
     */
    public function acceptQuote(Request $request, $bookingId)
    {
        $booking = EventVendor::with(['event', 'vendor', 'vendor.user', 'budgetItem'])->findOrFail($bookingId);

        if (auth()->id() !== $booking->event->owner_user_id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
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
                    'budget_item_status' => 'APPROVED' // Auto-transition
                ]);
            }

            // Notify Vendor
            NotificationService::notify(
                $booking->vendor->user,
                "Quote Accepted!",
                "Great news! Your quote for " . $booking->event->event_name . " has been accepted. You are now officially booked.",
                [
                    'icon' => 'CheckCircle', 
                    'event_id' => $booking->event_id, 
                    'booking_id' => $booking->id,
                    'link' => '/vendor/dashboard'
                ],
                auth()->user()
            );

            DB::commit();
            return response()->json(['success' => true, 'message' => 'Quote accepted successfully.', 'data' => $booking]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Failed to accept quote.'], 500);
        }
    }

    /**
     * Host confirms service delivery to release final payment and mark as COMPLETED
     */
    public function confirmServiceReceived($bookingId)
    {
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
}
