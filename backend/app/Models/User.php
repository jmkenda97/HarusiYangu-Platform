<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    protected $table = 'users';
    protected $primaryKey = 'id';

    // UUID Configuration
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'first_name',
        'middle_name',
        'last_name',
        'phone',
        'email',
        'password_hash',
        'profile_photo_url',
        'role',
        'status',
        'onboarding_completed',
        'is_phone_verified',
        'is_email_verified',
        'last_login_at',
    ];

    protected $hidden = [
        'password_hash',
        'remember_token',
    ];

    protected $casts = [
        'id' => 'string',
        'last_login_at' => 'datetime',
        'is_phone_verified' => 'boolean',
        'is_email_verified' => 'boolean',
    ];

    // --- EXISTING AUTH LOGIC ---
    public function getRoleAttribute()
    {
        if (isset($this->attributes['role']) && $this->attributes['role'] === 'SUPER_ADMIN') {
            return 'SUPER_ADMIN';
        }

        $spatieRole = $this->hasRole('SUPER_ADMIN') ? 'SUPER_ADMIN' : ($this->hasRole('HOST') ? 'HOST' : null);
        if ($spatieRole) {
            return $spatieRole;
        }

        return $this->attributes['role'] ?? 'GUEST';
    }

    public function getAuthPassword()
    {
        return $this->password_hash;
    }

    // --- PHASE 2 RELATIONSHIPS ---

    /**
     * A User can own multiple Events
     */
    public function ownedEvents()
    {
        return $this->hasMany(Event::class, 'owner_user_id');
    }

    /**
     * A User can be a committee member in multiple Events
     */
    public function committeeMemberships()
    {
        return $this->hasMany(EventCommitteeMember::class, 'user_id');
    }

    /**
     * Helper to get events where this user is a committee member
     */
    public function participatingEvents()
    {
        return $this->belongsToMany(Event::class, 'event_committee_members', 'user_id', 'event_id');
    }

    /**
     * Payments recorded by this user (e.g., Treasurer)
     */
    public function recordedPayments()
    {
        return $this->hasMany(ContributionPayment::class, 'recorded_by');
    }
}
