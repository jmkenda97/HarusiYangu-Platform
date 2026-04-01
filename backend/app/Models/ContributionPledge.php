<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ContributionPledge extends Model
{
    use HasFactory;

    protected $table = 'contribution_pledges';
    protected $primaryKey = 'id';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'event_id',
        'contact_id',
        'pledge_amount',
        'amount_paid', // Managed by Trigger
        'outstanding_amount', // Managed by Trigger
        'contribution_status', // Managed by Trigger ('PLEDGED', 'PARTIALLY_PAID', 'PAID')
        'due_date',
        'contribution_type',
        'notes',
        'assigned_by',
    ];

    protected $casts = [
        'pledge_amount' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'outstanding_amount' => 'decimal:2',
        'due_date' => 'date',
    ];

    // --- RELATIONSHIPS ---

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'event_id');
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(EventContact::class, 'contact_id');
    }

    public function assigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    /**
     * All payment attempts for this pledge
     */
    public function payments(): HasMany
    {
        return $this->hasMany(ContributionPayment::class, 'pledge_id');
    }
}
