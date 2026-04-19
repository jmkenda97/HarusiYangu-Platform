<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventVendor;
use App\Models\Vendor;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class VendorInquiryController extends Controller
{
    /**
     * Store a new vendor inquiry from the host
     */
    public function store(Request $request, $eventId)
    {
        $request->validate([
            'vendor_id' => 'required|uuid|exists:vendors,id',
            'budget_item_id' => 'required|uuid|exists:event_budget_items,id',
            'assigned_service' => 'required|string|max:255',
            'contract_notes' => 'nullable|string',
            'target_amount' => 'nullable|numeric|min:0', // Host's bargain/target price
        ]);

        $event = Event::findOrFail($eventId);
        $vendor = Vendor::with('user')->findOrFail($request->vendor_id);

        // Security check
        if ($event->owner_user_id !== auth()->id()) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        // Check if already inquired
        $exists = EventVendor::where('event_id', $eventId)
            ->where('vendor_id', $request->vendor_id)
            ->whereIn('status', ['INQUIRY', 'QUOTED', 'ACCEPTED'])
            ->exists();

        if ($exists) {
            return response()->json(['success' => false, 'message' => 'You already have an active inquiry or booking with this vendor.'], 422);
        }

        try {
            DB::beginTransaction();

            // Create the EventVendor record (The Inquiry)
            $inquiry = EventVendor::create([
                'id' => (string) Str::uuid(),
                'event_id' => $eventId,
                'vendor_id' => $request->vendor_id,
                'budget_item_id' => $request->budget_item_id,
                'status' => 'INQUIRY',
                'assigned_service' => $request->assigned_service,
                'contract_notes' => $request->contract_notes,
                'agreed_amount' => 0, // Not set until accepted
                'last_quote_amount' => 0, // Not set until vendor responds
                'amount_paid' => 0,
                'balance_due' => 0,
                'created_by' => auth()->id(),
                'metadata' => [
                    'target_amount' => $request->target_amount,
                    'is_bargain' => ($request->target_amount > 0)
                ]
            ]);

            // Notify Vendor
            NotificationService::notify(
                $vendor->user,
                "New Inquiry: " . $event->event_name,
                "You have received a new inquiry for " . $request->assigned_service . ". Host is looking for a quote.",
                ['icon' => 'MessageSquare', 'event_id' => $eventId, 'booking_id' => $inquiry->id],
                auth()->user()
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Inquiry sent successfully. The vendor has been notified.',
                'data' => $inquiry
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to send inquiry: ' . $e->getMessage()
            ], 500);
        }
    }
}
