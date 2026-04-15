<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VendorDocument extends Model
{
    use HasFactory;

    protected $table = 'vendor_documents';
    protected $primaryKey = 'id';

    // UUID Configuration
    protected $keyType = 'string';
    public $incrementing = false;

    // Uses uploaded_at instead of created_at/updated_at
    public $timestamps = false;

    protected $fillable = [
        'id',
        'vendor_id',
        'service_id',
        'document_type',
        'document_name',
        'file_url',
        'mime_type',
        'file_size',
        'verification_status',
        'reviewed_by',
        'reviewed_at',
        'rejection_reason',
        'uploaded_at',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'uploaded_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    // --- RELATIONSHIPS ---

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class, 'vendor_id');
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(VendorService::class, 'service_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
