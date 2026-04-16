<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OtpVerification extends Model
{
    public $timestamps = false;
    protected $table = 'otp_verifications';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = ['phone', 'otp_code', 'purpose', 'expires_at', 'is_used'];

    protected $casts = [
        'is_used' => 'boolean',
        'expires_at' => 'datetime',
        'created_at' => 'datetime',
    ];
}
