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
        // Anyone who can access the event page can likely see the committee list.
        // If you want to restrict this, add: $this->authorize('viewCommittee', $event);

        $event = Event::findOrFail($eventId);
        $members = EventCommitteeMember::where('event_id', $eventId)
            ->with('user:id,first_name,last_name,phone,email,profile_photo_url')
            ->get();

        return response()->json(['data' => $members]);
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

        // 3. CHECK PERMISSIONS (Only Owner or 'manage-event-committee' permission)
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

            // 5. Assign Base Spatie Role (Gate Officer vs generic Member)
            if (!$user->hasAnyRole(['SUPER_ADMIN', 'ADMIN', 'HOST'])) {
                $spatieRole = ($request->committee_role === 'GATE_OFFICER') ? 'GATE_OFFICER' : 'COMMITTEE_MEMBER';
                $user->assignRole($spatieRole);
            }

            // 6. Assign Specific Permissions based on the Role
            $permissionNames = $this->getPermissionsForRole($request->committee_role);

            foreach ($permissionNames as $permName) {
                if (!$user->hasPermissionTo($permName)) {
                    $user->givePermissionTo($permName);
                }
            }

            // 7. Check for duplicates (User already in this event's committee)
            $existing = EventCommitteeMember::where('event_id', $eventId)
                ->where('user_id', $user->id)
                ->first();

            if ($existing) {
                return response()->json(['message' => 'User is already a committee member.'], 409);
            }

            // 8. CREATE MEMBER RECORD
            $member = EventCommitteeMember::create([
                'event_id' => $eventId,
                'user_id' => $user->id,
                'committee_role' => $request->committee_role,
                'can_manage_budget' => in_array('view-event-budget', $permissionNames),
                'can_manage_contributions' => in_array('view-event-contributions', $permissionNames),
                'can_send_messages' => in_array('view-event-guests', $permissionNames),
                'can_manage_vendors' => in_array('manage-event-vendors', $permissionNames),
                'can_scan_cards' => in_array('scan-event-qr', $permissionNames),
                'added_by' => auth()->id(),
            ]);

            return response()->json(['data' => $member], 201);
        });
    }

    public function update(Request $request, $eventId, $id)
    {
        // 1. Validate Request
        $request->validate([
            'committee_role' => 'required|in:CHAIRPERSON,SECRETARY,TREASURER,COORDINATOR,MEMBER,GATE_OFFICER',
            // Note: We do not accept manual permission checkboxes anymore,
            // permissions are derived strictly from the committee_role.
        ]);

        // 2. Fetch Member and Event
        $member = EventCommitteeMember::where('event_id', $eventId)
            ->where('id', $id)
            ->firstOrFail();

        $event = $member->event;

        // 3. CHECK PERMISSIONS
        $this->authorize('manageCommittee', $event);

        $user = $member->user;

        // 4. Get New Permissions based on the NEW Role
        $newPermissions = $this->getPermissionsForRole($request->committee_role);

        // 5. UPDATE USER PERMISSIONS
        // We simply ensure the user HAS the new permissions.
        // We DO NOT revoke old permissions because the user might have those permissions
        // from OTHER events (e.g. Treasurer for Event A, but we are updating them in Event B).
        foreach ($newPermissions as $permName) {
            if (!$user->hasPermissionTo($permName)) {
                $user->givePermissionTo($permName);
            }
        }

        // 6. Update Spatie Base Role if necessary
        $targetRole = ($request->committee_role === 'GATE_OFFICER') ? 'GATE_OFFICER' : 'COMMITTEE_MEMBER';
        if (!$user->hasRole($targetRole)) {
            $user->assignRole($targetRole);
        }

        // 7. Update Committee Member Record
        $member->update([
            'committee_role' => $request->committee_role,
            'can_manage_budget' => in_array('view-event-budget', $newPermissions),
            'can_manage_contributions' => in_array('view-event-contributions', $newPermissions),
            'can_send_messages' => in_array('view-event-guests', $newPermissions),
            'can_manage_vendors' => in_array('manage-event-vendors', $newPermissions),
            'can_scan_cards' => in_array('scan-event-qr', $newPermissions),
        ]);

        return response()->json(['data' => $member]);
    }

    public function destroy($eventId, $id)
    {
        $member = EventCommitteeMember::where('event_id', $eventId)
            ->where('id', $id)
            ->firstOrFail();

        // CHECK PERMISSIONS
        $this->authorize('manageCommittee', $member->event);

        $member->delete();
        return response()->json(null, 204);
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
