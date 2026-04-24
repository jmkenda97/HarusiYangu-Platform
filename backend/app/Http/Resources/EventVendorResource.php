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
            'budget_item_id' => $this->budget_item_id,
            'assigned_service' => $this->assigned_service,
            'agreed_amount' => (float)$this->agreed_amount,
            'last_quote_amount' => (float)$this->last_quote_amount,
            'amount_paid' => (float)$this->amount_paid,
            'balance_due' => (float)$this->balance_due,
            'status' => $this->status,
            'start_date' => $this->start_date,
            'end_date' => $this->end_date,
            'contract_notes' => $this->contract_notes,
            'metadata' => $this->metadata,
            'vendor' => new VendorResource($this->whenLoaded('vendor')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
