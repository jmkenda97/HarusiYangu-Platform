<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RedirectGateOfficer
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Only apply this if we are looking at an event page
        if (!$request->route('events.show')) {
            return $next($request);
        }

        $user = $request->user();
        $event = $request->route('event');

        if ($user && $event) {
            // 1. Host sees normal page
            if ($user->id === $event->owner_user_id) {
                return $next($request);
            }

            // 2. Check Committee Role
            $member = $event->committeeMembers()->where('user_id', $user->id)->first();

            if ($member) {
                // 3. If their ONLY main job is Gate Officer (Spatie Role) or they have scan permission
                // We redirect them to the scanner.
                // This prevents them from seeing the Budget tabs.
                if ($user->hasRole('GATE_OFFICER')) {
                    return redirect()->route('scanner.index', $event->id)
                        ->with('info', 'Accessing Scanner Mode');
                }
            }
        }

        return $next($request);
    }
}
