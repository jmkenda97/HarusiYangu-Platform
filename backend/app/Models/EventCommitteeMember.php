<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventCommitteeMember extends Model
{
    use HasFactory;

    protected $table = 'event_committee_members';
    protected $primaryKey = 'id';

    protected $keyType = 'string';
    public $incrementing = false;

    // --- ADD THIS LINE HERE ---
    // This tells Laravel that this table does not have an 'updated_at' column
    const UPDATED_AT = null;
    // -------------------------

    protected $fillable = [
        'id',
        'event_id',
        'user_id',
        'committee_role',
        'can_manage_budget',
        'can_manage_contributions',
        'can_send_messages',
        'can_manage_vendors',
        'can_scan_cards',
        'added_by',
    ];

    protected $casts = [
        'can_manage_budget' => 'boolean',
        'can_manage_contributions' => 'boolean',
        'can_send_messages' => 'boolean',
        'can_manage_vendors' => 'boolean',
        'can_scan_cards' => 'boolean',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'event_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function addedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'added_by');
    }
}
