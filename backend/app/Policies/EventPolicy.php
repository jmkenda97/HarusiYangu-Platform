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
        
        return $event->committee()
            ->where('user_id', $user->id)
            ->where('can_manage_budget', true)
            ->exists();
    }

    public function manageGuests(User $user, Event $event)
    {
        if ($user->id === $event->owner_user_id) return true;
        
        return $event->committee()
            ->where('user_id', $user->id)
            ->where('can_send_messages', true) // Maps to Guest list / Messaging access
            ->exists();
    }

    public function manageContributions(User $user, Event $event)
    {
        if ($user->id === $event->owner_user_id) return true;
        
        return $event->committee()
            ->where('user_id', $user->id)
            ->where('can_manage_contributions', true)
            ->exists();
    }

    public function scanEvent(User $user, Event $event)
    {
        if ($user->id === $event->owner_user_id) return true;
        
        return $event->committee()
            ->where('user_id', $user->id)
            ->where('can_scan_cards', true)
            ->exists();
    }

    public function manageVendors(User $user, Event $event)
    {
        if ($user->id === $event->owner_user_id) return true;
        
        return $event->committee()
            ->where('user_id', $user->id)
            ->where('can_manage_vendors', true)
            ->exists();
    }

    public function update(User $user, Event $event)
    {
        if ($user->id === $event->owner_user_id) return true;

        // Chairpersons can also update event basic details
        return $event->committee()
            ->where('user_id', $user->id)
            ->where('committee_role', 'CHAIRPERSON')
            ->exists();
    }

    public function delete(User $user, Event $event)
    {
        return $user->id === $event->owner_user_id;
    }

    public function manageCommittee(User $user, Event $event)
    {
        if ($user->id === $event->owner_user_id) return true;

        // Only Chairpersons can manage other committee members
        return $event->committee()
            ->where('user_id', $user->id)
            ->where('committee_role', 'CHAIRPERSON')
            ->exists();
    }
}
