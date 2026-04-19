<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
// <--- ADD THIS IMPORT BELOW
use Illuminate\Database\Eloquent\SoftDeletes; 

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles, SoftDeletes; 

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

    public function getRoleAttribute()
    {
        if (isset($this->attributes['role']) && $this->attributes['role'] === 'SUPER_ADMIN') {
            return 'SUPER_ADMIN';
        }

        $spatieRole = $this->hasRole('SUPER_ADMIN') ? 'SUPER_ADMIN' : ($this->hasRole('HOST') ? 'HOST' : ($this->hasRole('VENDOR') ? 'VENDOR' : null));
        if ($spatieRole) {
            return $spatieRole;
        }

        return $this->attributes['role'] ?? 'GUEST';
    }

    public function getAuthPassword()
    {
        return $this->password_hash;
    }

    public function getDisplayRole()
    {
        if ($this->role === 'SUPER_ADMIN') return 'System Administrator';
        if ($this->role === 'HOST') return 'Event Host';
        if ($this->role === 'VENDOR') return 'Vendor Partner';

        // Check if user has committee memberships
        $membership = $this->committeeMemberships()->latest()->first();
        if ($membership) {
            return ucfirst(strtolower(str_replace('_', ' ', $membership->committee_role)));
        }

        return 'Guest';
    }

    // --- PHASE 2 RELATIONSHIPS ---

    public function ownedEvents()
    {
        return $this->hasMany(Event::class, 'owner_user_id');
    }

    public function committeeMemberships()
    {
        return $this->hasMany(EventCommitteeMember::class, 'user_id');
    }

    public function participatingEvents()
    {
        return $this->belongsToMany(Event::class, 'event_committee_members', 'user_id', 'event_id');
    }

    public function recordedPayments()
    {
        return $this->hasMany(ContributionPayment::class, 'recorded_by');
    }

    public function vendor(): HasOne
    {
        return $this->hasOne(Vendor::class, 'user_id');
    }
}