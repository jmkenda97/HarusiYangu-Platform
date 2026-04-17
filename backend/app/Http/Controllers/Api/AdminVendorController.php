<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vendor;
use App\Models\VendorDocument;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use App\Mail\VendorStatusChange;
use App\Services\NotificationService;

class AdminVendorController extends Controller
{
    public function stats()
    {
        $user = auth()->user();
        if (!$user->hasRole('SUPER_ADMIN') && !$user->hasRole('ADMIN')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'vendors' => [
                    'total' => Vendor::count(),
                    'active' => Vendor::where('status', 'ACTIVE')->count(),
                    'pending' => Vendor::where('status', 'PENDING_APPROVAL')->count(),
                    'blacklisted' => Vendor::where('status', 'BLACKLISTED')->count(),
                ],
                'services' => [
                    'total' => \App\Models\VendorService::count(),
                    'verified' => \App\Models\VendorService::where('is_verified', true)->count(),
                    'pending' => \App\Models\VendorService::where('is_verified', false)->count(),
                ],
                'documents' => [
                    'total' => VendorDocument::count(),
                    'approved' => VendorDocument::where('verification_status', 'APPROVED')->count(),
                    'pending' => VendorDocument::where('verification_status', 'PENDING')->count(),
                    'rejected' => VendorDocument::where('verification_status', 'REJECTED')->count(),
                ]
            ]
        ]);
    }

    public function index(Request $request)
    {
        $user = auth()->user();
        if (!$user->hasRole('SUPER_ADMIN') && !$user->hasRole('ADMIN')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized. Admin access required.'], 403);
        }

        $query = Vendor::with(['user', 'services.documents', 'documents.service']); // Ensure documents are loaded

        if ($request->has('status') && $request->status) $query->where('status', $request->status);
        if ($request->has('service_type') && $request->service_type) $query->where('service_type', $request->service_type);
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('business_name', 'ilike', "%{$search}%")
                  ->orWhere('full_name', 'ilike', "%{$search}%")
                  ->orWhere('phone', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        $vendors = $query->orderBy('created_at', 'desc')->get();
        $vendors->each(function ($vendor) {
            // Service statistics
            $vendor->services_count = $vendor->services->count();
            $vendor->active_services_count = $vendor->services->where('is_verified', true)->where('is_available', true)->count();
            $vendor->pending_services_count = $vendor->services->where('is_verified', false)->count();
            $vendor->inactive_services_count = $vendor->services->where('is_available', false)->count();

            // Document statistics
            $vendor->documents_count = $vendor->documents->count();
            $vendor->pending_documents_count = $vendor->documents->where('verification_status', 'PENDING')->count();
            $vendor->approved_documents_count = $vendor->documents->where('verification_status', 'APPROVED')->count();
            $vendor->rejected_documents_count = $vendor->documents->where('verification_status', 'REJECTED')->count();
            
            // Speed Optimization: Removed base64 processing from list view. 
            // Previews will be handled by the 'show' method when a vendor is expanded.
        });

        return response()->json(['success' => true, 'data' => $vendors]);
    }

    public function show($id)
    {
        $user = auth()->user();
        if (!$user->hasRole('SUPER_ADMIN') && !$user->hasRole('ADMIN')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized. Admin access required.'], 403);
        }

        $vendor = Vendor::with(['user', 'services.documents', 'documents.reviewer', 'documents.service', 'eventVendors.event'])->find($id);
        if (!$vendor) return response()->json(['success' => false, 'message' => 'Vendor not found.'], 404);

        // Add base64 data URI to all documents for browser display
        $vendor->documents->each(function ($document) {
            try {
                $filePath = $document->file_url;

                // Remove leading /storage/ or storage/ if present
                $filePath = preg_replace('/^\/?storage\//', '', $filePath);

                if (Storage::disk('public')->exists($filePath)) {
                    $fileContent = \Storage::disk('public')->get($filePath);
                    $base64 = base64_encode($fileContent);
                    $document->file_url_full = 'data:' . $document->mime_type . ';base64,' . $base64;
                } else {
                    $document->file_url_full = null;
                }
            } catch (\Exception $e) {
                $document->file_url_full = null;
            }
        });

        return response()->json(['success' => true, 'data' => $vendor]);
    }

    public function destroy($id)
    {
        $user = auth()->user();
        if (!$user->hasRole('SUPER_ADMIN')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized. Super Admin access required.'], 403);
        }

        try {
            $vendor = Vendor::with('user')->find($id);
            if (!$vendor) return response()->json(['success' => false, 'message' => 'Vendor not found.'], 404);

            $associatedUser = $vendor->user;

            DB::transaction(function () use ($vendor, $associatedUser) {
                // Soft delete the vendor
                $vendor->delete();
                
                // Soft delete the user so they can't login normally
                if ($associatedUser) {
                    $associatedUser->delete();
                }
            });

            return response()->json([
                'success' => true, 
                'message' => 'Vendor and associated user account have been soft-deleted.'
            ]);
        } catch (\Exception $e) {
            Log::error('Vendor Deletion Failed: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to delete vendor.'], 500);
        }
    }

    public function approve($id)
    {
        $user = auth()->user();
        if (!$user->hasRole('SUPER_ADMIN') && !$user->hasRole('ADMIN')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        try {
            $vendor = Vendor::find($id);
            if (!$vendor) return response()->json(['success' => false, 'message' => 'Vendor not found.'], 404);
            if (!in_array($vendor->status, ['PENDING_APPROVAL', 'INACTIVE'])) {
                return response()->json(['success' => false, 'message' => 'Vendor cannot be approved.'], 422);
            }

            $vendor->update(['status' => 'ACTIVE']);

            // SEND NOTIFICATION
            if ($vendor->user) {
                NotificationService::notify(
                    $vendor->user,
                    'Vendor Account Approved!',
                    "Congratulations! Your vendor profile '{$vendor->business_name}' has been approved. You can now start managing your services and receiving inquiries.",
                    ['vendor_id' => $vendor->id, 'status' => 'ACTIVE']
                );
            }

            return response()->json(['success' => true, 'message' => 'Vendor approved successfully.', 'data' => $vendor]);
        } catch (\Exception $e) {
            Log::error('Vendor Approval Failed: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to approve vendor.'], 500);
        }
    }

    public function reject(Request $request, $id)
    {
        $user = auth()->user();
        if (!$user->hasRole('SUPER_ADMIN') && !$user->hasRole('ADMIN')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        $request->validate(['rejection_reason' => 'required|string|max:500']);

        try {
            $vendor = Vendor::find($id);
            if (!$vendor) return response()->json(['success' => false, 'message' => 'Vendor not found.'], 404);

            $reason = $request->rejection_reason;
            $vendor->update([
                'status' => 'INACTIVE',
                'notes' => ($vendor->notes ? $vendor->notes . "\n" : '') . 'Rejection Reason: ' . $reason
            ]);

            // SEND NOTIFICATION
            if ($vendor->user) {
                NotificationService::notify(
                    $vendor->user,
                    'Vendor Account Update Required',
                    "Your vendor registration for '{$vendor->business_name}' requires updates before it can be approved.\n\nReason: {$reason}\n\nPlease log in to your dashboard to make the necessary changes.",
                    ['vendor_id' => $vendor->id, 'status' => 'INACTIVE', 'rejection_reason' => $reason]
                );
            }

            return response()->json(['success' => true, 'message' => 'Vendor rejected successfully.', 'data' => $vendor]);
        } catch (\Exception $e) {
            Log::error('Vendor Rejection Failed: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to reject vendor.'], 500);
        }
        
    }

    public function block($id)
    {
        $user = auth()->user();
        if (!$user->hasRole('SUPER_ADMIN') && !$user->hasRole('ADMIN')) return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);

        try {
            $vendor = Vendor::find($id);
            if (!$vendor) return response()->json(['success' => false, 'message' => 'Vendor not found.'], 404);
            $vendor->update(['status' => 'BLACKLISTED']);
            return response()->json(['success' => true, 'message' => 'Vendor blocked successfully.', 'data' => $vendor]);
        } catch (\Exception $e) { return response()->json(['success' => false, 'message' => 'Failed.'], 500); }
    }

    public function unblock($id)
    {
        $user = auth()->user();
        if (!$user->hasRole('SUPER_ADMIN') && !$user->hasRole('ADMIN')) return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);

        try {
            $vendor = Vendor::where('status', 'BLACKLISTED')->find($id);
            if (!$vendor) return response()->json(['success' => false, 'message' => 'Vendor not found.'], 404);
            $vendor->update(['status' => 'ACTIVE']);
            return response()->json(['success' => true, 'message' => 'Vendor unblocked successfully.', 'data' => $vendor]);
        } catch (\Exception $e) { return response()->json(['success' => false, 'message' => 'Failed.'], 500); }
    }

    public function approveService($vendorId, $serviceId)
    {
        $user = auth()->user();
        if (!$user->hasRole('SUPER_ADMIN') && !$user->hasRole('ADMIN')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        try {
            $service = \App\Models\VendorService::with('documents')->where('vendor_id', $vendorId)->find($serviceId);
            if (!$service) return response()->json(['success' => false, 'message' => 'Service not found.'], 404);

            if ($service->documents->isEmpty()) {
                return response()->json(['success' => false, 'message' => 'This service has no linked verification documents.'], 422);
            }

            $unapprovedDocs = $service->documents->where('verification_status', '!=', 'APPROVED');
            if ($unapprovedDocs->isNotEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Approve all linked documents before approving this service.'
                ], 422);
            }

            $service->update([
                'is_verified' => true,
                'is_available' => true,
                'verified_at' => now(),
                'rejection_reason' => null
            ]);

            // NOTIFY VENDOR
            if ($service->vendor && $service->vendor->user) {
                NotificationService::notify(
                    $service->vendor->user,
                    'Service Verified & Live!',
                    "Your service '{$service->service_name}' has been verified and is now live on the platform catalog for hosts to book.",
                    ['service_id' => $service->id, 'vendor_id' => $vendorId, 'icon' => 'CheckCircle']
                );
            }

            return response()->json(['success' => true, 'message' => 'Service approved and activated.', 'data' => $service]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to approve service.'], 500);
        }
    }

    public function rejectService(Request $request, $vendorId, $serviceId)
    {
        $user = auth()->user();
        if (!$user->hasRole('SUPER_ADMIN') && !$user->hasRole('ADMIN')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        $request->validate(['rejection_reason' => 'required|string|max:500']);

        try {
            $service = \App\Models\VendorService::where('vendor_id', $vendorId)->find($serviceId);
            if (!$service) return response()->json(['success' => false, 'message' => 'Service not found.'], 404);

            $service->update([
                'is_verified' => false,
                'is_available' => false,
                'verified_at' => null,
                'rejection_reason' => $request->rejection_reason
            ]);

            // NOTIFY VENDOR
            if ($service->vendor && $service->vendor->user) {
                NotificationService::notify(
                    $service->vendor->user,
                    'Service Verification Rejected',
                    "Verification for your service '{$service->service_name}' was rejected.\n\nReason: {$request->rejection_reason}\n\nPlease update the service or provide better documentation.",
                    ['service_id' => $service->id, 'vendor_id' => $vendorId]
                );
            }

            return response()->json(['success' => true, 'message' => 'Service rejected.', 'data' => $service]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to reject service.'], 500);
        }
    }

    public function reviewDocument(Request $request, $vendorId, $docId)
    {
        $user = auth()->user();
        if (!$user->hasRole('SUPER_ADMIN') && !$user->hasRole('ADMIN')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        $request->validate([
            'status' => 'required|in:APPROVED,REJECTED',
            'rejection_reason' => 'required_if:status,REJECTED|string|max:500'
        ]);

        try {
            $document = VendorDocument::where('vendor_id', $vendorId)->find($docId);
            if (!$document) return response()->json(['success' => false, 'message' => 'Document not found.'], 404);

            $updateData = [
                'verification_status' => $request->status,
                'reviewed_by' => auth()->id(),
                'reviewed_at' => now(),
            ];

            if ($request->status === 'REJECTED') {
                $updateData['rejection_reason'] = $request->rejection_reason;
            } else {
                $updateData['rejection_reason'] = null;
            }

            $document->update($updateData);

            if ($document->service_id) {
                $document->service()->update([
                    'is_verified' => false,
                    'is_available' => false,
                    'verified_at' => null,
                ]);
            }

            // NOTIFY VENDOR ON REJECTION
            if ($request->status === 'REJECTED' && $document->vendor && $document->vendor->user) {
                NotificationService::notify(
                    $document->vendor->user,
                    'Document Verification Rejected',
                    "Your document '{$document->document_name}' was rejected during verification.\n\nReason: {$request->rejection_reason}\n\nPlease upload a valid document to proceed.",
                    ['document_id' => $document->id, 'vendor_id' => $vendorId]
                );
            }

            return response()->json(['success' => true, 'message' => 'Document reviewed successfully.', 'data' => $document]);
        } catch (\Exception $e) {
            Log::error('Document Review Failed: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to review document.'], 500);
        }
    }
}
