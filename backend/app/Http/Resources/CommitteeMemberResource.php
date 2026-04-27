<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommitteeMemberResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     * Spec 5.2
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'committee_role' => $this->committee_role,
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->first_name . ' ' . $this->user->last_name,
                'first_name' => $this->user->first_name,
                'last_name' => $this->user->last_name,
                'phone' => $this->user->phone,
            ],
            // Including permissions for frontend convenience (as seen in existing logic)
            'permissions' => [
                'can_manage_budget' => (bool)$this->can_manage_budget,
                'can_manage_contributions' => (bool)$this->can_manage_contributions,
                'can_send_messages' => (bool)$this->can_send_messages,
                'can_manage_vendors' => (bool)$this->can_manage_vendors,
                'can_scan_cards' => (bool)$this->can_scan_cards,
            ]
        ];
    }
}
