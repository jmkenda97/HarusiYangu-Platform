<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\EventContributorController;
use App\Http\Controllers\Api\EventPaymentController;
use App\Http\Controllers\Api\EventContactController;
use App\Http\Controllers\Api\EventBudgetController;
use App\Http\Controllers\Api\AdminVendorController;
use App\Http\Controllers\Api\VendorCatalogController;
use App\Http\Controllers\Api\EventVendorController;
// Vendor Self-Management Controllers (Task #2)
use App\Http\Controllers\Api\VendorController;
use App\Http\Controllers\Api\VendorServiceController;
use App\Http\Controllers\Api\VendorDocumentController;
// CORRECTED IMPORT: NO 'Api\' BECAUSE CONTROLLER IS IN app/Http/Controllers
use App\Http\Controllers\EventCommitteeController;

use Illuminate\Support\Facades\Route;


// Version 1 API Group
Route::prefix('v1')->group(function () {

    // AUTHENTICATION ROUTES
    Route::prefix('auth')->group(function () {
        Route::post('/request-otp', [AuthController::class, 'requestOtp']);
        Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
        Route::post('/register-otp', [AuthController::class, 'requestRegistrationOtp']);
        Route::post('/verify-register-otp', [AuthController::class, 'verifyRegistrationOtp']);
        Route::post('/complete-registration', [AuthController::class, 'completeRegistration']);
        Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    });

    // USER MANAGEMENT ROUTES
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/users/me', [UserController::class, 'me']);
        Route::put('/users/profile', [UserController::class, 'updateProfile']);

        // Notifications
        Route::get('/notifications', [AuthController::class, 'getNotifications']);
        Route::put('/notifications/{id}/read', [AuthController::class, 'markNotificationAsRead']);
        Route::post('/notifications/read-all', [AuthController::class, 'markAllNotificationsAsRead']);

        Route::prefix('users')->group(function () {
            Route::get('/', [UserController::class, 'index']);
            Route::post('/', [UserController::class, 'store']);
            Route::put('/{id}', [UserController::class, 'update']);
            Route::delete('/{id}', [UserController::class, 'destroy']);
        });

        // Event Bookings & Negotiation (Task #4)
        Route::post('/events/{eventId}/inquiry', [\App\Http\Controllers\Api\EventBookingController::class, 'sendInquiry']);
        Route::put('/bookings/{bookingId}/quote', [\App\Http\Controllers\Api\EventBookingController::class, 'sendQuote']);
        Route::put('/bookings/{bookingId}/accept', [\App\Http\Controllers\Api\EventBookingController::class, 'acceptQuote']);
        Route::put('/bookings/{bookingId}/confirm-service', [\App\Http\Controllers\Api\EventBookingController::class, 'confirmServiceReceived']);

        // Financials & Milestone Payments (Task #5)
        Route::get('/bookings/{bookingId}/payments', [\App\Http\Controllers\Api\VendorPaymentController::class, 'getPaymentInfo']);
        Route::post('/bookings/{bookingId}/payments', [\App\Http\Controllers\Api\VendorPaymentController::class, 'store']);
    });

    // ==========================================
    // PHASE 2: EVENT MANAGEMENT ROUTES
    // ==========================================
    Route::middleware('auth:sanctum')->group(function () {

        // Event CRUD
        Route::apiResource('events', EventController::class);

        // Nested Routes for Contributors, Payments, Contacts, Budget, and Committee
        // URL Pattern: /api/v1/events/{event_id}/...
        Route::prefix('events/{eventId}')->group(function () {

            // --- COMMITTEE ROUTES ---
            Route::get('/committee', [EventCommitteeController::class, 'index']);
            Route::post('/committee', [EventCommitteeController::class, 'store']);
            Route::put('/committee/{memberId}', [EventCommitteeController::class, 'update']);
            Route::delete('/committee/{memberId}', [EventCommitteeController::class, 'destroy']);
            Route::get('/committe/export', [EventCommitteeController::class, 'export']);

            // Contributors (Contacts + Pledges)
            Route::post('/contributors', [EventContributorController::class, 'store']);

            // Payments
            Route::post('/payments', [EventPaymentController::class, 'store']);

            // Guest List Management
            Route::apiResource('contacts', EventContactController::class)->only(['index', 'store', 'update', 'destroy']);

            // Import Guests
            Route::get('/contacts/template', [EventContactController::class, 'downloadTemplate']);
            Route::get('/contacts/export', [EventContactController::class, 'export']);
            Route::post('/contacts/import', [EventContactController::class, 'import']);
            // Corrected typo in coords -> contacts
            Route::get('/contributors/export', [EventContributorController::class, 'export']);
            Route::get('/budget/export', [EventBudgetController::class, 'export']);

            // Budget Management
            Route::apiResource('budget', EventBudgetController::class)->only(['index', 'store', 'update', 'destroy']);

            // ==========================================
            // VENDOR ASSIGNMENT ROUTES (Task #4)
            // ==========================================
            Route::get('/vendors', [EventVendorController::class, 'index']);
            Route::post('/vendors', [EventVendorController::class, 'store']);
            Route::put('/vendors/{id}', [EventVendorController::class, 'update']);
            Route::delete('/vendors/{id}', [EventVendorController::class, 'destroy']);
        });

        // ==========================================
        // VENDOR CATALOG ROUTES (Task #4)
        // Public vendor browsing for all authenticated users
        // ==========================================
        Route::prefix('vendor-catalog')->group(function () {
            Route::get('/', [VendorCatalogController::class, 'index']);
            Route::get('/{id}', [VendorCatalogController::class, 'show']);
        });

        // ==========================================
        // ADMIN VENDOR MANAGEMENT ROUTES
        // ==========================================
        Route::prefix('admin/vendors')->group(function () {
            Route::get('/stats', [AdminVendorController::class, 'stats']);
            Route::get('/', [AdminVendorController::class, 'index']);
            Route::get('/{id}', [AdminVendorController::class, 'show']);
            Route::delete('/{id}', [AdminVendorController::class, 'destroy']);
            Route::put('/{id}/approve', [AdminVendorController::class, 'approve']);
            Route::put('/{id}/reject', [AdminVendorController::class, 'reject']);
            Route::put('/{id}/block', [AdminVendorController::class, 'block']);
            Route::put('/{id}/unblock', [AdminVendorController::class, 'unblock']);
            Route::put('/{vendorId}/services/{serviceId}/approve', [AdminVendorController::class, 'approveService']);
            Route::put('/{vendorId}/services/{serviceId}/reject', [AdminVendorController::class, 'rejectService']);
            Route::put('/{vendorId}/documents/{docId}/review', [AdminVendorController::class, 'reviewDocument']);
        });

        // ==========================================
        // VENDOR SELF-MANAGEMENT ROUTES (Task #2)
        // ==========================================
        Route::prefix('vendors')->group(function () {
            // Vendor Profile Management
            Route::get('/profile', [VendorController::class, 'getProfile']);
            Route::post('/profile', [VendorController::class, 'createProfile']);
            Route::put('/profile', [VendorController::class, 'updateProfile']);
            Route::get('/dashboard', [VendorController::class, 'getDashboard']);

            // Vendor Services
            Route::get('/services', [VendorServiceController::class, 'index']);
            Route::post('/services', [VendorServiceController::class, 'store']);
            Route::put('/services/{id}', [VendorServiceController::class, 'update']);
            Route::delete('/services/{id}', [VendorServiceController::class, 'destroy']);
            Route::put('/services/{id}/review', [VendorServiceController::class, 'adminReview']);

            // Vendor Documents
            Route::get('/documents', [VendorDocumentController::class, 'index']);
            Route::post('/documents', [VendorDocumentController::class, 'store']);
            Route::put('/documents/{id}', [VendorDocumentController::class, 'update']);
            Route::delete('/documents/{id}', [VendorDocumentController::class, 'destroy']);
            Route::get('/documents/{id}/view', [VendorDocumentController::class, 'serveFile']);
        });
    });
});

// PUBLIC DOCUMENT VIEW - NO AUTH REQUIRED
Route::get('/api/v1/vendors/documents/{id}/view', [VendorDocumentController::class, 'serveFile']);
