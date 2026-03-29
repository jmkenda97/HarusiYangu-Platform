<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Support\Str; // <--- ADD THIS

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'users';
    protected $primaryKey = 'id';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', // <--- ADD THIS
        'first_name',
        'middle_name',
        'last_name',
        'phone',
        'email',
        'password_hash',
        'profile_photo_url',
        'role',
        'status',
        'is_phone_verified',
        'is_email_verified',
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

    public function getAuthPassword()
    {
        return $this->password_hash;
    }
}
