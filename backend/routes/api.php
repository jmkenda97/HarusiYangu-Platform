<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

// Version 1 API Group
Route::prefix('v1')->group(function () {

    // Public Routes (No Token Required)
    Route::prefix('auth')->group(function () {
        Route::post('/request-otp', [AuthController::class, 'requestOtp']);
        Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
    });

    // Protected Routes (Token Required)
    // 'auth:sanctum' middleware checks for a valid Bearer token
    Route::middleware('auth:sanctum')->group(function () {

        // Auth Actions
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // User Module
        Route::prefix('users')->group(function () {
            Route::get('/me', [UserController::class, 'me']);
            Route::put('/profile', [UserController::class, 'updateProfile']);
        });

    });
});


