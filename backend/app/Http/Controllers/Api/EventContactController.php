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

        // Authorization (Owner or Committee)
        $user = $request->user();
        $canManage = $event->owner_user_id === $user->id ||
            $event->committee()->where('user_id', $user->id)->exists();

        if (!$canManage) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        // Load contacts. Load 'pledge' relation so we know if they are contributors
        $contacts = EventContact::where('event_id', $eventId)
            ->with('pledge:id,contact_id,contribution_status,pledge_amount')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $contacts
        ]);
    }

    /**
     * Add a new Guest
     */
    public function store(Request $request, $eventId)
    {
        $event = Event::findOrFail($eventId);
        $user = $request->user();

        // Authorization
        $canManage = $event->owner_user_id === $user->id ||
            $event->committee()->where('user_id', $user->id)->where('can_manage_contributions', true)->exists();

        if (!$canManage) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'full_name' => 'required|string|max:255',
            'phone' => 'required|string|max:20',
            'email' => 'nullable|email|max:255',
            'relationship_label' => 'nullable|string|max:100',
            'is_vip' => 'boolean',
            'is_invited' => 'boolean',
        ]);

        try {
            DB::transaction(function () use ($request, $event, $user) {
                EventContact::create([
                    'id' => Str::uuid(),
                    'event_id' => $event->id,
                    'full_name' => $request->full_name,
                    'phone' => $request->phone,
                    'email' => $request->email,
                    'relationship_label' => $request->relationship_label,
                    'is_vip' => $request->is_vip ?? false,
                    'is_invited' => $request->is_invited ?? true,
                    'is_contributor' => false, // By default, just a guest
                    'created_by' => $user->id,
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Guest added successfully'
            ], 201);
        } catch (\Exception $e) {
            // Handle Unique Constraint (Duplicate Phone)
            if (strpos($e->getMessage(), 'unique constraint') !== false) {
                return response()->json([
                    'success' => false,
                    'message' => 'This phone number is already on the guest list for this event.'
                ], 400);
            }

            return response()->json([
                'success' => false,
                'message' => 'Failed to add guest: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update Guest Details
     */
    public function update(Request $request, $eventId, $id)
    {
        $contact = EventContact::where('id', $id)->where('event_id', $eventId)->firstOrFail();

        // Authorization
        $user = $request->user();
        $event = $contact->event;
        $canManage = $event->owner_user_id === $user->id ||
            $event->committee()->where('user_id', $user->id)->exists();

        if (!$canManage) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'full_name' => 'sometimes|required|string|max:255',
            'phone' => 'sometimes|required|string|max:20',
            'email' => 'nullable|email|max:255',
            'relationship_label' => 'nullable|string|max:100',
            'is_vip' => 'boolean',
            'is_invited' => 'boolean',
        ]);

        $contact->update($request->only(['full_name', 'phone', 'email', 'relationship_label', 'is_vip', 'is_invited']));

        return response()->json([
            'success' => true,
            'message' => 'Guest updated',
            'data' => $contact
        ]);
    }

    /**
     * Remove Guest
     */
    public function destroy(Request $request, $eventId, $id)
    {
        $contact = EventContact::where('id', $id)->where('event_id', $eventId)->firstOrFail();

        // Authorization
        $user = $request->user();
        $event = $contact->event;
        $canManage = $event->owner_user_id === $user->id ||
            $event->committee()->where('user_id', $user->id)->exists();

        if (!$canManage) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        // Note: Deleting a contact might Cascade delete the pledge if configured in DB,
        // or throw an error if they have a pledge.
        // For Phase 2, let's prevent deletion if they have a pledge to be safe.
        if ($contact->pledge) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete this guest. They have an active pledge. Remove the pledge first.'
            ], 400);
        }

        $contact->delete();

        return response()->json([
            'success' => true,
            'message' => 'Guest removed'
        ]);
    }



// ... inside the class ...

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
        // Validate File
        $request->validate([
            'file' => 'required|mimes:xlsx,csv,xls|max:10240' // Max 10MB
        ]);

        $event = Event::findOrFail($eventId);

        // Authorization
        $user = $request->user();
        $canManage = $event->owner_user_id === $user->id ||
            $event->committee()->where('user_id', $user->id)->exists();

        if (!$canManage) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        try {
            // Initialize Import Class with Event ID
            $import = new GuestsImport($eventId);

            // Process the file
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


// ... inside class ...

    public function export($eventId)
    {
        $event = Event::findOrFail($eventId);

        // Authorization
        $user = request()->user();
        $canManage = $event->owner_user_id === $user->id ||
                     $event->committee()->where('user_id', $user->id)->exists();

        if (!$canManage) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        return Excel::download(new GuestsExport($eventId), 'guest_list_' . $eventId . '.xlsx');
    }
}
