<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\EventContributorController;
use App\Http\Controllers\Api\EventPaymentController;
use App\Http\Controllers\Api\EventContactController;
use App\Http\Controllers\Api\BudgetCategoryController;
use App\Http\Controllers\Api\EventBudgetController;
use App\Http\Controllers\Api\AdminVendorController;
use App\Http\Controllers\Api\VendorCatalogController;
use App\Http\Controllers\Api\EventVendorController;
// Vendor Self-Management Controllers (Task #2)
use App\Http\Controllers\Api\VendorController;
use App\Http\Controllers\Api\VendorServiceController;
use App\Http\Controllers\Api\VendorDocumentController;
use App\Http\Controllers\Api\VendorInquiryController;
use App\Http\Controllers\Api\WalletLedgerController;
use App\Http\Controllers\Api\VendorPayoutAccountController;
use App\Http\Controllers\Api\EventCommitteeController;

use Illuminate\Support\Facades\Route;


// Version 1 API Group
Route::prefix('v1')->group(function () {

    // AUTHENTICATION MODULE (Spec Section 2)
    Route::prefix('auth')->group(function () {
        Route::post('/request-otp', [AuthController::class, 'requestOtp']);
        Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
        Route::post('/register-otp', [AuthController::class, 'requestRegistrationOtp']);
        Route::post('/verify-register-otp', [AuthController::class, 'verifyRegistrationOtp']);
        Route::post('/complete-registration', [AuthController::class, 'completeRegistration']);
        Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
        
        // 2.5 Get Current User (Strict Spec)
        Route::get('/me', [UserController::class, 'me'])->middleware('auth:sanctum');
    });

    // USER MANAGEMENT ROUTES (Spec Section 3)
    Route::middleware('auth:sanctum')->group(function () {
        // 3.1 Update Profile
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
        Route::post('/events/{eventId}/inquiry', [VendorInquiryController::class, 'store']);
        Route::get('/bookings/{bookingId}/invoice', [\App\Http\Controllers\Api\EventBookingController::class, 'getInvoice']);
        Route::put('/bookings/{bookingId}/quote', [\App\Http\Controllers\Api\EventBookingController::class, 'sendQuote']);
        Route::put('/bookings/{bookingId}/accept', [\App\Http\Controllers\Api\EventBookingController::class, 'acceptQuote']);
        Route::delete('/bookings/{bookingId}', [\App\Http\Controllers\Api\EventBookingController::class, 'destroy']);
        Route::put('/bookings/{bookingId}/confirm-service', [\App\Http\Controllers\Api\EventBookingController::class, 'confirmServiceReceived']);

        // VENDOR FINANCIALS
        Route::get('/vendor/ledger', [WalletLedgerController::class, 'vendorIndex']);
        Route::get('/bookings/{bookingId}/payments', [\App\Http\Controllers\Api\VendorPaymentController::class, 'getPaymentInfo']);
        Route::post('/bookings/{bookingId}/payments', [\App\Http\Controllers\Api\VendorPaymentController::class, 'store']);
        Route::put('/payments/{paymentId}/confirm', [\App\Http\Controllers\Api\VendorPaymentController::class, 'confirmReceipt']);

        // Payout Accounts Management
        Route::get('/vendor/payout-accounts', [VendorPayoutAccountController::class, 'index']);
        Route::post('/vendor/payout-accounts', [VendorPayoutAccountController::class, 'store']);
        Route::put('/vendor/payout-accounts/{id}/primary', [VendorPayoutAccountController::class, 'setPrimary']);
        Route::delete('/vendor/payout-accounts/{id}', [VendorPayoutAccountController::class, 'destroy']);
    });

    // ==========================================
    // PHASE 2: EVENT MANAGEMENT ROUTES
    // ==========================================
    Route::middleware('auth:sanctum')->group(function () {

        Route::get('/budget-categories', [BudgetCategoryController::class, 'index']);

        // Event CRUD (Spec Section 4)
        Route::apiResource('events', EventController::class);

        // Nested Routes (Spec Sections 5, 9, 10)
        Route::prefix('events/{eventId}')->group(function () {
            
            // 9.2 Wallet Ledger (Strict Spec)
            Route::get('/wallet/ledger', [WalletLedgerController::class, 'index']);

            // --- COMMITTEE ROUTES ---
            Route::get('/committee-members', [EventCommitteeController::class, 'index']);
            Route::post('/committee-members', [EventCommitteeController::class, 'store']);
            Route::put('/committee-members/{memberId}', [EventCommitteeController::class, 'update']);
            Route::delete('/committee-members/{memberId}', [EventCommitteeController::class, 'destroy']);
            Route::get('/committee-members/export', [EventCommitteeController::class, 'export']);

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
            Route::get('/contributors/export', [EventContributorController::class, 'export']);
            Route::get('/budget/export', [EventBudgetController::class, 'export']);

            // 10. BUDGET MODULE (Strict Spec)
            Route::get('/budget-items', [EventBudgetController::class, 'index']);
            Route::post('/budget-items', [EventBudgetController::class, 'store']);
            Route::put('/budget-items/{budget_item_id}', [EventBudgetController::class, 'update']);
            Route::delete('/budget-items/{budget_item_id}', [EventBudgetController::class, 'destroy']);

            // VENDOR ASSIGNMENT
            Route::get('/vendors', [EventVendorController::class, 'index']);
            Route::post('/vendors', [EventVendorController::class, 'store']);
            Route::put('/vendors/{id}', [EventVendorController::class, 'update']);
            Route::delete('/vendors/{id}', [EventVendorController::class, 'destroy']);
        });

        // ==========================================
        // VENDOR ROUTES
        // ==========================================
        Route::prefix('vendors')->group(function () {
            Route::get('/dashboard', [VendorController::class, 'getDashboard']);
            Route::get('/profile', [VendorController::class, 'getProfile']);
            Route::post('/profile', [VendorController::class, 'createProfile']);
            Route::put('/profile', [VendorController::class, 'updateProfile']);

            Route::get('/services', [VendorServiceController::class, 'index']);
            Route::post('/services', [VendorServiceController::class, 'store']);
            Route::put('/services/{id}', [VendorServiceController::class, 'update']);
            Route::delete('/services/{id}', [VendorServiceController::class, 'destroy']);
            Route::put('/services/{id}/review', [VendorServiceController::class, 'adminReview']);

            Route::get('/documents', [VendorDocumentController::class, 'index']);
            Route::post('/documents', [VendorDocumentController::class, 'store']);
            Route::put('/documents/{id}', [VendorDocumentController::class, 'update']);
            Route::delete('/documents/{id}', [VendorDocumentController::class, 'destroy']);
            Route::get('/documents/{id}/view', [VendorDocumentController::class, 'serveFile']);

            // Public Catalog
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
    });
});

// PUBLIC DOCUMENT VIEW
Route::get('/api/v1/vendors/documents/{id}/view', [VendorDocumentController::class, 'serveFile']);
