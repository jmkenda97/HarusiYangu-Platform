<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventContact;
use App\Models\ContributionPledge;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use App\Exports\ContributorsExport;
use Maatwebsite\Excel\Facades\Excel;

class EventContributorController extends Controller
{
    /**
     * Add a new Contact and Pledge to an Event
     */
    public function store(Request $request, $eventId)
    {
        $event = Event::findOrFail($eventId);

        $user = $request->user();

        // --- CHANGE: Use Policy Check ---
        $this->authorize('manageContributions', $event);

        // UPDATED VALIDATION
        $request->validate([
            'contact_id' => 'nullable|uuid|exists:event_contacts,id',
            'full_name' => 'required_without:contact_id|string|max:255',
            'phone' => 'required_without:contact_id|string|max:20',
            'email' => 'nullable|string|max:255',
            'pledge_amount' => 'required|numeric|min:0',
            'is_vip' => 'boolean',
        ]);

        try {
            DB::transaction(function () use ($request, $event, $user) {
                $contactId = null;

                // LOGIC: If contact_id is provided, use existing guest. Otherwise, create new.
                if ($request->contact_id) {
                    $contact = EventContact::where('id', $request->contact_id)
                        ->where('event_id', $event->id)
                        ->firstOrFail();

                    if ($contact->pledge) {
                        throw new \Exception("This guest already has an active pledge.");
                    }

                    $contactId = $contact->id;
                    if ($request->has('is_vip')) {
                        $contact->update(['is_vip' => $request->is_vip]);
                    }
                } else {
                    $contact = EventContact::create([
                        'id' => Str::uuid(),
                        'event_id' => $event->id,
                        'full_name' => $request->full_name,
                        'phone' => $request->phone,
                        'email' => $request->email,
                        'is_vip' => $request->is_vip ?? false,
                        'is_contributor' => true,
                        'created_by' => $user->id,
                    ]);
                    $contactId = $contact->id;
                }

                ContributionPledge::create([
                    'id' => Str::uuid(),
                    'event_id' => $event->id,
                    'contact_id' => $contactId,
                    'pledge_amount' => $request->pledge_amount,
                    'amount_paid' => 0,
                    'outstanding_amount' => $request->pledge_amount,
                    'contribution_status' => 'PLEDGED',
                    'assigned_by' => $user->id,
                ]);

                return $contactId;
            });

            return $this->successResponse('Pledge added successfully', [], [], 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), [], 400);
        }
    }

    public function export($eventId)
    {
        // Authorization handled by middleware or explicit check if needed
        // Assuming you want anyone who can see contributors to export
        // If strict, add: $this->authorize('manageContributions', Event::findOrFail($eventId));
        return Excel::download(new ContributorsExport($eventId), 'contributors_export.xlsx');
    }
}
