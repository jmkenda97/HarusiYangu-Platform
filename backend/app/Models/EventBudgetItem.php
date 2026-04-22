<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventBudgetItem extends Model
{
    use HasFactory;

    protected $table = 'event_budget_items';
    protected $primaryKey = 'id';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'event_id',
        'category_id',
        'item_name',
        'description',
        'estimated_cost',
        'actual_cost',
        'variance_amount',
        'budget_item_status',
        'priority_level',
    ];

    protected $casts = [
        'estimated_cost' => 'decimal:2',
        'actual_cost' => 'decimal:2',
        'variance_amount' => 'decimal:2',
        'priority_level' => 'integer',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'event_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(BudgetCategory::class, 'category_id');
    }

    /**
     * Link to the vendor assigned to this budget item
     */
    public function vendorAssignment(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(EventVendor::class, 'budget_item_id');
    }
}
