<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
// IMPORT THE NEW CONTROLLERS
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\EventContributorController;
use App\Http\Controllers\Api\EventPaymentController;
use App\Http\Controllers\Api\EventContactController;
use App\Http\Controllers\Api\EventBudgetController;
use Illuminate\Support\Facades\Route;


// Version 1 API Group
Route::prefix('v1')->group(function () {

    // AUTHENTICATION ROUTES
    Route::prefix('auth')->group(function () {
        Route::post('/request-otp', [AuthController::class, 'requestOtp']);
        Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
        Route::post('/register-otp', [AuthController::class, 'requestRegistrationOtp']);
        Route::post('/verify-register-otp', [AuthController::class, 'verifyRegistrationOtp']);
        Route::post('/complete-registration', [AuthController::class, 'completeRegistration'])->middleware('auth:sanctum');
        Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    });

    // USER MANAGEMENT ROUTES
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/users/me', [UserController::class, 'me']);
        Route::put('/users/profile', [UserController::class, 'updateProfile']);

        Route::prefix('users')->group(function () {
            Route::get('/', [UserController::class, 'index']);
            Route::post('/', [UserController::class, 'store']);
            Route::put('/{id}', [UserController::class, 'update']);
            Route::delete('/{id}', [UserController::class, 'destroy']);
        });
    });

    // ==========================================
    // PHASE 2: EVENT MANAGEMENT ROUTES
    // ==========================================
    Route::middleware('auth:sanctum')->group(function () {

        // Event CRUD
        Route::apiResource('events', EventController::class);

        // Nested Routes for Contributors & Payments
        // URL Pattern: /api/v1/events/{event_id}/contributors
        Route::prefix('events/{eventId}')->group(function () {

            // Contributors (Contacts + Pledges)
            Route::post('/contributors', [EventContributorController::class, 'store']);

            // Payments
            Route::post('/payments', [EventPaymentController::class, 'store']);

            // Guest List Management
            Route::apiResource('contacts', EventContactController::class)->only(['index', 'store', 'update', 'destroy']);

            //import guests
            Route::get('/contacts/template', [EventContactController::class, 'downloadTemplate']);
            Route::post('/contacts/import', [EventContactController::class, 'import']);

            // Budget Management
            Route::apiResource('budget', EventBudgetController::class)->only(['index', 'store', 'update', 'destroy']);
        });
    });
});
