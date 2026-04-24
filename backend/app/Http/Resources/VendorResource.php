<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class VendorResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->full_name,
            'business_name' => $this->business_name,
            'phone' => $this->phone,
            'email' => $this->email,
            'service_type' => $this->service_type,
            'address' => $this->address,
            'rating' => (float)$this->rating,
            'status' => $this->status,
            'services' => $this->whenLoaded('services'),
            'documents' => $this->whenLoaded('documents'),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
