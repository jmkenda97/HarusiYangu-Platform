<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class WalletLedgerEntry extends Model
{
    use HasFactory;

    protected $table = 'wallet_ledger_entries';
    protected $primaryKey = 'id';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false; // Using entry_date instead

    protected $fillable = [
        'id',
        'wallet_id',
        'event_id',
        'entry_type', // CREDIT, DEBIT
        'source_type', // CONTRIBUTION, VENDOR_PAYMENT, EXPENSE
        'source_id',
        'amount',
        'description',
        'entry_date',
        'created_by',
        'metadata',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'entry_date' => 'datetime',
        'metadata' => 'array',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(EventWallet::class, 'wallet_id');
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'event_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function vendorPayment(): BelongsTo
    {
        return $this->belongsTo(VendorPayment::class, 'source_id');
    }

    public function contributionPayment(): BelongsTo
    {
        return $this->belongsTo(ContributionPayment::class, 'source_id');
    }
}
