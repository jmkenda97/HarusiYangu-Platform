<?php

namespace App\Policies;

use App\Models\Vendor;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class VendorPolicy
{
    use HandlesAuthorization;

    /**
     * Bypass all checks for SUPER_ADMIN.
     */
    public function before(User $user, $ability)
    {
        if ($user->hasRole('SUPER_ADMIN')) {
            return true;
        }
    }

    /**
     * Determine if the user can manage the vendor profile.
     */
    public function manageProfile(User $user, Vendor $vendor): bool
    {
        return $user->id === $vendor->user_id;
    }

    /**
     * Determine if the user can manage vendor services.
     */
    public function manageServices(User $user, Vendor $vendor): bool
    {
        return $user->id === $vendor->user_id;
    }

    /**
     * Determine if the user can manage vendor documents.
     */
    public function manageDocuments(User $user, Vendor $vendor): bool
    {
        return $user->id === $vendor->user_id;
    }
}
