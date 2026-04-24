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
            
            // --- PROFESSIONAL TRANSACTION DATA BROO ---
            'event' => [
                'id' => $this->event_id,
                'name' => $this->event->event_name ?? 'N/A',
            ],

            'payment_status' => $this->when($this->source_type === 'VENDOR_PAYMENT', function() {
                return [
                    'is_confirmed' => (bool)($this->vendorPayment->is_vendor_confirmed ?? false),
                    'confirmed_at' => $this->vendorPayment->vendor_confirmed_at ?? null,
                    'proof_url' => $this->vendorPayment->proof_attachment_url 
                        ? \Illuminate\Support\Facades\Storage::disk('public')->url($this->vendorPayment->proof_attachment_url) 
                        : null,
                    'reference' => $this->vendorPayment->transaction_reference ?? 'N/A'
                ];
            }),

            'created_by' => [
                'id' => $this->creator->id ?? null,
                'name' => ($this->creator->first_name ?? 'System') . ' ' . ($this->creator->last_name ?? ''),
            ],
        ];
    }
}
