<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventCommitteeMember;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str; // IMPORT THIS

class EventCommitteeController extends Controller
{
    /**
     * Display a listing of committee members for an event.
     */
    public function index($eventId)
    {
        $event = Event::findOrFail($eventId);

        $members = EventCommitteeMember::where('event_id', $eventId)
            ->with('user:id,first_name,last_name,phone,email,profile_photo_url')
            ->get();

        return response()->json(['data' => $members]);
    }

    /**
     * Store a newly created committee member.
     */
    public function store(Request $request, $eventId)
    {
        $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'phone' => 'required|string|unique:users,phone',
            'committee_role' => 'required|in:CHAIRPERSON,SECRETARY,TREASURER,COORDINATOR,MEMBER,GATE_OFFICER',
            'can_manage_budget' => 'sometimes|boolean',
            'can_manage_contributions' => 'sometimes|boolean',
            'can_send_messages' => 'sometimes|boolean',
            'can_manage_vendors' => 'sometimes|boolean',
            'can_scan_cards' => 'sometimes|boolean',
        ]);

        return DB::transaction(function () use ($request, $eventId) {
            $event = Event::findOrFail($eventId);

            // 1. Find or Create User
            // FIX: We generate UUID here so PHP knows the ID immediately.
            // This fixes the "refresh()" error because we don't need to refresh anymore.
            $user = User::firstOrCreate(
                ['phone' => $request->phone],
                [
                    'id' => (string) Str::uuid(), // Explicitly generate ID
                    'first_name' => $request->first_name,
                    'last_name' => $request->last_name,
                    'role' => 'COMMITTEE_MEMBER',
                    'status' => 'ACTIVE',
                    'password_hash' => Hash::make('password123'),
                    'is_phone_verified' => true,
                ]
            );

            // 2. We do NOT need refresh() anymore because we passed the ID in the array above.
            // The $user object now has a valid ID.

            // 3. Assign Spatie Role
            if (!$user->hasAnyRole(['SUPER_ADMIN', 'ADMIN', 'HOST'])) {
                if ($request->committee_role === 'GATE_OFFICER') {
                    $spatieRole = 'GATE_OFFICER';
                } else {
                    $spatieRole = 'COMMITTEE_MEMBER';
                }
                $user->assignRole($spatieRole);
            }

            // 4. Check for duplicates
            $existing = EventCommitteeMember::where('event_id', $eventId)
                ->where('user_id', $user->id)
                ->first();

            if ($existing) {
                return response()->json(['message' => 'User is already a committee member.'], 409);
            }

            // 5. CREATE MEMBER
            $member = EventCommitteeMember::create([
                'event_id' => $eventId,
                'user_id' => $user->id,
                'committee_role' => $request->committee_role,
                'can_manage_budget' => (bool) ($request->can_manage_budget ?? false),
                'can_manage_contributions' => (bool) ($request->can_manage_contributions ?? true),
                'can_send_messages' => (bool) ($request->can_send_messages ?? true),
                'can_manage_vendors' => (bool) ($request->can_manage_vendors ?? false),
                'can_scan_cards' => (bool) ($request->can_scan_cards ?? false),
                'added_by' => auth()->id(),
            ]);

            return response()->json(['data' => $member], 201);
        });
    }

    /**
     * Update the specified committee member.
     */
    public function update(Request $request, $eventId, $id)
    {
        $request->validate([
            'committee_role' => 'required|in:CHAIRPERSON,SECRETARY,TREASURER,COORDINATOR,MEMBER,GATE_OFFICER',
            'can_manage_budget' => 'sometimes|boolean',
            'can_manage_contributions' => 'sometimes|boolean',
            'can_send_messages' => 'sometimes|boolean',
            'can_manage_vendors' => 'sometimes|boolean',
            'can_scan_cards' => 'sometimes|boolean',
        ]);

        $member = EventCommitteeMember::where('event_id', $eventId)
            ->where('id', $id)
            ->firstOrFail();

        $member->update([
            'committee_role' => $request->committee_role,
            'can_manage_budget' => (bool) ($request->can_manage_budget ?? false),
            'can_manage_contributions' => (bool) ($request->can_manage_contributions ?? true),
            'can_send_messages' => (bool) ($request->can_send_messages ?? true),
            'can_manage_vendors' => (bool) ($request->can_manage_vendors ?? false),
            'can_scan_cards' => (bool) ($request->can_scan_cards ?? false),
        ]);

        return response()->json(['data' => $member]);
    }

    /**
     * Remove the specified committee member.
     */
    public function destroy($eventId, $id)
    {
        $member = EventCommitteeMember::where('event_id', $eventId)
            ->where('id', $id)
            ->firstOrFail();

        $member->delete();

        return response()->json(null, 204);
    }

    /**
     * Export committee list to CSV.
     */
    public function export($eventId)
    {
        $members = EventCommitteeMember::where('event_id', $eventId)
            ->with('user')
            ->get();

        $filename = "committee_list_{$eventId}.csv";
        $handle = fopen('php://output', 'w');
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="' . $filename . '"');

        fputcsv($handle, ['Name', 'Phone', 'Email', 'Role', 'Can Manage Budget', 'Can Manage Contributions', 'Can Send Messages', 'Can Manage Vendors', 'Can Scan Cards']);

        foreach ($members as $member) {
            fputcsv($handle, [
                ($member->user->first_name ?? '') . ' ' . ($member->user->last_name ?? ''),
                $member->user->phone ?? 'N/A',
                $member->user->email ?? 'N/A',
                $member->committee_role,
                $member->can_manage_budget ? 'Yes' : 'No',
                $member->can_manage_contributions ? 'Yes' : 'No',
                $member->can_send_messages ? 'Yes' : 'No',
                $member->can_manage_vendors ? 'Yes' : 'No',
                $member->can_scan_cards ? 'Yes' : 'No',
            ]);
        }
        fclose($handle);
        exit;
    }
}
