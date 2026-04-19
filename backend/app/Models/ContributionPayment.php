<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContributionPayment extends Model
{
    use HasFactory;

    protected $table = 'contribution_payments';
    protected $primaryKey = 'id';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'event_id',
        'pledge_id',
        'contact_id',
        'amount',
        'payment_method',
        'payment_status', // 'PENDING', 'SUCCESS', 'FAILED'
        'transaction_reference',
        'provider_reference',
        'internal_receipt_number',
        'paid_at',
        'confirmed_at',
        'notes',
        'recorded_by',
        'metadata',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'datetime',
        'confirmed_at' => 'datetime',
        'metadata' => 'array',
    ];

    // --- RELATIONSHIPS ---

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'event_id');
    }

    public function pledge(): BelongsTo
    {
        return $this->belongsTo(ContributionPledge::class, 'pledge_id');
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(EventContact::class, 'contact_id');
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
