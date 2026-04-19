<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EventVendor extends Model
{
    use HasFactory;

    protected $table = 'event_vendors';
    protected $primaryKey = 'id';

    // UUID Configuration
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'event_id',
        'vendor_id',
        'budget_item_id',
        'status',
        'assigned_service',
        'agreed_amount',
        'last_quote_amount',
        'amount_paid',
        'balance_due',
        'contract_notes',
        'start_date',
        'end_date',
        'created_by',
        'metadata',
        'rejection_reason',
    ];

    protected $casts = [
        'agreed_amount' => 'decimal:2',
        'last_quote_amount' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'balance_due' => 'decimal:2',
        'start_date' => 'date',
        'end_date' => 'date',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // --- RELATIONSHIPS ---

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'event_id');
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class, 'vendor_id');
    }

    public function budgetItem(): BelongsTo
    {
        return $this->belongsTo(EventBudgetItem::class, 'budget_item_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(VendorPayment::class, 'event_vendor_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
