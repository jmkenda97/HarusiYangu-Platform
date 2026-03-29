<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserSession extends Model
{

    public $timestamps = false;
    protected $table = 'user_sessions';
    protected $keyType = 'string';
    public $incrementing = false;
    protected $fillable = ['user_id', 'access_token_hash', 'ip_address', 'user_agent', 'expires_at'];
}
