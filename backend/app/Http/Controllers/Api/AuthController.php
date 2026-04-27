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

        $phone = $this->normalizePhone($request->phone);

        // Check if user exists (including soft-deleted)
        $user = User::withTrashed()->where('phone', $phone)->first();

        // 1. BLOCK SUSPENDED OR DELETED USERS
        if ($user) {
            if ($user->trashed() || $user->status === 'SUSPENDED') {
                return $this->errorResponse(
                    'Your account has been deactivated or suspended. Please contact HarusiYangu administration for assistance.',
                    ['status' => $user->status, 'is_deleted' => $user->trashed()],
                    403
                );
            }
        }

        // Specific Error for Login if number doesn't exist
        if ($request->purpose === 'LOGIN') {
            if (!$user) {
                return $this->errorResponse('Phone number not found. Please create an account first.', [], 404);
            }
        }

        // Specific Error for Register if number already exists and is complete
        if ($request->purpose === 'REGISTER') {
            if ($user && $user->onboarding_completed) {
                return $this->errorResponse('Phone number is already used. Please login instead.', [], 422);
            }
        }

        $otp = rand(100000, 999999);

        // Use an updateOrCreate to prevent flooding the table
        OtpVerification::updateOrCreate(
            ['phone' => $phone, 'purpose' => $request->purpose],
            [
                'otp_code' => $otp,
                'expires_at' => Carbon::now()->addMinutes(10),
                'is_used' => false,
            ]
        );

        // In a real app, send via SMS gateway. For now, returning it for testing.
        return $this->successResponse('OTP sent successfully', [
            'phone' => $phone,
            'expires_in_seconds' => 300,
            'debug_otp' => $otp // REMOVE IN PRODUCTION
        ]);
    }

    public function verifyOtp(Request $request)
    {
        $request->validate([
            'phone' => 'required|string',
            'otp_code' => 'required|string',
            'purpose' => 'required|string|in:LOGIN,REGISTER',
        ]);

        $phone = $this->normalizePhone($request->phone);
        $otpCode = $this->normalizeOtp($request->otp_code);

        // 1. PRE-CHECK USER STATUS (Very Important)
        $user = User::withTrashed()->where('phone', $phone)->first();
        if ($user && ($user->trashed() || $user->status === 'SUSPENDED')) {
            return $this->errorResponse(
                'Access Denied. Your account is suspended or deleted. Contact administration.',
                [],
                403
            );
        }

        $verification = OtpVerification::where('phone', $phone)
            ->where('otp_code', $otpCode)
            ->where('purpose', $request->purpose)
            ->where('is_used', false)
            ->where('expires_at', '>', Carbon::now())
            ->first();

        if (!$verification) {
            return $this->errorResponse('Invalid or expired OTP', [], 422);
        }

        $verification->update(['is_used' => true]);

        // If LOGIN, find user and issue token
        if ($request->purpose === 'LOGIN') {
            if (!$user) {
                return $this->errorResponse('User not found. Please register.', [], 404);
            }

            $accessToken = $user->createToken('access_token', ['*'], now()->addMinutes(60))->plainTextToken;
            $refreshToken = $user->createToken('refresh_token', ['*'], now()->addDays(1))->plainTextToken;

            return $this->successResponse('Login successful', [
                'user' => new UserResource($user),
                'access_token' => $accessToken,
                'refresh_token' => $refreshToken,
                'expires_in' => 3600,
            ]);
        }

        return $this->successResponse('Phone verified successfully', ['phone' => $phone]);
    }

    public function requestRegistrationOtp(Request $request)
    {
        return $this->requestOtp($request->merge(['purpose' => 'REGISTER']));
    }

    public function verifyRegistrationOtp(Request $request)
    {
        return $this->verifyOtp($request->merge(['purpose' => 'REGISTER']));
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
            // VALIDATION FOR DOCUMENTS
            'business_license' => 'nullable|file|mimes:pdf,jpg,jpeg,png,doc,docx|max:10240',
            'brela_certificate' => 'nullable|file|mimes:pdf,jpg,jpeg,png,doc,docx|max:10240',
            'tin_certificate' => 'nullable|file|mimes:pdf,jpg,jpeg,png,doc,docx|max:10240',
        ]);

        $phone = $this->normalizePhone($request->phone);

        $user = User::where('phone', $phone)->first();
        if ($user && $user->onboarding_completed) {
            return $this->errorResponse('Phone number is already used. Please login instead.', [], 422);
        }

        // Ensure phone was verified
        $verification = OtpVerification::where('phone', $phone)
            ->where('purpose', 'REGISTER')
            ->where('is_used', true)
            ->first();

        if (!$verification) {
            return $this->errorResponse('Phone not verified. Please request OTP first.', [], 403);
        }

        try {
            return DB::transaction(function () use ($request, $verification, $phone, $user) {
                // Use updateOrCreate to handle existing incomplete accounts
                $user = User::updateOrCreate(
                    ['phone' => $phone],
                    [
                        'id' => $user ? $user->id : (string) \Str::uuid(),
                        'role' => $request->role,
                        'first_name' => $request->first_name,
                        'middle_name' => $request->middle_name,
                        'last_name' => $request->last_name,
                        'email' => $request->email,
                        'password_hash' => Hash::make($request->password),
                        'profile_photo_url' => $request->profile_photo_url,
                        'onboarding_completed' => true,
                        'is_phone_verified' => true,
                        'status' => 'ACTIVE',
                    ]
                );

                // Assign Role
                $user->syncRoles([$request->role]);

                // Create Vendor Profile if role is VENDOR
                if ($user->role === 'VENDOR') {
                    $vendor = \App\Models\Vendor::updateOrCreate(
                        ['user_id' => $user->id],
                        [
                            'id' => (string) \Str::uuid(),
                            'full_name' => $user->first_name . ' ' . $user->last_name,
                            'business_name' => $request->business_name,
                            'phone' => $user->phone,
                            'email' => $user->email,
                            'service_type' => $request->service_type,
                            'address' => $request->address ?? null,
                            'min_price' => $request->min_price ?? 0,
                            'max_price' => $request->max_price ?? null,
                            'status' => 'PENDING_APPROVAL',
                        ]
                    );

                    // Initialize Vendor Wallet
                    \App\Models\VendorWallet::firstOrCreate(
                        ['vendor_id' => $vendor->id],
                        [
                            'id' => (string) \Str::uuid(),
                            'available_balance' => 0,
                            'pending_balance' => 0,
                            'total_earnings' => 0,
                        ]
                    );

                    // Create Default Service
                    $defaultService = \App\Models\VendorService::updateOrCreate(
                        ['vendor_id' => $vendor->id, 'service_type' => $request->service_type],
                        [
                            'id' => (string) \Str::uuid(),
                            'service_name' => ucfirst(str_replace('_', ' ', strtolower($request->service_type))),
                            'description' => 'Professional ' . strtolower(str_replace('_', ' ', $request->service_type)) . ' services',
                            'min_price' => $request->min_price ?? 0,
                            'max_price' => $request->max_price ?? null,
                            'price_unit' => 'per_event',
                            'is_available' => false,
                            'is_verified' => false,
                        ]
                    );

                    // Handle Documents
                    if ($request->hasFile('business_license')) {
                        $path = $request->file('business_license')->store('vendor-documents', 'public');
                        $this->createVendorDocument($vendor->id, 'BUSINESS_LICENSE', $path, $request->file('business_license'), $defaultService->id);
                    }
                    if ($request->hasFile('brela_certificate')) {
                        $path = $request->file('brela_certificate')->store('vendor-documents', 'public');
                        $this->createVendorDocument($vendor->id, 'BRELA_CERTIFICATE', $path, $request->file('brela_certificate'), $defaultService->id);
                    }
                    if ($request->hasFile('tin_certificate')) {
                        $path = $request->file('tin_certificate')->store('vendor-documents', 'public');
                        $this->createVendorDocument($vendor->id, 'TIN_CERTIFICATE', $path, $request->file('tin_certificate'), $defaultService->id);
                    }

                    // Send Email notification
                    if ($user->email) {
                        try {
                            Mail::to($user->email)->send(new \App\Mail\VendorStatusChange($user, 'PENDING_APPROVAL', "We have received your documents and are reviewing them."));
                        } catch (\Exception $e) {}
                    }

                    // NOTIFY ADMINS
                    \App\Services\NotificationService::notifyAdmins(
                        'New Vendor Registered',
                        "A new vendor '{$vendor->business_name}' has completed registration and is awaiting document review.",
                        ['vendor_id' => $vendor->id, 'action' => 'review_required']
                    );
                }

                $accessToken = $user->createToken('access_token', ['*'], now()->addMinutes(60))->plainTextToken;
                $refreshToken = $user->createToken('refresh_token', ['*'], now()->addDays(1))->plainTextToken;
                $verification->delete();

                return $this->successResponse('Account created successfully', [
                    'user' => new UserResource($user),
                    'access_token' => $accessToken,
                    'refresh_token' => $refreshToken,
                    'expires_in' => 3600,
                ]);
            });
        } catch (\Exception $e) {
            \Log::error('Registration Error: ' . $e->getMessage());
            return $this->errorResponse('Registration failed. Please try again.', [], 500);
        }
    }

    public function refresh(Request $request)
    {
        $request->validate([
            'refresh_token' => 'required|string',
        ]);

        $tokenParts = explode('|', $request->refresh_token);
        $tokenId = $tokenParts[0] ?? null;

        if (!$tokenId) {
            return $this->errorResponse('Invalid refresh token format', [], 401);
        }

        $tokenModel = DB::table('personal_access_tokens')->where('id', $tokenId)->first();

        if (!$tokenModel || $tokenModel->name !== 'refresh_token') {
            return $this->errorResponse('Invalid refresh token', [], 401);
        }

        if ($tokenModel->expires_at && Carbon::parse($tokenModel->expires_at)->isPast()) {
            return $this->errorResponse('Refresh token expired', [], 401);
        }

        $user = User::withTrashed()->find($tokenModel->tokenable_id);
        if (!$user || $user->trashed() || $user->status === 'SUSPENDED') {
            return $this->errorResponse('Access Denied. Your account is suspended or deleted.', [], 403);
        }

        $user->tokens()->delete();

        $accessToken = $user->createToken('access_token', ['*'], now()->addMinutes(60))->plainTextToken;
        $refreshToken = $user->createToken('refresh_token', ['*'], now()->addDays(1))->plainTextToken;

        return $this->successResponse('Token refreshed successfully', [
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
            'expires_in' => 3600,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return $this->successResponse('Logged out successfully');
    }

    /**
     * Get notifications for the user
     */
    public function getNotifications(Request $request)
    {
        $notifications = auth()->user()->notifications()->latest()->limit(20)->get();
        $unreadCount = auth()->user()->unreadNotifications()->count();

        return $this->successResponse('Notifications fetched successfully', [
            'notifications' => $notifications,
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

        return $this->successResponse('Notification marked as read');
    }

    /**
     * Mark all notifications as read
     */
    public function markAllNotificationsAsRead()
    {
        auth()->user()->unreadNotifications->markAsRead();
        return $this->successResponse('All notifications marked as read');
    }

    private function createVendorDocument($vendorId, $type, $path, $file, $serviceId = null)
    {
        // The try-catch block was removed.
        // This ensures that if creating the document record in the database fails,
        // the main transaction in completeRegistration will be rolled back,
        // preventing a partial registration where the user is created but their document is missing.
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
    }

    private function normalizePhone(?string $phone): string
    {
        return preg_replace('/\D+/', '', (string) $phone);
    }

    private function normalizeOtp(?string $otp): string
    {
        return substr(preg_replace('/\D+/', '', (string) $otp), 0, 6);
    }
}
