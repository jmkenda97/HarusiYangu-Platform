<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventCommitteeMember;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class EventController extends Controller
{


    /**
     * List Events based on User Role
     */
    public function index(Request $request)
    {
        $user = $request->user();

        // Query Builder
        $query = Event::with('owner'); // Eager load owner to avoid N+1

        if ($user->role === 'SUPER_ADMIN') {
            // Admin sees everything
        } elseif ($user->role === 'HOST') {
            // Host sees only their owned events
            $query->where('owner_user_id', $user->id);
        } else {
            // Committee members see events they participate in
            $eventIds = $user->committeeMemberships()->pluck('event_id');
            $query->whereIn('id', $eventIds);
        }

        $events = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $events
        ]);
    }

    /**
     * Store a new Event
     */
    public function store(Request $request)
    {
        // ... (Validation remains the same) ...
        $request->validate([
            'event_name' => 'required|string|max:255',
            'event_type' => ['required', Rule::in(['KITCHEN_PARTY', 'SENDOFF', 'WEDDING', 'BAG_PARTY', 'BRIDAL_SHOWER', 'ENGAGEMENT', 'OTHER'])],
            'event_date' => 'required|date|after:today',
            'target_budget' => 'required|numeric|min:0',
            'venue_name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
        ]);

        try {
            $event = DB::transaction(function () use ($request) {
                // DEBUG: Log the user ID attempting to create the event
                \Log::info('Creating Event for User ID: ' . $request->user()->id);

                $event = Event::create([
                    'id' => Str::uuid(),
                    'owner_user_id' => $request->user()->id,
                    'event_name' => $request->event_name,
                    'event_type' => $request->event_type,
                    'event_date' => $request->event_date,
                    'target_budget' => $request->target_budget,
                    'venue_name' => $request->venue_name,
                    'description' => $request->description,
                    'event_status' => 'PLANNING',
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
                    'added_by' => $request->user()->id,
                ]);

                return $event;
            });

            return response()->json([
                'success' => true,
                'message' => 'Event created successfully',
                'data' => $event
            ], 201);
        } catch (\Exception $e) {
            // DEBUG: Log the actual exception
            \Log::error('Event Creation Failed: ' . $e->getMessage());
            \Log::error('Stack Trace: ' . $e->getTraceAsString());

            return response()->json([
                'success' => false,
                'message' => 'Failed to create event: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Show Single Event Details (with full relations)
     */
    public function show($id)
    {
        // Eager load everything needed for the dashboard
        $event = Event::with([
            'owner',
            'committee.user',
            'contacts.pledge', // Load pledge with contact
        ])->findOrFail($id);

        // Authorization: Check if user is owner or committee member
        // (Simplified for now, refine with Spatie Gates if needed)
        $user = auth()->user();
        $isOwner = $event->owner_user_id === $user->id;
        $isCommittee = $event->committee->contains('user_id', $user->id);

        if (!$isOwner && !$isCommittee && $user->role !== 'SUPER_ADMIN') {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $event
        ]);
    }

    /**
     * Update Event
     */
    public function update(Request $request, $id)
    {
        $event = Event::findOrFail($id);

        // Basic Authorization check
        if ($event->owner_user_id !== auth()->id() && auth()->user()->role !== 'SUPER_ADMIN') {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $request->validate([
            'event_name' => 'sometimes|required|string|max:255',
            'event_date' => 'sometimes|required|date',
            'target_budget' => 'sometimes|required|numeric|min:0',
            'venue_name' => 'nullable|string',
        ]);

        $event->update($request->only(['event_name', 'event_date', 'target_budget', 'venue_name', 'description']));

        return response()->json([
            'success' => true,
            'message' => 'Event updated',
            'data' => $event
        ]);
    }
}
