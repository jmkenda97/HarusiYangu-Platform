<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vendor;
use App\Models\VendorDocument;
use App\Models\VendorService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Response;
use Illuminate\Http\Exceptions\HttpResponseException;

class VendorDocumentController extends Controller
{
    /**
     * List authenticated vendor's documents with statuses.
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

        $documents = VendorDocument::with('service')
            ->where('vendor_id', $vendor->id)
            ->orderBy('uploaded_at', 'desc')
            ->get()
            ->map(function ($document) {
                // Add base64 data URI for immediate browser display (like profile photos)
                try {
                    $filePath = $document->file_url;
                    
                    // Remove leading /storage/ or storage/ if present
                    $filePath = preg_replace('/^\/?storage\//', '', $filePath);
                    
                    if (Storage::disk('public')->exists($filePath)) {
                        $fileContent = Storage::disk('public')->get($filePath);
                        $base64 = base64_encode($fileContent);
                        $document->file_url_full = 'data:' . $document->mime_type . ';base64,' . $base64;
                    } else {
                        $document->file_url_full = null;
                    }
                } catch (\Exception $e) {
                    $document->file_url_full = null;
                }
                
                return $document;
            });

        return response()->json([
            'success' => true,
            'data' => $documents
        ]);
    }

    /**
     * Upload a new document for the authenticated vendor.
     */
    public function store(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'document_type' => 'required|string|in:BUSINESS_LICENSE,BRELA_CERTIFICATE,TIN_CERTIFICATE,PORTFOLIO,INSURANCE,OTHER',
            'document_name' => 'nullable|string|max:255',
            'service_id' => 'nullable|exists:vendor_services,id',
        ], [
            'file.required' => 'A file is required.',
            'file.file' => 'The uploaded item must be a file.',
            'file.mimes' => 'File must be a PDF, JPG, JPEG, or PNG.',
            'file.max' => 'File size must not exceed 5MB.',
            'document_type.required' => 'Document type is required.',
            'document_type.in' => 'Invalid document type selected.',
            'document_name.required' => 'Document name is required.',
            'document_name.max' => 'Document name must not exceed 255 characters.',
            'service_id.exists' => 'The selected service does not exist.',
        ]);

        $vendor = Vendor::where('user_id', $request->user()->id)->first();

        if (!$vendor) {
            return response()->json([
                'success' => false,
                'message' => 'No vendor profile found.'
            ], 404);
        }

        // Authorize via policy
        $this->authorize('manageDocuments', $vendor);

        try {
            $service = $this->resolveOwnedService($request->service_id, $vendor->id);
            $file = $request->file('file');
            $filePath = Storage::disk('public')->putFile('vendor-documents', $file);

            $document = DB::transaction(function () use ($request, $vendor, $service, $file, $filePath) {
                return VendorDocument::create([
                    'id' => Str::uuid(),
                    'vendor_id' => $vendor->id,
                    'service_id' => $service?->id,
                    'document_type' => $request->document_type,
                    'document_name' => $request->document_name ?: $this->defaultDocumentName($request->document_type, $file->getClientOriginalName()),
                    'file_url' => $filePath,
                    'mime_type' => $file->getMimeType(),
                    'file_size' => $file->getSize(),
                    'verification_status' => 'PENDING',
                    'uploaded_at' => now(),
                ]);
            });

            if ($service) {
                $this->markServicePendingReview($service);
            }

            // Add base64 data URI to response (like profile photos)
            try {
                $fileContent = Storage::disk('public')->get($filePath);
                $base64 = base64_encode($fileContent);
                $document->file_url_full = 'data:' . $document->mime_type . ';base64,' . $base64;
            } catch (\Exception $e) {
                $document->file_url_full = null;
            }

            return response()->json([
                'success' => true,
                'message' => 'Document uploaded successfully',
                'data' => $document->load('service')
            ], 201);
        } catch (\Exception $e) {
            Log::error('Vendor Document Upload Failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload document: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a document - Only allowed if document is PENDING or REJECTED
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

        $document = VendorDocument::where('id', $id)
            ->where('vendor_id', $vendor->id)
            ->first();

        if (!$document) {
            return response()->json([
                'success' => false,
                'message' => 'Document not found.'
            ], 404);
        }

        // RESTRICTION: Cannot delete APPROVED documents
        if ($document->verification_status === 'APPROVED') {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete verified documents. Contact admin if you need to update this document.'
            ], 403);
        }

        // Authorize via policy
        $this->authorize('manageDocuments', $vendor);

        try {
            // Delete file from storage
            if ($document->file_url && Storage::disk('public')->exists($document->file_url)) {
                Storage::disk('public')->delete($document->file_url);
            }

            // Delete record
            $document->delete();

            return response()->json([
                'success' => true,
                'message' => 'Document deleted successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Vendor Document Deletion Failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete document: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update/Replace a document - For rejected documents or when vendor wants to update
     */
    public function update(Request $request, $id)
    {
        $vendor = Vendor::where('user_id', $request->user()->id)->first();

        if (!$vendor) {
            return response()->json([
                'success' => false,
                'message' => 'No vendor profile found.'
            ], 404);
        }

        $document = VendorDocument::where('id', $id)
            ->where('vendor_id', $vendor->id)
            ->first();

        if (!$document) {
            return response()->json([
                'success' => false,
                'message' => 'Document not found.'
            ], 404);
        }

        $request->validate([
            'file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'document_name' => 'sometimes|string|max:255',
            'document_type' => 'sometimes|string|in:BUSINESS_LICENSE,BRELA_CERTIFICATE,TIN_CERTIFICATE,PORTFOLIO,INSURANCE,OTHER',
            'service_id' => 'nullable|exists:vendor_services,id',
        ], [
            'file.file' => 'The uploaded item must be a file.',
            'file.mimes' => 'File must be a PDF, JPG, JPEG, or PNG.',
            'file.max' => 'File size must not exceed 5MB.',
        ]);

        // Authorize via policy
        $this->authorize('manageDocuments', $vendor);

        try {
            $service = $this->resolveOwnedService($request->has('service_id') ? $request->service_id : $document->service_id, $vendor->id);
            $previousServiceId = $document->service_id;
            $file = $request->file('file');

            $updateData = [
                'service_id' => $service?->id,
                'document_type' => $request->document_type ?? $document->document_type,
                'document_name' => $request->document_name ?? $document->document_name,
                'verification_status' => 'PENDING',
                'reviewed_by' => null,
                'reviewed_at' => null,
                'rejection_reason' => null,
            ];

            if ($file) {
                if ($document->file_url && Storage::disk('public')->exists($document->file_url)) {
                    Storage::disk('public')->delete($document->file_url);
                }

                $filePath = Storage::disk('public')->putFile('vendor-documents', $file);
                $updateData['file_url'] = $filePath;
                $updateData['mime_type'] = $file->getMimeType();
                $updateData['file_size'] = $file->getSize();
            }

            $document->update($updateData);

            if ($previousServiceId) {
                $this->markServicePendingReviewById($previousServiceId);
            }
            if ($service) {
                $this->markServicePendingReview($service);
            }

            // Add base64 data URI to response (like profile photos)
            try {
                if ($document->file_url && Storage::disk('public')->exists($document->file_url)) {
                    $fileContent = Storage::disk('public')->get($document->file_url);
                    $base64 = base64_encode($fileContent);
                    $document->file_url_full = 'data:' . $document->mime_type . ';base64,' . $base64;
                } else {
                    $document->file_url_full = null;
                }
            } catch (\Exception $e) {
                $document->file_url_full = null;
            }

            return response()->json([
                'success' => true,
                'message' => 'Document updated successfully. It will be reviewed again by admin.',
                'data' => $document->load('service')
            ]);
        } catch (\Exception $e) {
            Log::error('Vendor Document Update Failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update document: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Serve a file directly for browser display
     */
    public function serveFile($documentId)
    {
        try {
            $document = VendorDocument::findOrFail($documentId);
            
            // Fix file path - handle multiple path formats
            $filePath = $document->file_url;
            
            // Remove leading /storage/ if present
            if (strpos($filePath, '/storage/') === 0) {
                $filePath = substr($filePath, strlen('/storage/'));
            }
            
            // Remove leading storage/ if present
            if (strpos($filePath, 'storage/') === 0) {
                $filePath = substr($filePath, strlen('storage/'));
            }
            
            // Check if file exists
            if (!Storage::disk('public')->exists($filePath)) {
                return response()->json([
                    'success' => false,
                    'message' => 'File not found: ' . $filePath
                ], 404);
            }

            // Get file content
            $fileContent = Storage::disk('public')->get($filePath);
            $mimeType = $document->mime_type;
            
            // Convert to base64 data URI for browser display
            $base64 = base64_encode($fileContent);
            $dataUri = 'data:' . $mimeType . ';base64,' . $base64;

            return Response::make($dataUri, 200, [
                'Content-Type' => 'text/plain',
                'Cache-Control' => 'public, max-age=31536000',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to serve file: ' . $e->getMessage()
            ], 500);
        }
    }

    private function resolveOwnedService($serviceId, $vendorId): ?VendorService
    {
        if (!$serviceId) {
            return null;
        }

        $service = VendorService::where('id', $serviceId)
            ->where('vendor_id', $vendorId)
            ->first();

        if (!$service) {
            throw new HttpResponseException(response()->json([
                'success' => false,
                'message' => 'The selected service does not belong to your account.',
            ], 422));
        }

        return $service;
    }

    private function defaultDocumentName(string $documentType, string $originalName): string
    {
        return str_replace('_', ' ', $documentType) . ' - ' . $originalName;
    }

    private function markServicePendingReview(?VendorService $service): void
    {
        if (!$service) {
            return;
        }

        $service->update([
            'is_verified' => false,
            'is_available' => false,
            'verified_at' => null,
            'rejection_reason' => null,
        ]);
    }

    private function markServicePendingReviewById(?string $serviceId): void
    {
        if (!$serviceId) {
            return;
        }

        $service = VendorService::find($serviceId);
        if ($service) {
            $this->markServicePendingReview($service);
        }
    }
}
