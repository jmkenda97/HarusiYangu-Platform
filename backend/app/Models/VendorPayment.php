<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VendorPayment extends Model
{
    use HasFactory;

    protected $table = 'vendor_payments';
    protected $primaryKey = 'id';

    // UUID Configuration
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'event_id',
        'event_vendor_id',
        'vendor_id',
        'amount',
        'payment_method',
        'payment_status',
        'transaction_reference',
        'payment_date',
        'notes',
        'recorded_by',
        'is_released',
        'is_vendor_confirmed',
        'vendor_confirmed_at',
        'milestone',
        'milestone_percentage',
        'metadata',
        'proof_attachment_url',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'payment_date' => 'datetime',
        'is_released' => 'boolean',
        'is_vendor_confirmed' => 'boolean',
        'vendor_confirmed_at' => 'datetime',
        'milestone_percentage' => 'decimal:2',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // --- RELATIONSHIPS ---

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'event_id');
    }

    public function eventVendor(): BelongsTo
    {
        return $this->belongsTo(EventVendor::class, 'event_vendor_id');
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class, 'vendor_id');
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
