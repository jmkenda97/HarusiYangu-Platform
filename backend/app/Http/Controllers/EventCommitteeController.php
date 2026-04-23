<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventCommitteeMember;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;

class EventCommitteeController extends Controller
{
    /**
     * Helper to map committee roles to specific Spatie permissions.
     */
    private function getPermissionsForRole($role)
    {
        $perms = [];

        switch ($role) {
            case 'GATE_OFFICER':
                $perms = ['scan-event-qr'];
                break;

            case 'TREASURER':
                $perms = ['view-event-budget', 'edit-event-budget', 'view-event-contributions', 'record-event-payments'];
                break;

            case 'SECRETARY':
                $perms = ['view-event-guests', 'edit-event-guests', 'view-event-contributions'];
                break;

            case 'COORDINATOR':
                $perms = ['view-event-budget', 'view-event-vendors', 'manage-event-vendors', 'view-event-guests'];
                break;

            case 'CHAIRPERSON':
                // Chairperson gets ALL available permissions in the system
                $perms = Permission::all()->pluck('name')->toArray();
                break;

            case 'MEMBER':
            default:
                $perms = ['view-event-guests', 'scan-event-qr'];
                break;
        }

        return $perms;
    }

    public function index($eventId)
    {
        $event = Event::findOrFail($eventId);
        $members = EventCommitteeMember::where('event_id', $eventId)
            ->with('user:id,first_name,last_name,phone,email,profile_photo_url')
            ->get();

        return $this->successResponse('Committee members fetched successfully', $members);
    }

    public function store(Request $request, $eventId)
    {
        // 1. Validate Request
        $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'phone' => 'required|string|unique:users,phone',
            'committee_role' => 'required|in:CHAIRPERSON,SECRETARY,TREASURER,COORDINATOR,MEMBER,GATE_OFFICER',
        ]);

        // 2. Fetch Event for Authorization
        $event = Event::findOrFail($eventId);

        // 3. CHECK PERMISSIONS
        $this->authorize('manageCommittee', $event);

        return DB::transaction(function () use ($request, $eventId) {
            // 4. Find or Create User
            $user = User::firstOrCreate(
                ['phone' => $request->phone],
                [
                    'id' => (string) Str::uuid(),
                    'first_name' => $request->first_name,
                    'last_name' => $request->last_name,
                    'role' => 'COMMITTEE_MEMBER',
                    'status' => 'ACTIVE',
                    'password_hash' => Hash::make('password123'),
                    'is_phone_verified' => true,
                ]
            );

            // 5. Assign Base Spatie Role
            if (!$user->hasAnyRole(['SUPER_ADMIN', 'ADMIN', 'HOST'])) {
                $spatieRole = ($request->committee_role === 'GATE_OFFICER') ? 'GATE_OFFICER' : 'COMMITTEE_MEMBER';
                $user->assignRole($spatieRole);
            }

            // 6. Check for duplicates
            $existing = EventCommitteeMember::where('event_id', $eventId)
                ->where('user_id', $user->id)
                ->first();

            if ($existing) {
                return $this->errorResponse('User is already a committee member.', [], 409);
            }

            // 7. Define Role Flags
            $role = $request->committee_role;
            $flags = [
                'can_manage_budget' => in_array($role, ['CHAIRPERSON', 'TREASURER']),
                'can_manage_contributions' => in_array($role, ['CHAIRPERSON', 'TREASURER', 'SECRETARY']),
                'can_send_messages' => in_array($role, ['CHAIRPERSON', 'SECRETARY', 'COORDINATOR']),
                'can_manage_vendors' => in_array($role, ['CHAIRPERSON', 'COORDINATOR']),
                'can_scan_cards' => in_array($role, ['CHAIRPERSON', 'GATE_OFFICER']),
            ];

            // 8. CREATE MEMBER RECORD
            $member = EventCommitteeMember::create(array_merge([
                'id' => (string) Str::uuid(),
                'event_id' => $eventId,
                'user_id' => $user->id,
                'committee_role' => $role,
                'added_by' => auth()->id(),
            ], $flags));

            return $this->successResponse('Committee member added successfully', $member, [], 201);
        });
    }

    public function update(Request $request, $eventId, $id)
    {
        // 1. Validate Request
        $request->validate([
            'committee_role' => 'required|in:CHAIRPERSON,SECRETARY,TREASURER,COORDINATOR,MEMBER,GATE_OFFICER',
        ]);

        // 2. Fetch Member and Event
        $member = EventCommitteeMember::where('event_id', $eventId)
            ->where('id', $id)
            ->firstOrFail();

        $event = $member->event;

        // 3. CHECK PERMISSIONS
        $this->authorize('manageCommittee', $event);

        $user = $member->user;
        $role = $request->committee_role;

        // 4. Update Spatie Base Role if necessary
        $targetRole = ($role === 'GATE_OFFICER') ? 'GATE_OFFICER' : 'COMMITTEE_MEMBER';
        if (!$user->hasRole($targetRole)) {
            $user->assignRole($targetRole);
        }

        // 5. Update Committee Member Record with Role Flags
        $member->update([
            'committee_role' => $role,
            'can_manage_budget' => in_array($role, ['CHAIRPERSON', 'TREASURER']),
            'can_manage_contributions' => in_array($role, ['CHAIRPERSON', 'TREASURER', 'SECRETARY']),
            'can_send_messages' => in_array($role, ['CHAIRPERSON', 'SECRETARY', 'COORDINATOR']),
            'can_manage_vendors' => in_array($role, ['CHAIRPERSON', 'COORDINATOR']),
            'can_scan_cards' => in_array($role, ['CHAIRPERSON', 'GATE_OFFICER']),
        ]);

        return $this->successResponse('Committee member updated successfully', $member);
    }

    public function destroy($eventId, $id)
    {
        $member = EventCommitteeMember::where('event_id', $eventId)
            ->where('id', $id)
            ->firstOrFail();

        $event = $member->event;

        // CHECK PERMISSIONS
        $this->authorize('manageCommittee', $event);

        if ($member->user_id === $event->owner_user_id) {
            return $this->errorResponse('Cannot remove the event owner from the committee.', [], 422);
        }

        $member->delete();

        return $this->successResponse('Committee member removed successfully');
    }

    public function export($eventId)
    {
        $event = Event::findOrFail($eventId);
        // Optional: Add authorization check here if needed
        // $this->authorize('manageCommittee', $event);

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
