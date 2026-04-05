<?php

namespace App\Policies;

use App\Models\Event;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;
use Illuminate\Support\Facades\Gate;

class EventPolicy
{
    use HandlesAuthorization;

    public function before(User $user, $ability)
    {
        if ($user->hasRole('SUPER_ADMIN')) {
            return true;
        }
    }

    public function viewBudget(User $user, Event $event)
    {
        if ($user->id === $event->owner_user_id) return true;
        return $user->hasPermissionTo('view-event-budget');
    }

    public function manageGuests(User $user, Event $event)
    {
        if ($user->id === $event->owner_user_id) return true;
        return $user->hasPermissionTo('view-event-guests');
    }

    public function manageContributions(User $user, Event $event)
    {
        if ($user->id === $event->owner_user_id) return true;
        return $user->hasPermissionTo('view-event-contributions');
    }

    public function scanEvent(User $user, Event $event)
    {
        if ($user->id === $event->owner_user_id) return true;
        return $user->hasPermissionTo('scan-event-qr');
    }

    public function manageVendors(User $user, Event $event)
    {
        if ($user->id === $event->owner_user_id) return true;
        return $user->hasPermissionTo('manage-event-vendors');
    }

    public function update(User $user, Event $event)
    {
        return $user->id === $event->owner_user_id;
    }

    public function delete(User $user, Event $event)
    {
        return $user->id === $event->owner_user_id;
    }

        public function manageCommittee(User $user, Event $event)
    {
        // The owner can always manage the committee
        if ($user->id === $event->owner_user_id) {
            return true;
        }

        // Others (like Coordinators) need specific permission
        return $user->hasPermissionTo('manage-event-committee');
    }
}
