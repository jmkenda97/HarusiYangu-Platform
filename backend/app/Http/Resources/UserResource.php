<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'last_name' => $this->last_name,
            'full_name' => trim($this->first_name . ' ' . $this->last_name),
            'phone' => $this->phone,
            'email' => $this->email,
            'role' => $this->role,
            'status' => $this->status,
            'onboarding_completed' => (bool) $this->onboarding_completed,
            'is_phone_verified' => (bool) $this->is_phone_verified,
            'profile_photo_url' => $this->profile_photo_url,
            'last_login_at' => $this->last_login_at ? $this->last_login_at->toDateTimeString() : null,
            'created_at' => $this->created_at ? $this->created_at->toDateTimeString() : null,
            'updated_at' => $this->updated_at ? $this->updated_at->toDateTimeString() : null,

            // --- ADD THIS SECTION ---
            'roles' => $this->roles->pluck('name'),
            'permissions' => $this->getAllPermissions()->pluck('name'),
            // ------------------------
            
            'committee_memberships' => $this->committeeMemberships->map(function($membership) {
                return [
                    'event_id' => $membership->event_id,
                    'committee_role' => $membership->committee_role,
                    'permissions' => [
                        'can_manage_budget' => (bool)$membership->can_manage_budget,
                        'can_manage_contributions' => (bool)$membership->can_manage_contributions,
                        'can_send_messages' => (bool)$membership->can_send_messages,
                        'can_manage_vendors' => (bool)$membership->can_manage_vendors,
                        'can_scan_cards' => (bool)$membership->can_scan_cards,
                    ]
                ];
            }),
        ];
    }
}
