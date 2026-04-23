<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventContact;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use App\Exports\GuestsTemplateExport;
use App\Imports\GuestsImport;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\GuestsExport;


class EventContactController extends Controller
{
    /**
     * Get all guests/contacts for an event
     */
    public function index(Request $request, $eventId)
    {
        $event = Event::findOrFail($eventId);

        // --- CHANGE: Use Policy Check ---
        $this->authorize('manageGuests', $event);

        // Load contacts with pagination
        $contacts = EventContact::where('event_id', $eventId)
            ->with('pledge:id,contact_id,contribution_status,pledge_amount')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return $this->successResponse('Contacts fetched successfully', $contacts->items(), [
            'page' => $contacts->currentPage(),
            'per_page' => $contacts->perPage(),
            'total' => $contacts->total(),
            'total_pages' => $contacts->lastPage(),
        ]);
    }

    /**
     * Add a new Guest
     */
    public function store(Request $request, $eventId)
    {
        $event = Event::findOrFail($eventId);
        $user = $request->user();

        // --- CHANGE: Use Policy Check ---
        $this->authorize('manageGuests', $event);

        $request->validate([
            'full_name' => 'required|string|max:255',
            'phone' => 'required|string|max:20',
            'email' => 'nullable|email|max:255',
            'relationship_label' => 'nullable|string|max:100',
            'is_vip' => 'boolean',
            'is_invited' => 'boolean',
        ]);

        try {
            $contact = DB::transaction(function () use ($request, $event, $user) {
                return EventContact::create([
                    'id' => Str::uuid(),
                    'event_id' => $event->id,
                    'full_name' => $request->full_name,
                    'phone' => $request->phone,
                    'email' => $request->email,
                    'relationship_label' => $request->relationship_label,
                    'is_vip' => $request->is_vip ?? false,
                    'is_invited' => $request->is_invited ?? true,
                    'is_contributor' => false,
                    'created_by' => $user->id,
                ]);
            });

            return $this->successResponse('Contact added successfully', $contact, [], 201);
        } catch (\Exception $e) {
            if (strpos($e->getMessage(), 'unique constraint') !== false) {
                return $this->errorResponse('This phone number is already on the guest list for this event.', [], 400);
            }

            return $this->errorResponse('Failed to add contact: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Update Guest Details
     */
    public function update(Request $request, $eventId, $id)
    {
        $contact = EventContact::where('id', $id)->where('event_id', $eventId)->firstOrFail();

        // --- CHANGE: Use Policy Check ---
        $this->authorize('manageGuests', $contact->event);

        $request->validate([
            'full_name' => 'sometimes|required|string|max:255',
            'phone' => 'sometimes|required|string|max:20',
            'email' => 'nullable|email|max:255',
            'relationship_label' => 'nullable|string|max:100',
            'is_vip' => 'boolean',
            'is_invited' => 'boolean',
        ]);

        $contact->update($request->only(['full_name', 'phone', 'email', 'relationship_label', 'is_vip', 'is_invited']));

        return $this->successResponse('Contact updated successfully', $contact);
    }

    /**
     * Remove Guest
     */
    public function destroy(Request $request, $eventId, $id)
    {
        $contact = EventContact::where('id', $id)->where('event_id', $eventId)->firstOrFail();

        // --- CHANGE: Use Policy Check ---
        $this->authorize('manageGuests', $contact->event);

        if ($contact->pledge) {
            return $this->errorResponse('Cannot delete this contact. They have an active pledge. Remove the pledge first.', [], 400);
        }

        $contact->delete();

        return $this->successResponse('Contact removed successfully');
    }

    /**
     * Download the Excel Template
     */
    public function downloadTemplate()
    {
        return Excel::download(new GuestsTemplateExport, 'guests_import_template.xlsx');
    }

    /**
     * Handle Bulk Import
     */
    public function import(Request $request, $eventId)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,csv,xls|max:10240'
        ]);

        $event = Event::findOrFail($eventId);

        // --- CHANGE: Use Policy Check ---
        $this->authorize('manageGuests', $event);

        try {
            $import = new GuestsImport($eventId);
            Excel::import($import, $request->file('file'));

            return response()->json([
                'success' => true,
                'message' => 'Import completed successfully.',
                'data' => [
                    'imported' => $import->importedCount,
                    'skipped' => $import->skippedCount,
                    'errors' => $import->errors
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to process file: ' . $e->getMessage()
            ], 500);
        }
    }

    public function export($eventId)
    {
        $event = Event::findOrFail($eventId);

        // --- CHANGE: Use Policy Check ---
        $this->authorize('manageGuests', $event);

        return Excel::download(new GuestsExport($eventId), 'guest_list_' . $eventId . '.xlsx');
    }
}
