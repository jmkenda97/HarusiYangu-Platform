<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\RequestOtpRequest;
use App\Http\Requests\Api\VerifyOtpRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Models\OtpVerification;
use App\Models\UserSession;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;


// Required for JSON Response

class AuthController extends Controller
{
    public function requestOtp(RequestOtpRequest $request)
    {
        // 1. SECURITY CHECK: Prevent OTP for unregistered users (Prevents SMS Waste)
        if ($request->purpose === 'LOGIN') {
            // CHANGED: We use first() to get the user object so we can check the status.
            // Previously this was just exists().
            $user = User::where('phone', $request->phone)->first();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Phone number not registered. Please complete registration first.'
                ], 422); // 422 Unprocessable Entity (Validation Error)
            }

            // =================================================================
            // FIX: BLOCK SUSPENDED USERS FROM REQUESTING OTP
            // =================================================================
            if ($user->status === 'SUSPENDED') {
                return response()->json([
                    'success' => false,
                    'message' => 'Your account is SUSPENDED. Please communicate with the service provider to reactivate it.'
                ], 403); // 403 Forbidden
            }
        }

        // 2. Generate OTP
        $otp = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);

        // 3. Store in DB (Upsert)
        OtpVerification::updateOrCreate(
            [
                'phone' => $request->phone,
                'purpose' => $request->purpose
            ],
            [
                'otp_code' => $otp,
                'expires_at' => Carbon::now()->addMinutes(5),
                'is_used' => false
            ]
        );

        // 3. In Production: Integrate SMS Gateway (e.g., AfricasTalking) here.

        return response()->json([
            'success' => true,
            'message' => 'OTP sent successfully.',
            'data' => [
                'phone' => $request->phone,
                'expires_in' => 300, // seconds
                'debug_otp' => $otp
            ]
        ]);
    }

    public function verifyOtp(VerifyOtpRequest $request)
    {
        // 1. CLEAN INPUT
        $phone = trim($request->phone);
        $otpCode = trim($request->otp_code);
        $purpose = trim($request->purpose);

        // 2. CRITICAL CHECK: Does the user even exist?
        $user = User::where('phone', $phone)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found. This phone number is not registered. Please complete the registration process first.'
            ], 422);
        }

        // =================================================================
        // FIX: BLOCK SUSPENDED USERS FROM LOGGING IN
        // =================================================================
        if ($user->status === 'SUSPENDED') {
            return response()->json([
                'success' => false,
                'message' => 'Your account is SUSPENDED. Please communicate with the service provider to reactivate it.'
            ], 403);
        }

        // 3. DIAGNOSTIC: Find the record by PHONE only first
        $candidateRecord = OtpVerification::where('phone', $phone)
            ->where('purpose', $purpose)
            ->orderBy('created_at', 'desc')
            ->first();

        // 4. CHECKS
        if (!$candidateRecord) {
            return response()->json([
                'success' => false,
                'message' => 'No OTP request found for this phone. Please request an OTP first.'
            ], 404);
        }

        if ($candidateRecord->otp_code !== $otpCode) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid OTP Code.'
            ], 401);
        }

        if ($candidateRecord->is_used) {
            return response()->json([
                'success' => false,
                'message' => 'This OTP has already been used.'
            ], 401);
        }

        if ($candidateRecord->expires_at < now()) {
            return response()->json([
                'success' => false,
                'message' => 'OTP has expired.'
            ], 401);
        }

        // ============================================================
        // SUCCESSFUL LOGIN PATH
        // ============================================================

        // 1. Mark OTP Used
        $candidateRecord->update(['is_used' => true]);

        // 2. Update Login Time
        $user->update(['last_login_at' => Carbon::now()]);

        // --- FIX: ENSURE SPATIE ROLE IS ASSIGNED ---
        // If the user has a role set (like HOST), make sure Spatie knows about it.
        // This fixes the issue where the UserResource returns no permissions.
        if ($user->role) {
            $user->assignRole($user->role);
        }
        // ----------------------------------------------

        // 4. Create Token
        $deviceName = $request->device_name ?? 'Unknown Device';
        $tokenResult = $user->createToken($deviceName);
        $plainTextToken = $tokenResult->plainTextToken;

        // 5. Create Session
        UserSession::create([
            'user_id' => $user->id,
            'access_token_hash' => hash('sha256', $plainTextToken),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'expires_at' => Carbon::now()->addWeek(),
        ]);

        // 6. Return Success
        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'user' => new UserResource($user),
                'token' => $plainTextToken,
                'token_type' => 'Bearer'
            ]
        ]);
    }

    public function logout(Request $request)
    {
        // 1. Revoke current token
        $request->user()->currentAccessToken()->delete();

        // 2. (Optional) Clean up user_sessions table if strictly needed,
        // but relying on Sanctum tokens is safer for revocation.

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully'
        ]);
    }



    // ============================================================
    // STEP 1: NEW USER REGISTRATION REQUEST
    // ============================================================
    public function requestRegistrationOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'phone' => 'required|string|max:20|unique:users,phone'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Phone already registered.', 'errors' => $validator->errors()], 422);
        }

        $otp = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);

        OtpVerification::updateOrCreate(
            ['phone' => $request->phone, 'purpose' => 'REGISTER'],
            ['otp_code' => $otp, 'expires_at' => Carbon::now()->addMinutes(10), 'is_used' => false]
        );

        return response()->json([
            'success' => true,
            'message' => 'OTP sent successfully. Please verify to proceed.',
            'data' => ['debug_otp' => $otp]
        ]);
    }
     public function verifyRegistrationOtp(Request $request)
    {
        $request->validate([
            'phone' => 'required|string',
            'otp_code' => 'required|string|size:6',
            'role' => 'required|in:HOST,VENDOR'
        ]);

        $otpRecord = OtpVerification::where('phone', $request->phone)
            ->where('otp_code', $request->otp_code)
            ->where('purpose', 'REGISTER')
            ->where('is_used', false)
            ->where('expires_at', '>', now())
            ->first();

        if (!$otpRecord) {
            return response()->json(['success' => false, 'message' => 'Invalid or expired OTP.'], 401);
        }

        $otpRecord->update(['is_used' => true]);
        $role = strtoupper($request->role);

        $user = User::create([
            'id' => (string) Str::uuid(),
            'phone' => $request->phone,
            'first_name' => 'New',
            'last_name' => 'User',
            'role' => $role,
            'status' => 'ACTIVE', // User is active, but...
            'onboarding_completed' => false,
            'is_phone_verified' => true
        ]);

        $user->assignRole($role);

        // CREATE VENDOR RECORD AS PENDING APPROVAL
        if ($role === 'VENDOR') {
            \App\Models\Vendor::create([
                'id' => (string) Str::uuid(),
                'user_id' => $user->id,
                'full_name' => 'New Vendor',
                'phone' => $user->phone,
                'service_type' => 'OTHER',
                'status' => 'PENDING_APPROVAL' // <--- CRITICAL: START AS PENDING
            ]);
        }

        $tokenResult = $user->createToken('onboarding_token');

        return response()->json([
            'success' => true,
            'message' => 'Phone verified. Please complete your profile.',
            'data' => [
                'user' => new UserResource($user),
                'temp_token' => $tokenResult->plainTextToken
            ]
        ]);
    }

    // ============================================================
    // STEP 3: COMPLETE PROFILE (FULL REGISTRATION)
    // ============================================================
       // ============================================================
    // REGISTER: STEP 3 (COMPLETE PROFILE & UPLOAD FILES)
    // ============================================================
    public function completeRegistration(Request $request)
    {
        $user = $request->user();

        // Reload user to ensure vendor relationship is fresh
        $user->load('vendor');

        $rules = [
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'nullable|email|unique:users,email,' . $user->id,
            'password' => 'required|string|min:6|confirmed',
            'profile_photo_url' => 'nullable|string',
        ];

        if ($user->role === 'VENDOR') {
            $rules['business_name'] = 'required|string|max:255';
            $rules['service_type'] = 'required|in:CATERING,DECORATION,MC,PHOTOGRAPHY,VIDEOGRAPHY,SOUND,TRANSPORT,TENT_CHAIRS,CAKE,MAKEUP,SECURITY,VENUE,PRINTING,OTHER';
            $rules['address'] = 'nullable|string';
            $rules['business_license'] = 'nullable|file|mimes:pdf,jpg,jpeg,png|max:2048';
            $rules['business_certificate'] = 'nullable|file|mimes:pdf,jpg,jpeg,png|max:2048';
        }

        $request->validate($rules);

        // 1. Update User Info
        $user->update([
            'first_name' => $request->first_name,
            'middle_name' => $request->middle_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'password_hash' => Hash::make($request->password),
            'profile_photo_url' => $request->profile_photo_url,
            'onboarding_completed' => true,
        ]);

        // 2. Update Vendor Info & Handle Documents
        if ($user->role === 'VENDOR' && $user->vendor) {
            $user->vendor->update([
                'full_name' => $user->first_name . ' ' . $user->last_name,
                'business_name' => $request->business_name,
                'phone' => $user->phone,
                'email' => $user->email,
                'service_type' => $request->service_type,
                'address' => $request->address ?? null,
            ]);

            // 3. Handle Document Uploads
            // LOGIC: Save to Storage -> Create DB Record
            if ($request->hasFile('business_license')) {
                $path = $request->file('business_license')->store('vendor-docs/' . $user->id, 'public');
                $this->createVendorDocument($user->vendor->id, 'BUSINESS_LICENSE', $path, $request->file('business_license'));
            }

            if ($request->hasFile('business_certificate')) {
                $path = $request->file('business_certificate')->store('vendor-docs/' . $user->id, 'public');
                $this->createVendorDocument($user->vendor->id, 'CERTIFICATE', $path, $request->file('business_certificate'));
            }
        }

        // 4. Issue Final Token
        $user->currentAccessToken()->delete();
        $newToken = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Registration complete! Your account is under review.',
            'data' => [
                'user' => new UserResource($user),
                'token' => $newToken,
                'token_type' => 'Bearer'
            ]
        ]);
    }



    private function createVendorDocument($vendorId, $type, $path, $file)
    {
}

}
