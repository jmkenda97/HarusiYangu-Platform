<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class EventVendorResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'vendor_id' => $this->vendor_id,
            'assigned_service' => $this->assigned_service,
            'agreed_amount' => (float)$this->agreed_amount,
            'amount_paid' => (float)$this->amount_paid,
            'balance_due' => (float)$this->balance_due,
            'status' => $this->status,
            'start_date' => $this->start_date,
            'end_date' => $this->end_date,
            'contract_notes' => $this->contract_notes,
            'vendor' => new VendorResource($this->whenLoaded('vendor')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
