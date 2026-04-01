<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class EventContact extends Model
{
    use HasFactory;

    protected $table = 'event_contacts';
    protected $primaryKey = 'id';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'event_id',
        'full_name',
        'phone',
        'email',
        'gender',
        'relationship_label',
        'address',
        'notes',
        'is_contributor',
        'is_invited',
        'is_vip',
        'opt_in_sms',
        'opt_in_whatsapp',
        'opt_in_email',
        'is_blocked',
        'created_by',
    ];

    protected $casts = [
        'is_contributor' => 'boolean',
        'is_invited' => 'boolean',
        'is_vip' => 'boolean',
        'opt_in_sms' => 'boolean',
        'opt_in_whatsapp' => 'boolean',
        'opt_in_email' => 'boolean',
        'is_blocked' => 'boolean',
    ];

    // --- RELATIONSHIPS ---

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'event_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * A contact has one pledge per event (enforced by DB Unique Constraint)
     */
    public function pledge(): HasOne
    {
        return $this->hasOne(ContributionPledge::class, 'contact_id');
    }
}
