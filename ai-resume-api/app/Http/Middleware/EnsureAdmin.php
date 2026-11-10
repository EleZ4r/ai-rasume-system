<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureAdmin
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        $isAdmin = $user && method_exists($user, 'isAdmin') && $user->isAdmin();
        $isHr = $user && ! $isAdmin && $user->roles()->where('name', 'hr')->exists();
        if (! $isAdmin && ! $isHr) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Forbidden'], 403);
            }

            abort(403);
        }

        return $next($request);
    }
}
