<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventVendor;
use App\Models\Vendor;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class EventVendorController extends Controller
{
    /**
     * List all vendors assigned to an event.
     */
    public function index(Request $request, $eventId)
    {
        $event = Event::findOrFail($eventId);

        // Authorize using EventPolicy::manageVendors
        $this->authorize('manageVendors', $event);

        $eventVendors = EventVendor::where('event_id', $eventId)
            ->with([
                'vendor.services',
                'payments'
            ])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($eventVendor) {
                // Calculate totals for each assignment
                $totalPaid = $eventVendor->payments()->where('payment_status', 'SUCCESS')->sum('amount');

                return [
                    'id' => $eventVendor->id,
                    'vendor' => $eventVendor->vendor,
                    'assigned_service' => $eventVendor->assigned_service,
                    'status' => $eventVendor->status,
                    'last_quote_amount' => $eventVendor->last_quote_amount,
                    'agreed_amount' => $eventVendor->agreed_amount,
                    'amount_paid' => $eventVendor->amount_paid,
                    'balance_due' => $eventVendor->balance_due,
                    'contract_notes' => $eventVendor->contract_notes,
                    'metadata' => $eventVendor->metadata,
                    'start_date' => $eventVendor->start_date,
                    'end_date' => $eventVendor->end_date,
                    'created_at' => $eventVendor->created_at,
                    'updated_at' => $eventVendor->updated_at,
                    'summary' => [
                        'total_agreed' => (float) $eventVendor->agreed_amount,
                        'total_paid' => (float) $eventVendor->amount_paid,
                        'total_balance' => (float) $eventVendor->balance_due,
                    ]
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $eventVendors
        ]);
    }

    /**
     * Assign a vendor to an event.
     */
    public function store(Request $request, $eventId)
    {
        $event = Event::findOrFail($eventId);

        // Authorize using EventPolicy::manageVendors
        $this->authorize('manageVendors', $event);

        $request->validate([
            'vendor_id' => 'required|uuid|exists:vendors,id',
            'assigned_service' => 'required|string|max:255',
            'agreed_amount' => 'required|numeric|min:0',
            'contract_notes' => 'nullable|string|max:1000',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        // Check vendor exists and is ACTIVE
        $vendor = Vendor::find($request->vendor_id);
        if (!$vendor) {
            return response()->json([
                'success' => false,
                'message' => 'Vendor not found'
            ], 404);
        }

        if ($vendor->status !== 'ACTIVE') {
            return response()->json([
                'success' => false,
                'message' => 'This vendor is not available for assignment. Only approved vendors can be assigned.'
            ], 422);
        }

        // Check vendor not already assigned to this event for the same service
        $existingAssignment = EventVendor::where('event_id', $eventId)
            ->where('vendor_id', $request->vendor_id)
            ->where('assigned_service', $request->assigned_service)
            ->first();

        if ($existingAssignment) {
            return response()->json([
                'success' => false,
                'message' => 'This vendor is already assigned to this event for the specified service.'
            ], 422);
        }

        try {
            DB::transaction(function () use ($request, $event) {
                EventVendor::create([
                    'id' => Str::uuid(),
                    'event_id' => $event->id,
                    'vendor_id' => $request->vendor_id,
                    'assigned_service' => $request->assigned_service,
                    'agreed_amount' => $request->agreed_amount,
                    'amount_paid' => 0,
                    'balance_due' => $request->agreed_amount,
                    'contract_notes' => $request->contract_notes,
                    'start_date' => $request->start_date,
                    'end_date' => $request->end_date,
                    'created_by' => auth()->id(),
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Vendor assigned to event successfully'
            ], 201);
        } catch (\Exception $e) {
            Log::error('Vendor Assignment Failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to assign vendor: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update a vendor assignment.
     */
    public function update(Request $request, $eventId, $id)
    {
        $event = Event::findOrFail($eventId);

        // Find the EventVendor and verify it belongs to this event
        $eventVendor = EventVendor::where('id', $id)
            ->where('event_id', $eventId)
            ->firstOrFail();

        // Authorize using EventPolicy::manageVendors
        $this->authorize('manageVendors', $event);

        $request->validate([
            'assigned_service' => 'sometimes|required|string|max:255',
            'agreed_amount' => 'sometimes|required|numeric|min:0',
            'contract_notes' => 'nullable|string|max:1000',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        // If agreed_amount changes, recalculate balance_due
        if ($request->has('agreed_amount')) {
            $newAgreedAmount = $request->agreed_amount;
            $newBalanceDue = $newAgreedAmount - $eventVendor->amount_paid;

            $eventVendor->agreed_amount = $newAgreedAmount;
            $eventVendor->balance_due = $newBalanceDue;
        }

        // Update other fields
        if ($request->has('assigned_service')) {
            // Check for duplicate assignment with same service
            $existingAssignment = EventVendor::where('event_id', $eventId)
                ->where('vendor_id', $eventVendor->vendor_id)
                ->where('assigned_service', $request->assigned_service)
                ->where('id', '!=', $id)
                ->first();

            if ($existingAssignment) {
                return response()->json([
                    'success' => false,
                    'message' => 'This vendor is already assigned to this event for the specified service.'
                ], 422);
            }

            $eventVendor->assigned_service = $request->assigned_service;
        }

        if ($request->has('contract_notes')) {
            $eventVendor->contract_notes = $request->contract_notes;
        }

        if ($request->has('start_date')) {
            $eventVendor->start_date = $request->start_date;
        }

        if ($request->has('end_date')) {
            $eventVendor->end_date = $request->end_date;
        }

        $eventVendor->save();

        return response()->json([
            'success' => true,
            'message' => 'Vendor assignment updated successfully',
            'data' => $eventVendor
        ]);
    }

    /**
     * Remove a vendor assignment from an event.
     */
    public function destroy(Request $request, $eventId, $id)
    {
        $event = Event::findOrFail($eventId);

        // Find the EventVendor and verify it belongs to this event
        $eventVendor = EventVendor::where('id', $id)
            ->where('event_id', $eventId)
            ->firstOrFail();

        // Authorize using EventPolicy::manageVendors
        $this->authorize('manageVendors', $event);

        // Check no payments have been made
        if ($eventVendor->amount_paid > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete this vendor assignment. Payments have been recorded. Remove payments first.'
            ], 422);
        }

        $eventVendor->delete();

        return response()->json([
            'success' => true,
            'message' => 'Vendor assignment removed successfully'
        ]);
    }
}
