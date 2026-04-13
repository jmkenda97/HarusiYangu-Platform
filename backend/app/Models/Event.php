<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Event extends Model
{
    use HasFactory;

    protected $table = 'events';
    protected $primaryKey = 'id';

    // UUID Configuration
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'owner_user_id',
        'event_name',
        'event_type',
        'description',
        'groom_name',
        'bride_name',
        'celebrant_name',
        'event_date',
        'start_time',
        'end_time',
        'venue_name',
        'venue_address',
        'region',
        'district',
        'ward',
        'google_map_link',
        'expected_guests',
        'event_status',
        'currency_code',
        'target_budget',
        'contingency_amount',
        'allow_public_registration',
        'require_contribution_before_card',
        'contribution_card_mode',
    ];

    // Casts for Data Integrity
    protected $casts = [
        'event_date' => 'date',
        'start_time' => 'datetime:H:i',
        'end_time' => 'datetime:H:i',
        'target_budget' => 'decimal:2',
        'contingency_amount' => 'decimal:2',
        'expected_guests' => 'integer',
        'allow_public_registration' => 'boolean',
        'require_contribution_before_card' => 'boolean',
    ];

    // --- RELATIONSHIPS ---

    /**
     * The Host/Owner of the event
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    /**
     * Committee members assigned to this event
     */
    public function committee(): HasMany
    {
        return $this->hasMany(EventCommitteeMember::class, 'event_id');
    }

    /**
     * Contacts/Guests associated with this event
     */
    public function contacts(): HasMany
    {
        return $this->hasMany(EventContact::class, 'event_id');
    }

    /**
     * Financial Pledges for this event
     */
    public function pledges(): HasMany
    {
        return $this->hasMany(ContributionPledge::class, 'event_id');
    }

    /**
     * Actual Payments received
     */
    public function payments(): HasMany
    {
        return $this->hasMany(ContributionPayment::class, 'event_id');
    }

    /**
     * Accessor to calculate Total Paid dynamically (for quick frontend checks)
     * Note: The DB trigger updates the Wallet, but this helps the controller.
     */
    public function getTotalPaidAttribute(): float
    {
        return (float) $this->payments()->where('payment_status', 'SUCCESS')->sum('amount');
    }

    public function committeeMembers() {
    return $this->hasMany(EventCommitteeMember::class, 'event_id');
}

    public function vendors(): HasMany
    {
        return $this->hasMany(EventVendor::class, 'event_id');
    }

    public function vendorPayments(): HasMany
    {
        return $this->hasMany(VendorPayment::class, 'event_id');
    }
}
