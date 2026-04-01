<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Support\Str; // <--- ADD THIS
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    protected $table = 'users';
    protected $primaryKey = 'id';

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
        'onboarding_completed', // <--- ADD THIS LINE
        'is_phone_verified',
        'is_email_verified',
        'last_login_at',
    ];



    protected $hidden = [
        'password_hash',
        'remember_token',
    ];

    protected $casts = [
        'id' => 'string', // <--- ADD THIS
        'last_login_at' => 'datetime',
        'is_phone_verified' => 'boolean',
        'is_email_verified' => 'boolean',
    ];


    // SMART FIX: For Super Admin, trust the DB Column. For others, check Spatie.
    public function getRoleAttribute()
    {
        // 1. If DB says Super Admin, immediately return it.
        // This overrides Spatie to fix permission bugs.
        if (isset($this->attributes['role']) && $this->attributes['role'] === 'SUPER_ADMIN') {
            return 'SUPER_ADMIN';
        }

        // 2. For everyone else, use Spatie Permission System
        $spatieRole = $this->hasRole('SUPER_ADMIN') ? 'SUPER_ADMIN' : ($this->hasRole('HOST') ? 'HOST' : null);
        if ($spatieRole) {
            return $spatieRole;
        }

        // 3. Last Fallback: Check Database Column (Guests)
        return $this->attributes['role'] ?? 'GUEST';
    }


    public function getAuthPassword()
    {
        return $this->password_hash;
    }
}
