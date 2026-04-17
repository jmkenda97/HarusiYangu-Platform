<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vendor;
use App\Models\VendorService;
use App\Models\VendorDocument;
use App\Http\Requests\Api\StoreVendorServiceRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class VendorServiceController extends Controller
{
    /**
     * List authenticated vendor's services.
     */
    public function index(Request $request)
    {
        $vendor = Vendor::where('user_id', $request->user()->id)->first();

        if (!$vendor) {
            return response()->json([
                'success' => false,
                'message' => 'No vendor profile found.'
            ], 404);
        }

        $services = VendorService::with(['documents' => function ($query) {
                $query->orderBy('uploaded_at', 'desc');
            }])
            ->where('vendor_id', $vendor->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $services
        ]);
    }

    /**
     * Create a new service for the authenticated vendor.
     */
    public function store(StoreVendorServiceRequest $request)
    {
        $vendor = Vendor::where('user_id', $request->user()->id)->first();

        if (!$vendor) {
            return response()->json([
                'success' => false,
                'message' => 'No vendor profile found.'
            ], 404);
        }

        // Authorize via policy
        $this->authorize('manageServices', $vendor);

        try {
            $service = DB::transaction(function () use ($request, $vendor) {
                $service = VendorService::create([
                    'id' => Str::uuid(),
                    'vendor_id' => $vendor->id,
                    'service_name' => $request->service_name,
                    'service_type' => $request->service_type,
                    'description' => $request->description,
                    'min_price' => $request->min_price,
                    'max_price' => $request->max_price,
                    'price_unit' => $request->price_unit,
                    'is_available' => false, // INACTIVE until admin verifies
                    'is_verified' => false, // NOT VERIFIED yet
                ]);

                // UPLOAD DOCUMENTS FOR THIS SPECIFIC SERVICE
                if ($request->hasFile('business_license')) {
                    $this->createServiceDocument($vendor->id, $service->id, 'BUSINESS_LICENSE', $request->file('business_license'));
                }
                if ($request->hasFile('brela_certificate')) {
                    $this->createServiceDocument($vendor->id, $service->id, 'BRELA_CERTIFICATE', $request->file('brela_certificate'));
                }
                if ($request->hasFile('tin_certificate')) {
                    $this->createServiceDocument($vendor->id, $service->id, 'TIN_CERTIFICATE', $request->file('tin_certificate'));
                }

                return $service->load(['documents' => function ($query) {
                    $query->orderBy('uploaded_at', 'desc');
                }]);
            });

            // NOTIFY ADMINS
            \App\Services\NotificationService::notifyAdmins(
                'New Service Verification Required',
                "Vendor '{$vendor->business_name}' has added a new service '{$service->service_name}' that needs verification.",
                ['vendor_id' => $vendor->id, 'service_id' => $service->id, 'action' => 'review_required']
            );

            return response()->json([
                'success' => true,
                'message' => 'Service created successfully. Please wait for admin verification.',
                'data' => $service
            ], 201);
        } catch (\Exception $e) {
            Log::error('Vendor Service Creation Failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create service: ' . $e->getMessage()
            ], 500);
        }
    }

    private function createServiceDocument($vendorId, $serviceId, $type, $file)
    {
        try {
            $path = $file->store('vendor-documents', 'public');
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
            Log::error('Failed to save service document: ' . $e->getMessage());
        }
    }

    /**
     * Update an existing service - ALLOWED ONLY FOR UNVERIFIED SERVICES
     * Vendors can edit services that are not yet verified by admin
     */
    public function update(StoreVendorServiceRequest $request, $id)
    {
        $vendor = Vendor::where('user_id', $request->user()->id)->first();

        if (!$vendor) {
            return response()->json([
                'success' => false,
                'message' => 'No vendor profile found.'
            ], 404);
        }

        $service = VendorService::where('id', $id)
            ->where('vendor_id', $vendor->id)
            ->first();

        if (!$service) {
            return response()->json([
                'success' => false,
                'message' => 'Service not found.'
            ], 404);
        }

        // Authorize via policy
        $this->authorize('manageServices', $vendor);

        try {
            $service->update([
                'service_name' => $request->service_name,
                'description' => $request->description,
                'min_price' => $request->min_price,
                'max_price' => $request->max_price,
                'price_unit' => $request->price_unit,
                // Any vendor edit sends the service back to admin review.
                'is_verified' => false,
                'is_available' => false,
                'verified_at' => null,
                'rejection_reason' => null,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Service updated successfully. It has been sent back for admin review.',
                'data' => $service->load(['documents' => function ($query) {
                    $query->orderBy('uploaded_at', 'desc');
                }])
            ]);
        } catch (\Exception $e) {
            Log::error('Vendor Service Update Failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update service: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a service - ALLOWED ONLY FOR UNVERIFIED SERVICES
     * Vendors can delete services that are not yet verified
     */
    public function destroy(Request $request, $id)
    {
        $vendor = Vendor::where('user_id', $request->user()->id)->first();

        if (!$vendor) {
            return response()->json([
                'success' => false,
                'message' => 'No vendor profile found.'
            ], 404);
        }

        $service = VendorService::where('id', $id)
            ->where('vendor_id', $vendor->id)
            ->first();

        if (!$service) {
            return response()->json([
                'success' => false,
                'message' => 'Service not found.'
            ], 404);
        }

        // BLOCK deletion if service is already verified
        if ($service->is_verified) {
            return response()->json([
                'success' => false,
                'message' => 'Verified services cannot be deleted. Contact admin support if removal is needed.'
            ], 403);
        }

        // Authorize via policy
        $this->authorize('manageServices', $vendor);

        try {
            $service->delete();

            return response()->json([
                'success' => true,
                'message' => 'Service deleted successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Vendor Service Deletion Failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete service: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ADMIN: Approve or reject a vendor service
     */
    public function adminReview(Request $request, $id)
    {
        $user = auth()->user();
        if (!$user->hasRole('SUPER_ADMIN') && !$user->hasRole('ADMIN')) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Admin access required.'
            ], 403);
        }

        $request->validate([
            'status' => 'required|in:approved,rejected',
            'rejection_reason' => 'required_if:status,rejected|string|max:500',
        ]);

        try {
            $service = VendorService::findOrFail($id);

            if ($request->status === 'approved') {
                $pendingOrRejectedDocs = VendorDocument::where('service_id', $service->id)
                    ->where('verification_status', '!=', 'APPROVED')
                    ->count();

                if ($pendingOrRejectedDocs > 0) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Approve all linked documents before approving this service.',
                    ], 422);
                }

                $service->update([
                    'is_verified' => true,
                    'is_available' => true,
                    'verified_at' => now(),
                    'rejection_reason' => null,
                ]);
                $message = 'Service approved and is now active.';
            } else {
                $service->update([
                    'is_verified' => false,
                    'is_available' => false,
                    'verified_at' => null,
                    'rejection_reason' => $request->rejection_reason,
                ]);
                $message = 'Service rejected and deactivated.';
            }

            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => $service
            ]);
        } catch (\Exception $e) {
            Log::error('Service Review Failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to review service.'
            ], 500);
        }
    }
}
