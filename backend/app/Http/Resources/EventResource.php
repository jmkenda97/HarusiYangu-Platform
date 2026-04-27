<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'owner_user_id' => $this->owner_user_id, 
            'event_name' => $this->event_name,
            'event_type' => $this->event_type,
            'description' => $this->description,
            'groom_name' => $this->groom_name,
            'bride_name' => $this->bride_name,
            'celebrant_name' => $this->celebrant_name,
            'event_date' => $this->event_date?->toDateString(),
            'start_time' => $this->start_time?->format('H:i:s'),
            'end_time' => $this->end_time?->format('H:i:s'),
            'venue_name' => $this->venue_name,
            'venue_address' => $this->venue_address,
            'region' => $this->region,
            'district' => $this->district,
            'ward' => $this->ward,
            'google_map_link' => $this->google_map_link,
            'expected_guests' => (int) $this->expected_guests,
            'event_status' => $this->event_status,
            'total_collected' => $this->total_collected,
            'total_outstanding' => $this->total_outstanding,
            'currency_code' => $this->currency_code,
            'target_budget' => round((float) $this->target_budget, 2),
            'contingency_amount' => round((float) $this->contingency_amount, 2),
            'allow_public_registration' => (bool) $this->allow_public_registration,
            'require_contribution_before_card' => (bool) $this->require_contribution_before_card,
            'contribution_card_mode' => $this->contribution_card_mode,
            'owner' => [
                'id' => $this->owner->id ?? null,
                'name' => ($this->owner->first_name ?? '') . ' ' . ($this->owner->last_name ?? ''),
                'first_name' => $this->owner->first_name ?? '',
                'last_name' => $this->owner->last_name ?? '',
            ],
            // FINANCIAL DATA
            'wallet' => $this->whenLoaded('wallet'),
            
            // RELATIONSHIPS (Needed for Dashboard calculations)
            'contacts' => $this->whenLoaded('contacts'),
            'vendors' => $this->whenLoaded('vendors'),
            'committee' => $this->whenLoaded('committee'),
            
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
