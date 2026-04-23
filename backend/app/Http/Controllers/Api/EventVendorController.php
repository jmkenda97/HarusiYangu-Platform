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
            ->paginate($request->get('per_page', 20));

        return $this->paginatedResponse($eventVendors, \App\Http\Resources\EventVendorResource::class, 'Event vendors fetched successfully');
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
            return $this->errorResponse('Vendor not found', [], 404);
        }

        if ($vendor->status !== 'ACTIVE') {
            return $this->errorResponse('This vendor is not available for assignment. Only approved vendors can be assigned.', [], 422);
        }

        // Check vendor not already assigned to this event for the same service
        $existingAssignment = EventVendor::where('event_id', $eventId)
            ->where('vendor_id', $request->vendor_id)
            ->where('assigned_service', $request->assigned_service)
            ->first();

        if ($existingAssignment) {
            return $this->errorResponse('This vendor is already assigned to this event for the specified service.', [], 422);
        }

        try {
            $eventVendor = DB::transaction(function () use ($request, $event) {
                return EventVendor::create([
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

            return $this->successResponse('Vendor assigned to event successfully', new \App\Http\Resources\EventVendorResource($eventVendor), [], 201);
        } catch (\Exception $e) {
            Log::error('Vendor Assignment Failed: ' . $e->getMessage());
            return $this->errorResponse('Failed to assign vendor: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Update a vendor assignment.
     */
    public function update(Request $request, $eventId, $id)
    {
        $event = Event::findOrFail($eventId);

        $eventVendor = EventVendor::where('id', $id)
            ->where('event_id', $eventId)
            ->firstOrFail();

        $this->authorize('manageVendors', $event);

        $request->validate([
            'assigned_service' => 'sometimes|required|string|max:255',
            'agreed_amount' => 'sometimes|required|numeric|min:0',
            'contract_notes' => 'nullable|string|max:1000',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        if ($request->has('agreed_amount')) {
            $newAgreedAmount = $request->agreed_amount;
            $newBalanceDue = $newAgreedAmount - $eventVendor->amount_paid;

            $eventVendor->agreed_amount = $newAgreedAmount;
            $eventVendor->balance_due = $newBalanceDue;
        }

        if ($request->has('assigned_service')) {
            $existingAssignment = EventVendor::where('event_id', $eventId)
                ->where('vendor_id', $eventVendor->vendor_id)
                ->where('assigned_service', $request->assigned_service)
                ->where('id', '!=', $id)
                ->first();

            if ($existingAssignment) {
                return $this->errorResponse('This vendor is already assigned to this event for the specified service.', [], 422);
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

        return $this->successResponse('Vendor assignment updated successfully', new \App\Http\Resources\EventVendorResource($eventVendor));
    }

    /**
     * Remove a vendor assignment from an event.
     */
    public function destroy(Request $request, $eventId, $id)
    {
        $event = Event::findOrFail($eventId);

        $eventVendor = EventVendor::where('id', $id)
            ->where('event_id', $eventId)
            ->firstOrFail();

        $this->authorize('manageVendors', $event);

        if ($eventVendor->amount_paid > 0) {
            return $this->errorResponse('Cannot delete this vendor assignment. Payments have been recorded. Remove payments first.', [], 422);
        }

        $eventVendor->delete();

        return $this->successResponse('Vendor assignment removed successfully');
    }
}
