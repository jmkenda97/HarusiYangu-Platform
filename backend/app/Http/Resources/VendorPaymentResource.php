<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class VendorPaymentResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'event_id' => $this->event_id,
            'vendor_id' => $this->vendor_id,
            'amount' => (float)$this->amount,
            'milestone' => $this->milestone,
            'payment_method' => $this->payment_method,
            'payment_status' => $this->payment_status,
            'transaction_reference' => $this->transaction_reference,
            'payment_date' => $this->payment_date?->toIso8601String(),
            'is_released' => (bool)$this->is_released,
            'is_vendor_confirmed' => (bool)$this->is_vendor_confirmed,
            'vendor_confirmed_at' => $this->vendor_confirmed_at?->toIso8601String(),
            'proof_attachment_url' => $this->proof_attachment_url ? \Illuminate\Support\Facades\Storage::disk('public')->url($this->proof_attachment_url) : null,
            'notes' => $this->notes,
            'metadata' => $this->metadata,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
