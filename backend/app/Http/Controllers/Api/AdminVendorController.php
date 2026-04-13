<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vendor;
use App\Models\VendorDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AdminVendorController extends Controller
{
    /**
     * List all vendors with eager-loaded relationships.
     * Supports filtering by status, service_type, and search.
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        if (!$user->hasRole('SUPER_ADMIN') && !$user->hasRole('ADMIN')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized. Admin access required.'], 403);
        }

        $query = Vendor::with(['user', 'services', 'documents']);

        // Filter by status
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Filter by service_type
        if ($request->has('service_type') && $request->service_type) {
            $query->where('service_type', $request->service_type);
        }

        // Search by business_name or full_name
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('business_name', 'like', "%{$search}%")
                  ->orWhere('full_name', 'like', "%{$search}%");
            });
        }

        $vendors = $query->orderBy('created_at', 'desc')->get();

        // Add counts for each vendor
        $vendors->each(function ($vendor) {
            $vendor->services_count = $vendor->services->count();
            $vendor->documents_count = $vendor->documents->count();
        });

        return response()->json([
            'success' => true,
            'data' => $vendors
        ]);
    }

    /**
     * Show a single vendor with all relationships loaded.
     */
    public function show($id)
    {
        $user = auth()->user();
        if (!$user->hasRole('SUPER_ADMIN') && !$user->hasRole('ADMIN')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized. Admin access required.'], 403);
        }

        $vendor = Vendor::with([
            'user',
            'services',
            'documents.reviewer',
            'eventVendors.event'
        ])->find($id);

        if (!$vendor) {
            return response()->json([
                'success' => false,
                'message' => 'Vendor not found.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $vendor
        ]);
    }

    /**
     * Approve a vendor (change status to ACTIVE).
     */
    public function approve($id)
    {
        $user = auth()->user();
        if (!$user->hasRole('SUPER_ADMIN') && !$user->hasRole('ADMIN')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized. Admin access required.'], 403);
        }

        try {
            $vendor = Vendor::find($id);

            if (!$vendor) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vendor not found.'
                ], 404);
            }

            if (!in_array($vendor->status, ['PENDING_APPROVAL', 'INACTIVE'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vendor cannot be approved. Current status: ' . $vendor->status
                ], 422);
            }

            $vendor->update(['status' => 'ACTIVE']);

            return response()->json([
                'success' => true,
                'message' => 'Vendor approved successfully.',
                'data' => $vendor
            ]);
        } catch (\Exception $e) {
            Log::error('Vendor Approval Failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to approve vendor: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject a vendor (change status to INACTIVE with reason).
     */
    public function reject(Request $request, $id)
    {
        $user = auth()->user();
        if (!$user->hasRole('SUPER_ADMIN') && !$user->hasRole('ADMIN')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized. Admin access required.'], 403);
        }

        $request->validate([
            'rejection_reason' => 'required|string|max:500'
        ]);

        try {
            $vendor = Vendor::find($id);

            if (!$vendor) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vendor not found.'
                ], 404);
            }

            $vendor->update([
                'status' => 'INACTIVE',
                'notes' => ($vendor->notes ? $vendor->notes . "\n" : '') . 'Rejection Reason: ' . $request->rejection_reason
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Vendor rejected successfully.',
                'data' => $vendor
            ]);
        } catch (\Exception $e) {
            Log::error('Vendor Rejection Failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to reject vendor: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Block a vendor (change status to BLACKLISTED).
     */
    public function block($id)
    {
        $user = auth()->user();
        if (!$user->hasRole('SUPER_ADMIN') && !$user->hasRole('ADMIN')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized. Admin access required.'], 403);
        }

        try {
            $vendor = Vendor::find($id);

            if (!$vendor) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vendor not found.'
                ], 404);
            }

            $vendor->update(['status' => 'BLACKLISTED']);

            return response()->json([
                'success' => true,
                'message' => 'Vendor blocked successfully.',
                'data' => $vendor
            ]);
        } catch (\Exception $e) {
            Log::error('Vendor Block Failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to block vendor: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Unblock a vendor (change status from BLACKLISTED to ACTIVE).
     */
    public function unblock($id)
    {
        $user = auth()->user();
        if (!$user->hasRole('SUPER_ADMIN') && !$user->hasRole('ADMIN')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized. Admin access required.'], 403);
        }

        try {
            $vendor = Vendor::where('status', 'BLACKLISTED')->find($id);

            if (!$vendor) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vendor not found or not blacklisted.'
                ], 404);
            }

            $vendor->update(['status' => 'ACTIVE']);

            return response()->json([
                'success' => true,
                'message' => 'Vendor unblocked successfully.',
                'data' => $vendor
            ]);
        } catch (\Exception $e) {
            Log::error('Vendor Unblock Failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to unblock vendor: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Review a vendor document (approve or reject).
     */
    public function reviewDocument(Request $request, $vendorId, $docId)
    {
        $user = auth()->user();
        if (!$user->hasRole('SUPER_ADMIN') && !$user->hasRole('ADMIN')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized. Admin access required.'], 403);
        }

        $request->validate([
            'status' => 'required|in:APPROVED,REJECTED',
            'rejection_reason' => 'required_if:status,REJECTED|string|max:500'
        ]);

        try {
            $document = VendorDocument::where('vendor_id', $vendorId)->find($docId);

            if (!$document) {
                return response()->json([
                    'success' => false,
                    'message' => 'Document not found or does not belong to this vendor.'
                ], 404);
            }

            $updateData = [
                'verification_status' => $request->status,
                'reviewed_by' => auth()->id(),
                'reviewed_at' => now(),
            ];

            if ($request->status === 'REJECTED') {
                $updateData['rejection_reason'] = $request->rejection_reason;
            }

            $document->update($updateData);

            return response()->json([
                'success' => true,
                'message' => 'Document reviewed successfully.',
                'data' => $document
            ]);
        } catch (\Exception $e) {
            Log::error('Document Review Failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to review document: ' . $e->getMessage()
            ], 500);
        }
    }
}
