<?php

namespace App\Models;

use Spatie\Permission\Models\Permission as SpatiePermission;

class Permission extends SpatiePermission
{
    // Tell Laravel this model uses String UUIDs, not Integers
    protected $keyType = 'string';
    public $incrementing = false;
}
