<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str; // <--- 1. ADDED THIS IMPORT

class UserController extends Controller
{
    public function index(Request $request)
    {
        $currentUser = $request->user();
        $query = User::query();

        // LOGIC: Super Admin sees ONLY Hosts
        if ($currentUser->hasRole('SUPER_ADMIN')) {
            $query->where('role', 'HOST');
        }
        // LOGIC: Host sees their own event users (Placeholder for Phase 2)
        elseif ($currentUser->hasRole('HOST')) {
            // For now, just return the host themselves since no events exist yet.
            // In Phase 2, this will be: $query->whereHas('events', ...);
            $query->where('id', $currentUser->id);
        }

        $users = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => UserResource::collection($users)
        ]);
    }

    public function me(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => new UserResource($request->user())
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'first_name' => 'sometimes|string|max:100',
            'last_name' => 'sometimes|string|max:100',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'profile_photo_url' => 'sometimes|url',
        ]);

        $user->update($request->only([
            'first_name',
            'last_name',
            'email',
            'profile_photo_url'
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully',
            'data' => new UserResource($user)
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',            'last_name' => 'required|string|max:100',
            'phone' => 'required|string|unique:users,phone',
            'email' => 'nullable|email|unique:users,email',
            'role' => 'required|string|in:SUPER_ADMIN,ADMIN,HOST,COMMITTEE_MEMBER,GATE_OFFICER,VENDOR,CONTRIBUTOR',
        ]);

        $user = User::create([
            'id' => (string) Str::uuid(), // <--- Now this works because we imported Str
            'first_name' => $request->first_name,
            'middle_name' => $request->middle_name,
            'last_name' => $request->last_name,
            'phone' => $request->phone,
            'email' => $request->email,
            'role' => 'HOST', // Default fallback
            'status' => 'ACTIVE',
            'is_phone_verified' => false,
        ]);

        $user->assignRole($request->role);

        return response()->json([
            'success' => true,
            'message' => 'User created successfully',
            'data' => new UserResource($user)
        ]);
    }

           public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $request->validate([
            'first_name' => 'sometimes|string|max:100',
            'middle_name' => 'sometimes|string|max:100',
            'last_name' => 'sometimes|string|max:100',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'phone' => 'sometimes|string|unique:users,phone,' . $user->id,
            // Super Admin logic implies mostly 'HOST', but let's keep validation flexible for now
            'role' => 'sometimes|string|in:SUPER_ADMIN,ADMIN,HOST,COMMITTEE_MEMBER,GATE_OFFICER,VENDOR,CONTRIBUTOR',
        ]);

        // Update standard fields
        $user->update($request->only([
            'first_name',
            'middle_name',
            'last_name',
            'middle_name',
            'email',
            'status',
            'phone'
        ]));

        // UPDATE ROLE LOGIC
        if ($request->has('role')) {
            // 1. Update Spatie (Permissions System)
            $user->syncRoles([$request->role]);

            // 2. Update the users table column (So pgAdmin shows the change)
            $user->role = $request->role;
            $user->save();
        }

        return response()->json([
            'success' => true,
            'message' => 'User updated successfully',
            'data' => new UserResource($user)
        ]);
    }

    // <--- 2. ADDED Request $request HERE
    public function destroy(Request $request, $id)
    {
        if ($request->user()->id === $id) {
            return response()->json(['success' => false, 'message' => 'You cannot delete your own account.'], 403);
        }

        $user = User::findOrFail($id);
        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'User deleted successfully'
        ]);
    }


    
}
