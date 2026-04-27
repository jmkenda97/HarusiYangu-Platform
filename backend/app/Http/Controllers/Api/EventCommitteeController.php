<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventCommitteeMember;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use App\Services\NotificationService;
use App\Http\Resources\CommitteeMemberResource;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class EventCommitteeController extends Controller
{
    use ApiResponse;

    /**
     * Helper to map committee roles to specific Spatie permissions.
     */
    private function getPermissionsForRole(string $role): array
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

    public function index(string $eventId): JsonResponse
    {
        $event = Event::findOrFail($eventId);
        $members = EventCommitteeMember::where('event_id', $eventId)
            ->with('user:id,first_name,last_name,phone,email,profile_photo_url')
            ->get();

        return $this->successResponse('Committee members fetched successfully', CommitteeMemberResource::collection($members));
    }

    public function store(Request $request, string $eventId): JsonResponse
    {
        // 1. Validate Request
        $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'phone' => 'required|string',
            'committee_role' => 'required|in:CHAIRPERSON,SECRETARY,TREASURER,COORDINATOR,MEMBER,GATE_OFFICER',
        ]);

        $event = Event::findOrFail($eventId);
        $this->authorize('manageCommittee', $event);

        try {
            $member = DB::transaction(function () use ($request, $eventId, $event) {
                $phone = preg_replace('/\D+/', '', (string) $request->phone);

                // 4. Find or Create User (Handle Soft Deletes)
                $user = User::withTrashed()->where('phone', $phone)->first();
                
                if (!$user) {
                    $user = User::create([
                        'id' => (string) Str::uuid(),
                        'first_name' => $request->first_name,
                        'last_name' => $request->last_name,
                        'phone' => $phone,
                        'role' => 'COMMITTEE_MEMBER',
                        'status' => 'ACTIVE',
                        'password_hash' => Hash::make('password123'),
                        'is_phone_verified' => true,
                        'onboarding_completed' => true,
                    ]);
                } else {
                    if ($user->trashed()) {
                        $user->restore();
                    }
                    $user->update([
                        'first_name' => $request->first_name,
                        'last_name' => $request->last_name,
                        'status' => 'ACTIVE',
                        'onboarding_completed' => true
                    ]);
                }

                // 5. Assign Spatie Role Safely
                if (!$user->hasAnyRole(['SUPER_ADMIN', 'ADMIN', 'HOST'])) {
                    $spatieRoleName = ($request->committee_role === 'GATE_OFFICER') ? 'GATE_OFFICER' : 'COMMITTEE_MEMBER';
                    $roleExists = DB::table('roles')->where('name', $spatieRoleName)->exists();
                    if ($roleExists && !$user->hasRole($spatieRoleName)) {
                        $user->assignRole($spatieRoleName);
                    }
                }

                // 6. Check for duplicates
                $existing = EventCommitteeMember::where('event_id', $eventId)
                    ->where('user_id', $user->id)
                    ->first();

                if ($existing) {
                    throw new \Exception('This user is already a member of your committee.');
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
                $newMember = EventCommitteeMember::create(array_merge([
                    'id' => (string) Str::uuid(),
                    'event_id' => $eventId,
                    'user_id' => $user->id,
                    'committee_role' => $role,
                    'added_by' => auth()->id(),
                ], $flags));

                // Load user relationship while INSIDE the transaction to prevent 25P02 during resource transformation
                $newMember->load('user');

                return $newMember;
            });

            // 9. NOTIFICATIONS (OUTSIDE TRANSACTION)
            try {
                NotificationService::notify(
                    $member->user,
                    "Added to Committee",
                    "You have been added to '{$event->event_name}' as a " . ucfirst(strtolower($member->committee_role)),
                    ['icon' => 'Briefcase', 'event_id' => $eventId]
                );
            } catch (\Exception $e) {}

            return $this->successResponse('Committee member added successfully', new CommitteeMemberResource($member), [], 201);

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage() ?: 'Failed to add committee member.', [], 422);
        }
    }

    public function update(Request $request, string $eventId, string $id): JsonResponse
    {
        // 1. Validate Request
        $request->validate([
            'committee_role' => 'required|in:CHAIRPERSON,SECRETARY,TREASURER,COORDINATOR,MEMBER,GATE_OFFICER',
            'can_manage_budget' => 'boolean',
            'can_manage_contributions' => 'boolean',
            'can_send_messages' => 'boolean',
            'can_manage_vendors' => 'boolean',
            'can_scan_cards' => 'boolean',
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

        // 5. Update Committee Member Record
        $member->update([
            'committee_role' => $role,
            'can_manage_budget' => $request->get('can_manage_budget', in_array($role, ['CHAIRPERSON', 'TREASURER'])),
            'can_manage_contributions' => $request->get('can_manage_contributions', in_array($role, ['CHAIRPERSON', 'TREASURER', 'SECRETARY'])),
            'can_send_messages' => $request->get('can_send_messages', in_array($role, ['CHAIRPERSON', 'SECRETARY', 'COORDINATOR'])),
            'can_manage_vendors' => $request->get('can_manage_vendors', in_array($role, ['CHAIRPERSON', 'COORDINATOR'])),
            'can_scan_cards' => $request->get('can_scan_cards', in_array($role, ['CHAIRPERSON', 'GATE_OFFICER'])),
        ]);

        // NOTIFY USER
        NotificationService::notify(
            $user,
            "Committee Role Updated",
            "Your role in '{$event->event_name}' has been updated to " . ucfirst(strtolower($role)) . ".",
            [
                'icon' => 'Briefcase', 
                'event_id' => $eventId, 
                'link' => "/events/{$eventId}"
            ],
            auth()->user()
        );

        return $this->successResponse('Committee member updated successfully', new CommitteeMemberResource($member));
    }

    public function destroy(string $eventId, string $id): JsonResponse
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

    public function export(string $eventId)
    {
        $event = Event::findOrFail($eventId);
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
