<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

// Version 1 API Group
Route::prefix('v1')->group(function () {

    // AUTHENTICATION ROUTES
    // We group them all under 'auth' so the URL is /api/v1/auth/...
    Route::prefix('auth')->group(function () {

        // PUBLIC ROUTES (No Login Required)
        Route::post('/request-otp', [AuthController::class, 'requestOtp']);
        Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);

        // Registration Routes
        // URL: /api/v1/auth/register-otp
        Route::post('/register-otp', [AuthController::class, 'requestRegistrationOtp']);
        Route::post('/verify-register-otp', [AuthController::class, 'verifyRegistrationOtp']);

        // PROTECTED ROUTES (Login Required)
        // We keep them in this group so the URL remains /api/v1/auth/complete-registration
        // We add middleware('auth:sanctum') to protect them individually
        Route::post('/complete-registration', [AuthController::class, 'completeRegistration'])->middleware('auth:sanctum');
        Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    });

    // USER MANAGEMENT ROUTES
    // These require login by default
    Route::middleware('auth:sanctum')->group(function () {

        // Profile
        Route::get('/users/me', [UserController::class, 'me']);
        Route::put('/users/profile', [UserController::class, 'updateProfile']);

        // Admin User Management
        // I removed 'is.superadmin' because it might not exist yet.
        // Super Admin logic is handled inside the Controller.
        Route::prefix('users')->group(function () {
            Route::get('/', [UserController::class, 'index']);
            Route::post('/', [UserController::class, 'store']);
            Route::put('/{id}', [UserController::class, 'update']);
            Route::delete('/{id}', [UserController::class, 'destroy']);
        });
    });
});
