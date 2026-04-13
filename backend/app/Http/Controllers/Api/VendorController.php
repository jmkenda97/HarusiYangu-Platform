<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vendor;
use App\Models\VendorService;
use App\Models\VendorDocument;
use App\Models\EventVendor;
use App\Http\Requests\Api\StoreVendorRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class VendorController extends Controller
{
    /**
     * Get the authenticated user's vendor profile.
     */
    public function getProfile(Request $request)
    {
        $vendor = Vendor::with(['services', 'documents'])
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$vendor) {
            return response()->json([
                'success' => false,
                'message' => 'No vendor profile found. Please create your vendor profile first.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $vendor
        ]);
    }

    /**
     * Create a new vendor profile for the authenticated user.
     */
    public function createProfile(StoreVendorRequest $request)
    {
        $user = $request->user();

        // Only VENDOR role users can create a vendor profile
        if ($user->role !== 'VENDOR') {
            return response()->json([
                'success' => false,
                'message' => 'Only vendor accounts can create a vendor profile.'
            ], 403);
        }

        // Check if user already has a vendor profile
        $existingVendor = Vendor::where('user_id', $user->id)->first();
        if ($existingVendor) {
            return response()->json([
                'success' => false,
                'message' => 'You already have a vendor profile.'
            ], 400);
        }

        try {
            $vendor = DB::transaction(function () use ($request, $user) {
                return Vendor::create([
                    'id' => Str::uuid(),
                    'user_id' => $user->id,
                    'business_name' => $request->business_name,
                    'full_name' => $request->full_name,
                    'phone' => $request->phone,
                    'email' => $request->email,
                    'address' => $request->address,
                    'service_type' => $request->service_type,
                    'status' => 'PENDING_APPROVAL',
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Vendor profile created successfully',
                'data' => $vendor
            ], 201);
        } catch (\Exception $e) {
            Log::error('Vendor Profile Creation Failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create vendor profile: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the authenticated user's vendor profile.
     */
    public function updateProfile(StoreVendorRequest $request)
    {
        $vendor = Vendor::where('user_id', $request->user()->id)->first();

        if (!$vendor) {
            return response()->json([
                'success' => false,
                'message' => 'No vendor profile found.'
            ], 404);
        }

        // Authorize via policy
        $this->authorize('manageProfile', $vendor);

        try {
            $vendor->update([
                'business_name' => $request->business_name,
                'full_name' => $request->full_name,
                'phone' => $request->phone,
                'email' => $request->email,
                'address' => $request->address,
                'service_type' => $request->service_type,
                // Status is NOT updated here - admin controls that
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Vendor profile updated successfully',
                'data' => $vendor
            ]);
        } catch (\Exception $e) {
            Log::error('Vendor Profile Update Failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update vendor profile: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get the vendor dashboard with profile, services, documents, and payment summary.
     */
    public function getDashboard(Request $request)
    {
        $user = $request->user();
        $vendor = Vendor::with(['services', 'documents'])
            ->where('user_id', $user->id)
            ->first();
    
        if (!$vendor) {
            return response()->json([
                'success' => false,
                'message' => 'No vendor profile found. Please complete your vendor profile first.'
            ], 404);
        }
    
        $assignedEvents = EventVendor::with('event')
            ->where('vendor_id', $vendor->id)
            ->get();
    
        $totalAgreed = $assignedEvents->sum('agreed_amount');
        $totalPaid = $assignedEvents->sum('amount_paid');
        $totalPending = $assignedEvents->sum('balance_due');
    
        // Flatten event data for frontend consumption
        $events = $assignedEvents->map(function ($ev) {
            return [
                'id' => $ev->id,
                'event_name' => $ev->event?->event_name,
                'event_date' => $ev->event?->event_date,
                'assigned_service' => $ev->assigned_service,
                'agreed_amount' => $ev->agreed_amount,
                'amount_paid' => $ev->amount_paid,
                'balance_due' => $ev->balance_due,
            ];
        });
    
        return response()->json([
            'success' => true,
            'data' => [
                'profile' => [
                    'id' => $vendor->id,
                    'business_name' => $vendor->business_name,
                    'full_name' => $vendor->full_name,
                    'phone' => $vendor->phone,
                    'email' => $vendor->email,
                    'service_type' => $vendor->service_type,
                    'status' => $vendor->status,
                    'verification_status' => $vendor->status,
                    'rating' => $vendor->rating,
                ],
                'services' => $vendor->services,
                'documents' => $vendor->documents,
                'events' => $events,
                'financials' => [
                    'total_earnings' => $totalPaid,
                    'pending_balance' => $totalPending,
                    'total_agreed' => $totalAgreed,
                ],
            ],
        ]);
    }
}
