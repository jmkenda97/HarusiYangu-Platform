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

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = ['file_url_full'];

    /**
     * Get the full URL or Base64 data for the document.
     * This is used for immediate browser display.
     */
    public function getFileUrlFullAttribute(): ?string
    {
        if (!$this->file_url) {
            return null;
        }

        try {
            // Clean up the path
            $path = $this->file_url;
            $path = preg_replace('/^\/?storage\//', '', $path);

            if (\Illuminate\Support\Facades\Storage::disk('public')->exists($path)) {
                $fileContent = \Illuminate\Support\Facades\Storage::disk('public')->get($path);
                $base64 = base64_encode($fileContent);
                return 'data:' . ($this->mime_type ?? 'image/png') . ';base64,' . $base64;
            }
        } catch (\Exception $e) {
            // Fallback to basic URL if base64 fails
            return \Illuminate\Support\Facades\Storage::disk('public')->url($this->file_url);
        }

        return null;
    }

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
