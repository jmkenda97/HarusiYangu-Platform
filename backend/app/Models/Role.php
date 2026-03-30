<?php

namespace App\Models;

use Spatie\Permission\Models\Role as SpatieRole;

class Role extends SpatieRole
{
    // Tell Laravel this model uses String UUIDs, not Integers
    protected $keyType = 'string';
    public $incrementing = false;
}
