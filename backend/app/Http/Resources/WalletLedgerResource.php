<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class WalletLedgerResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'entry_type' => $this->entry_type,
            'source_type' => $this->source_type,
            'source_id' => $this->source_id,
            'amount' => (float)$this->amount,
            'description' => $this->description,
            'metadata' => $this->metadata,
            'entry_date' => $this->entry_date?->toIso8601String(),
            'created_by' => $this->whenLoaded('creator', function() {
                return [
                    'id' => $this->creator->id,
                    'name' => $this->creator->first_name . ' ' . $this->creator->last_name,
                ];
            }),
        ];
    }
}
