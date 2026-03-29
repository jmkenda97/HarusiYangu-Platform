<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\RequestOtpRequest;
use App\Http\Requests\Api\VerifyOtpRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Models\OtpVerification;
use App\Models\UserSession; // We need this model for the schema
use Illuminate\Support\Str;
use Carbon\Carbon;
use Illuminate\Http\Request;

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
                'phone' => $phone,
                'role' => 'HOST',
                'status' => 'ACTIVE',
                'is_phone_verified' => true
            ]);
        } else {
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
}
