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
            $userExists = User::where('phone', $request->phone)->exists();
            if (!$userExists) {
                return response()->json([
                    'success' => false,
                    'message' => 'Phone number not registered. Please complete registration first.'
                ], 422); // 422 Unprocessable Entity (Validation Error)
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

    // ============================================================
    // STEP 2: VERIFY OTP & PREPARE ACCOUNT
    // ============================================================
    public function verifyRegistrationOtp(Request $request)
    {
        // 1. Validate Input
        $request->validate([
            'phone' => 'required|string',
            'otp_code' => 'required|string|size:6'
        ]);

        // 2. Find OTP
        $otpRecord = OtpVerification::where('phone', $request->phone)
            ->where('otp_code', $request->otp_code)
            ->where('purpose', 'REGISTER')
            ->where('is_used', false)
            ->where('expires_at', '>', now())
            ->first();

        if (!$otpRecord) {
            return response()->json(['success' => false, 'message' => 'Invalid or expired OTP.'], 401);
        }

        // 3. Mark OTP Used
        $otpRecord->update(['is_used' => true]);

        // 4. Create User
        $user = User::create([
            'id' => (string) Str::uuid(),
            'phone' => $request->phone,
            'first_name' => 'New', // Temporary
            'last_name' => 'User',
            'role' => 'HOST', // <--- HARDCODED TO FIX THE NULL ERROR
            'status' => 'ACTIVE',
            'onboarding_completed' => false,
            'is_phone_verified' => true
        ]);

        // 5. Issue Temporary Token
        // Note: We remove complex ability definitions to avoid crashes
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
    public function completeRegistration(Request $request)
    {
        $user = $request->user(); // Authenticated via the temp token

        // Validation
        $request->validate([
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'nullable|email|unique:users,email,' . $user->id,
            'password' => 'required|string|min:6|confirmed', // Require password
            'profile_photo_url' => 'nullable|string'
        ]);

        // Update User
        $user->update([
            'first_name' => $request->first_name,
            'middle_name' => $request->middle_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'password_hash' => Hash::make($request->password),
            'profile_photo_url' => $request->profile_photo_url,
            'onboarding_completed' => true, // <--- MARK COMPLETE
        ]);

        // Revoke temp token and issue real token
        $user->currentAccessToken()->delete();
        $newToken = $user->createToken('auth_token')->plainTextToken;

        // TODO: Send Email Verification here in Phase 2

        return response()->json([
            'success' => true,
            'message' => 'Account created successfully. Welcome to HarusiYangu!',
            'data' => [
                'user' => new UserResource($user),
                'token' => $newToken,
                'token_type' => 'Bearer'
            ]
        ]);
    }
}
