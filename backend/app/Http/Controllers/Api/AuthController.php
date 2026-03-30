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
        // 1. Generate OTP
        $otp = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);

        // 2. Store in DB (Upsert)
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
                // REMOVE 'otp_code' IN PRODUCTION
                'debug_otp' => $otp
            ]
        ]);
    }

    public function verifyOtp(VerifyOtpRequest $request)
    {
        // 1. CLEAN INPUT (Remove spaces)
        $phone = trim($request->phone);
        $otpCode = trim($request->otp_code);
        $purpose = trim($request->purpose);

        // 2. DIAGNOSTIC: Find the record by PHONE only first (Ignore code for a second)
        // We want to see if a record exists at all.
        $candidateRecord = OtpVerification::where('phone', $phone)
            ->where('purpose', $purpose)
            ->orderBy('created_at', 'desc') // Get the newest one
            ->first();

        // SCENARIO A: No record found for this phone/purpose at all
        if (!$candidateRecord) {
            return response()->json([
                'success' => false,
                'message' => 'No OTP found for this phone number and purpose.',
                'debug' => [
                    'searched_phone' => $phone,
                    'searched_purpose' => $purpose
                ]
            ], 404);
        }

        // SCENARIO B: Record found, but let's check the code
        if ($candidateRecord->otp_code !== $otpCode) {
            return response()->json([
                'success' => false,
                'message' => 'OTP Code Mismatch.',
                'debug' => [
                    'you_sent' => $otpCode,
                    'database_has' => $candidateRecord->otp_code,
                    'hint' => 'Did you request a new OTP and try to use the old one?'
                ]
            ], 401);
        }

        // SCENARIO C: Record found, Code matches, check if used
        if ($candidateRecord->is_used) {
            return response()->json([
                'success' => false,
                'message' => 'This OTP has already been used.'
            ], 401);
        }

        // SCENARIO D: Record found, check Expiry
        // We compare current time vs expiry time
        $now = Carbon::now();
        $expiresAt = Carbon::parse($candidateRecord->expires_at);

        if ($now->gt($expiresAt)) {
            return response()->json([
                'success' => false,
                'message' => 'OTP Expired.',
                'debug' => [
                    'expired_at' => $expiresAt->toDateTimeString(),
                    'current_time' => $now->toDateTimeString(),
                    'seconds_late' => $now->diffInSeconds($expiresAt)
                ]
            ], 401);
        }

        // ============================================================
        // IF WE REACH HERE, THE OTP IS 100% VALID. PROCEED.
        // ============================================================

        // 1. Mark OTP as used
        $candidateRecord->update(['is_used' => true]);

        // 2. Find or Create User (UUID FIX)
        $user = User::where('phone', $phone)->first();

        if (!$user) {
            // 1. Generate UUID in PHP
            $userId = (string) Str::uuid();

            // 2. Create User passing the ID explicitly
            $user = User::create([
                'id' => $userId, // <--- THIS IS THE KEY FIX
                'first_name' => 'New',       // <--- ADD THIS
                'last_name' => 'User',
                'phone' => $phone,
                'role' => 'HOST',
                'status' => 'ACTIVE',
                'is_phone_verified' => true
            ]);   if (!$user) {
            $userId = (string) Str::uuid();
            $user = User::create([
                'id' => $userId,
                'first_name' => 'New',
                'last_name' => 'User',
                'phone' => $phone,
                'role' => 'HOST',
                'status' => 'ACTIVE',
                'is_phone_verified' => true
            ]);

            // ADD THIS: Sync with Spatie
            $user->assignRole('HOST');
        };
        } else {
            // ================= ADD THIS CHECK =================
            if ($user->status !== 'ACTIVE') {
                return response()->json([
                    'success' => false,
                    'message' => 'Access Denied: Your account is currently suspended. Please contact the administrator to reactivate it.'
                ], 403); // 403 Forbidden
            }
            // =================================================

            $user->update(['last_login_at' => Carbon::now()]);
        }

        // 3. Create Token
        $deviceName = $request->device_name ?? 'Unknown Device';
        $tokenResult = $user->createToken($deviceName);
        $plainTextToken = $tokenResult->plainTextToken;

        // 4. Create Session
        UserSession::create([
            'user_id' => $user->id,
            'access_token_hash' => hash('sha256', $plainTextToken),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'expires_at' => Carbon::now()->addWeek(),
        ]);

        // 5. Success
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
