<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\RequestOtpRequest;
use App\Http\Requests\Api\VerifyOtpRequest;
use App\Http\Resources\UserResource;
use App\Models\OtpVerification;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;

class AuthController extends Controller
{
    public function requestOtp(Request $request)
    {
        $request->validate([
            'phone' => 'required|string',
            'purpose' => 'required|string|in:LOGIN,REGISTER',
        ]);

        $otp = rand(100000, 999999);
        
        // Use an updateOrCreate to prevent flooding the table
        OtpVerification::updateOrCreate(
            ['phone' => $request->phone, 'purpose' => $request->purpose],
            [
                'otp_code' => $otp,
                'expires_at' => Carbon::now()->addMinutes(10),
                'verified_at' => null
            ]
        );

        // In a real app, send via SMS gateway. For now, returning it for testing.
        return response()->json([
            'success' => true,
            'message' => 'OTP sent successfully',
            'data' => ['debug_otp' => $otp] // REMOVE IN PRODUCTION
        ]);
    }

    public function verifyOtp(Request $request)
    {
        $request->validate([
            'phone' => 'required|string',
            'otp_code' => 'required|string',
            'purpose' => 'required|string|in:LOGIN,REGISTER',
        ]);

        $verification = OtpVerification::where('phone', $request->phone)
            ->where('otp_code', $request->otp_code)
            ->where('purpose', $request->purpose)
            ->where('expires_at', '>', Carbon::now())
            ->first();

        if (!$verification) {
            return response()->json(['success' => false, 'message' => 'Invalid or expired OTP'], 422);
        }

        $verification->update(['verified_at' => Carbon::now()]);

        // If LOGIN, find user and issue token
        if ($request->purpose === 'LOGIN') {
            $user = User::where('phone', $request->phone)->first();
            if (!$user) {
                return response()->json(['success' => false, 'message' => 'User not found. Please register.'], 404);
            }

            $token = $user->createToken('auth_token')->plainTextToken;
            return response()->json([
                'success' => true,
                'data' => [
                    'user' => new UserResource($user),
                    'token' => $token,
                    'token_type' => 'Bearer'
                ]
            ]);
        }

        return response()->json(['success' => true, 'message' => 'Phone verified successfully']);
    }

    public function completeRegistration(Request $request)
    {
        $request->validate([
            'phone' => 'required|string',
            'role' => 'required|string|in:HOST,VENDOR',
            'first_name' => 'required|string',
            'last_name' => 'required|string',
            'password' => 'required|string|min:6|confirmed',
            'business_name' => 'required_if:role,VENDOR|string',
            'service_type' => 'required_if:role,VENDOR|string',
        ]);

        // Ensure phone was verified
        $verification = OtpVerification::where('phone', $request->phone)
            ->where('purpose', 'REGISTER')
            ->whereNotNull('verified_at')
            ->first();

        if (!$verification) {
            return response()->json(['success' => false, 'message' => 'Phone not verified'], 403);
        }

        $user = User::create([
            'id' => (string) \Str::uuid(),
            'phone' => $request->phone,
            'role' => $request->role,
            'first_name' => $request->first_name,
            'middle_name' => $request->middle_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'password_hash' => Hash::make($request->password),
            'profile_photo_url' => $request->profile_photo_url,
            'onboarding_completed' => true,
        ]);

        // Update Vendor & Upload Documents
        if ($user->role === 'VENDOR' && $user->vendor) {
            $user->vendor->update([
                'full_name' => $user->first_name . ' ' . $user->last_name,
                'business_name' => $request->business_name,
                'phone' => $user->phone,
                'email' => $user->email,
                'service_type' => $request->service_type,
                'address' => $request->address ?? null,
                'min_price' => $request->min_price ?? 0,
                'max_price' => $request->max_price ?? null,
            ]);

            // CREATE DEFAULT SERVICE BASED ON SERVICE_TYPE (INACTIVE UNTIL VERIFIED)
            $defaultService = \App\Models\VendorService::create([
                'id' => (string) \Str::uuid(),
                'vendor_id' => $user->vendor->id,
                'service_name' => ucfirst(str_replace('_', ' ', strtolower($request->service_type))),
                'service_type' => $request->service_type,
                'description' => 'Professional ' . strtolower(str_replace('_', ' ', $request->service_type)) . ' services',
                'min_price' => $request->min_price ?? 0,
                'max_price' => $request->max_price ?? null,
                'price_unit' => 'per_event',
                'is_available' => false,
                'is_verified' => false,
            ]);

            // UPLOAD REQUIRED DOCUMENTS
            if ($request->hasFile('business_license')) {
                $path = $request->file('business_license')->store('vendor-documents', 'public');
                $this->createVendorDocument($user->vendor->id, 'BUSINESS_LICENSE', $path, $request->file('business_license'), $defaultService->id);
            }
            if ($request->hasFile('brela_certificate')) {
                $path = $request->file('brela_certificate')->store('vendor-documents', 'public');
                $this->createVendorDocument($user->vendor->id, 'BRELA_CERTIFICATE', $path, $request->file('brela_certificate'), $defaultService->id);
            }
            if ($request->hasFile('tin_certificate')) {
                $path = $request->file('tin_certificate')->store('vendor-documents', 'public');
                $this->createVendorDocument($user->vendor->id, 'TIN_CERTIFICATE', $path, $request->file('tin_certificate'), $defaultService->id);
            }

            // SEND EMAIL: DOCUMENTS RECEIVED
            if ($user->email) {
                Mail::to($user->email)->send(new \App\Mail\VendorStatusChange($user, 'PENDING_APPROVAL', "We have received your documents and are reviewing them."));
            }
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Registration complete! Your account is under review.',
            'data' => [
                'user' => new UserResource($user),
                'token' => $token,
                'token_type' => 'Bearer'
            ]
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['success' => true, 'message' => 'Logged out successfully.']);
    }

    /**
     * Get notifications for the user
     */
    public function getNotifications(Request $request)
    {
        $notifications = auth()->user()->notifications()->latest()->limit(20)->get();
        $unreadCount = auth()->user()->unreadNotifications()->count();
        
        return response()->json([
            'success' => true,
            'data' => $notifications,
            'unread_count' => $unreadCount
        ]);
    }

    /**
     * Mark a specific notification as read
     */
    public function markNotificationAsRead($id)
    {
        $notification = auth()->user()->notifications()->findOrFail($id);
        $notification->markAsRead();
        
        return response()->json(['success' => true]);
    }

    /**
     * Mark all notifications as read
     */
    public function markAllNotificationsAsRead()
    {
        auth()->user()->unreadNotifications->markAsRead();
        return response()->json(['success' => true]);
    }

    private function createVendorDocument($vendorId, $type, $path, $file, $serviceId = null)
    {
        try {
            \App\Models\VendorDocument::create([
                'id' => (string) \Str::uuid(),
                'vendor_id' => $vendorId,
                'service_id' => $serviceId,
                'document_type' => $type,
                'document_name' => str_replace('_', ' ', $type) . ' - ' . $file->getClientOriginalName(),
                'file_url' => $path,
                'mime_type' => $file->getClientMimeType(),
                'file_size' => $file->getSize(),
                'verification_status' => 'PENDING',
                'uploaded_at' => now(),
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to save vendor document: ' . $e->getMessage());
        }
    }
}
