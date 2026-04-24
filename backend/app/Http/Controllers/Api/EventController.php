<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventCommitteeMember;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use App\Exports\CommitteeExport;
use Maatwebsite\Excel\Facades\Excel;
use App\Services\NotificationService;

class EventController extends Controller
{


    public function index(Request $request)
    {
        $user = $request->user();

        // FIX: STRICT FILTERING
        $query = Event::with('owner')->whereNull('archived_at');

        if ($user->role === 'SUPER_ADMIN') {
            // Admin sees everything (except archived)
        } else {
            // Everyone else (Host or Committee) sees events they OWN or are a MEMBER of
            $query->where(function($q) use ($user) {
                $q->where('owner_user_id', $user->id)
                  ->orWhereHas('committee', function($sq) use ($user) {
                      $sq->where('user_id', $user->id);
                  });
            });
        }

        // Apply filters from spec
        if ($request->has('status')) {
            $query->where('event_status', $request->status);
        }

        $events = $query->with(['committee', 'contacts.pledge'])
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return $this->successResponse('Events fetched successfully', $events->items(), [
            'page' => $events->currentPage(),
            'per_page' => $events->perPage(),
            'total' => $events->total(),
            'total_pages' => $events->lastPage(),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'event_name' => 'required|string|max:255',
            'event_type' => ['required', Rule::in(['KITCHEN_PARTY', 'SENDOFF', 'WEDDING', 'BAG_PARTY', 'BRIDAL_SHOWER', 'ENGAGEMENT', 'OTHER'])],
            'event_date' => 'required|date|after:today',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i|after:start_time',
            'groom_name' => 'nullable|string|max:255',
            'bride_name' => 'nullable|string|max:255',
            'celebrant_name' => 'nullable|string|max:255',
            'venue_name' => 'nullable|string|max:255',
            'venue_address' => 'nullable|string',
            'region' => 'nullable|string|max:100',
            'district' => 'nullable|string|max:100',
            'target_budget' => 'required|numeric|min:0',
            'contingency_amount' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
        ]);

        try {
            $event = DB::transaction(function () use ($request) {
                $event = Event::create([
                    'id' => Str::uuid(),
                    'owner_user_id' => $request->user()->id,
                    'event_name' => $request->event_name,
                    'event_type' => $request->event_type,
                    'event_date' => $request->event_date,
                    'start_time' => $request->start_time,
                    'end_time' => $request->end_time,
                    'groom_name' => $request->groom_name,
                    'bride_name' => $request->bride_name,
                    'celebrant_name' => $request->celebrant_name,
                    'venue_name' => $request->venue_name,
                    'venue_address' => $request->venue_address,
                    'region' => $request->region,
                    'district' => $request->district,
                    'target_budget' => $request->target_budget,
                    'contingency_amount' => $request->contingency_amount ?? 0,
                    'description' => $request->description,
                    'event_status' => 'DRAFT',
                    'currency_code' => 'TZS',
                ]);

                EventCommitteeMember::create([
                    'id' => Str::uuid(),
                    'event_id' => $event->id,
                    'user_id' => $request->user()->id,
                    'committee_role' => 'CHAIRPERSON',
                    'can_manage_budget' => true,
                    'can_manage_contributions' => true,
                    'can_send_messages' => true,
                    'can_manage_vendors' => true,
                    'can_scan_cards' => true,
                    'added_by' => $request->user()->id,
                ]);

                return $event;
            });

            // NOTIFY HOST
            NotificationService::notify(
                $request->user(),
                "Event Created Successfully",
                "Your event '{$event->event_name}' has been created and you have been assigned as Chairperson.",
                [
                    'icon' => 'CheckCircle', 
                    'event_id' => $event->id, 
                    'link' => "/events/{$event->id}"
                ],
                $request->user()
            );

            return $this->successResponse('Event created successfully', $event, [], 201);
        } catch (\Exception $e) {
            \Log::error('Event Creation Failed: ' . $e->getMessage());
            return $this->errorResponse('Failed to create event: ' . $e->getMessage(), [], 500);
        }
    }

    public function show($id)
    {
        $event = Event::with([
            'owner',
            'committee.user',
            'contacts.pledge',
            'wallet'
        ])->whereNull('archived_at')->findOrFail($id);

        $user = auth()->user();
        $isOwner = $event->owner_user_id === $user->id;
        $isCommittee = $event->committee->contains('user_id', $user->id);

        if (!$isOwner && !$isCommittee && $user->role !== 'SUPER_ADMIN') {
            return $this->errorResponse('Unauthorized', [], 403);
        }

        return $this->successResponse('Event fetched successfully', $event);
    }

    public function update(Request $request, $id)
    {
        $event = Event::whereNull('archived_at')->findOrFail($id);
        
        if ($event->owner_user_id !== auth()->id() && auth()->user()->role !== 'SUPER_ADMIN') {
             return $this->errorResponse('Unauthorized', [], 403);
        }

        $request->validate([
            'event_name' => 'sometimes|required|string|max:255',
            'event_status' => 'sometimes|required|string',
            'target_budget' => 'sometimes|required|numeric|min:0',
            'contingency_amount' => 'sometimes|required|numeric|min:0',
        ]);

        $event->update($request->all());

        // NOTIFY HOST
        NotificationService::notify(
            auth()->user(),
            "Event Updated",
            "The details for your event '{$event->event_name}' have been updated.",
            [
                'icon' => 'CheckCircle', 
                'event_id' => $event->id, 
                'link' => "/events/{$event->id}"
            ],
            auth()->user()
        );

        return $this->successResponse('Event updated successfully', $event);
    }

    public function destroy(Request $request, $id)
    {
        $event = Event::whereNull('archived_at')->findOrFail($id);

        if ($event->owner_user_id !== auth()->id() && auth()->user()->role !== 'SUPER_ADMIN') {
            return $this->errorResponse('Unauthorized', [], 403);
        }

        $event->update(['archived_at' => now()]);

        // NOTIFY HOST
        NotificationService::notify(
            auth()->user(),
            "Event Archived",
            "Your event '{$event->event_name}' has been moved to archive.",
            [
                'icon' => 'Trash2', 
                'link' => "/events"
            ],
            auth()->user()
        );

        return $this->successResponse('Event archived successfully');
    }


    public function exportCommittee($eventId)
    {
        return Excel::download(new CommitteeExport($eventId), 'committee_export.xlsx');
    }
}