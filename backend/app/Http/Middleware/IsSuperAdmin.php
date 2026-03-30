<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class IsSuperAdmin
{
    public function handle(Request $request, Closure $next)
    {
        if (!$request->user() || !$request->user()->hasRole('SUPER_ADMIN')) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Super Admin access only.'
            ], 403);
        }

        return $next($request);
    }
}
