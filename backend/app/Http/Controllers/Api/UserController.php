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
            $query->where('id', $currentUser->id);
        }

        // Apply filters from spec
        if ($request->has('role')) {
            $query->where('role', $request->role);
        }
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $users = $query->orderBy('created_at', 'desc')->paginate($request->get('per_page', 20));

        return $this->paginatedResponse($users, UserResource::class, 'Users fetched successfully');
    }

    public function me(Request $request)
    {
        return $this->successResponse('Profile fetched successfully', new UserResource($request->user()));
    }

    public function updateProfile(Request $request)
    {
        // 1. GET THE REAL LOGGED-IN USER
        $user = $request->user();

        // 2. DEFINE VALIDATION RULES (Aligned with Doc 3.1)
        $rules = [
            'first_name' => 'sometimes|string|max:100',
            'middle_name' => 'sometimes|nullable|string|max:100',
            'last_name' => 'sometimes|string|max:100',
            'profile_photo_url' => 'sometimes|nullable|string',
        ];

        if ($request->has('email')) {
            $rules['email'] = 'required|email|unique:users,email,' . $user->id;
        }

        // 4. VALIDATE DATA
        $data = $request->validate($rules);

        // 5. UPDATE THE USER
        $user->update($data);

        // 6. RETURN SUCCESS
        return $this->successResponse('Profile updated successfully', new UserResource($user));
    }

    public function store(Request $request)
    {
        $request->validate([
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'phone' => 'required|string|unique:users,phone',
            'email' => 'nullable|email|unique:users,email',
            'role' => 'required|string|in:SUPER_ADMIN,ADMIN,HOST,COMMITTEE_MEMBER,GATE_OFFICER,VENDOR,CONTRIBUTOR',
        ]);

        $user = User::create([
            'id' => (string) Str::uuid(),
            'first_name' => $request->first_name,
            'middle_name' => $request->middle_name,
            'last_name' => $request->last_name,
            'phone' => $request->phone,
            'email' => $request->email,
            'role' => $request->role,
            'status' => 'ACTIVE',
            'is_phone_verified' => false,
        ]);

        $user->assignRole($request->role);

        return $this->successResponse('User created successfully', new UserResource($user), [], 201);
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
            'role' => 'sometimes|string|in:SUPER_ADMIN,ADMIN,HOST,COMMITTEE_MEMBER,GATE_OFFICER,VENDOR,CONTRIBUTOR',
        ]);

        // Update standard fields
        $user->update($request->only([
            'first_name',
            'middle_name',
            'last_name',
            'email',
            'status',
            'phone'
        ]));

        // UPDATE ROLE LOGIC
        if ($request->has('role')) {
            $user->syncRoles([$request->role]);
            $user->role = $request->role;
            $user->save();
        }

        return $this->successResponse('User updated successfully', new UserResource($user));
    }

    // <--- 2. ADDED Request $request HERE
    public function destroy(Request $request, $id)
    {
        if ($request->user()->id === $id) {
            return $this->errorResponse('You cannot delete your own account.', [], 403);
        }

        $user = User::findOrFail($id);
        $user->delete();

        return $this->successResponse('User deleted successfully');
    }
}
