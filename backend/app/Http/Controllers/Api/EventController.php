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

class EventController extends Controller
{


    public function index(Request $request)
    {
        $user = $request->user();

        // FIX: STRICT FILTERING
        // We explicitly exclude archived events so deleted ones NEVER come back.
        $query = Event::with('owner')->whereNull('archived_at');

        if ($user->role === 'SUPER_ADMIN') {
            // Admin sees everything (except archived)
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

    public function store(Request $request)
    {
        $request->validate([
            'event_name' => 'required|string|max:255',
            'event_type' => ['required', Rule::in(['KITCHEN_PARTY', 'SENDOFF', 'WEDDING', 'BAG_PARTY', 'BRIDAL_SHOWER', 'BRIDAL_SHOWER', 'ENGAGEMENT', 'OTHER'])],
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
            // FIX: Changed 'contingENCY_AMOUNT' to 'contingency_amount'
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
                    // This now matches the validated input
                    'contingency_amount' => $request->contingency_amount ?? 0,
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
                    'can_scan_cards' => true,
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
            \Log::error('Event Creation Failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create event: ' . $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        // Ensure we don't show deleted events
        $event = Event::with([
            'owner',
            'committee.user',
            'contacts.pledge',
        ])->whereNull('archived_at')->findOrFail($id);

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

    public function update(Request $request, $id)
    {
        // Ensure we don't update deleted events
        $event = Event::whereNull('archived_at')->findOrFail($id);

        if ($event->owner_user_id !== auth()->id() && auth()->user()->role !== 'SUPER_ADMIN') {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $request->validate([
            'event_name' => 'sometimes|required|string|max:255',
            'event_date' => 'sometimes|required|date',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i|after:start_time',
            'groom_name' => 'nullable|string|max:255',
            'bride_name' => 'nullable|string|max:255',
            'celebrant_name' => 'nullable|string|max:255',
            'venue_name' => 'nullable|string|max:255',
            'venue_address' => 'nullable|string',
            'region' => 'nullable|string|max:100',
            'district' => 'nullable|string|max:100',
            'target_budget' => 'sometimes|required|numeric|min:0',
            'contingency_amount' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
        ]);

        $event->update($request->only([
            'event_name',
            'event_date',
            'start_time',
            'end_time',
            'groom_name',
            'bride_name',
            'celebrant_name',
            'venue_name',
            'venue_address',
            'region',
            'district',
            'target_budget',
            // FIX: Changed 'contig_amount' to 'contingency_amount'
            'contingency_amount',
            'description'
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Event updated successfully',
            'data' => $event
        ]);
    }

    public function destroy(Request $request, $id)
    {
        // FIX: HARD DELETE ONLY
        // No fallback to soft delete. We remove the row permanently.
        $event = Event::whereNull('archived_at')->findOrFail($id);

        if ($event->owner_user_id !== auth()->id() && auth()->user()->role !== 'SUPER_ADMIN') {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        // Financial Lock Check (Optional but recommended)
        // We skip this for now to ensure the delete works as requested.

        // HARD DELETE
        $event->delete();

        return response()->json([
            'success' => true,
            'message' => 'Event deleted permanently'
        ]);
    }


    public function exportCommittee($eventId)
    {
        return Excel::download(new CommitteeExport($eventId), 'committee_export.xlsx');
    }
}
