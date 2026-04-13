<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vendor;
use App\Models\VendorDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

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

        $documents = VendorDocument::where('vendor_id', $vendor->id)
            ->orderBy('uploaded_at', 'desc')
            ->get();

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
            'document_type' => 'required|string|in:BUSINESS_LICENSE,TIN_CERTIFICATE,PORTFOLIO,INSURANCE,OTHER',
            'document_name' => 'required|string|max:255',
        ], [
            'file.required' => 'A file is required.',
            'file.file' => 'The uploaded item must be a file.',
            'file.mimes' => 'File must be a PDF, JPG, JPEG, or PNG.',
            'file.max' => 'File size must not exceed 5MB.',
            'document_type.required' => 'Document type is required.',
            'document_type.in' => 'Invalid document type selected.',
            'document_name.required' => 'Document name is required.',
            'document_name.max' => 'Document name must not exceed 255 characters.',
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
            $file = $request->file('file');
            $filePath = Storage::disk('public')->putFile('vendor-documents', $file);

            $document = DB::transaction(function () use ($request, $vendor, $file, $filePath) {
                return VendorDocument::create([
                    'id' => Str::uuid(),
                    'vendor_id' => $vendor->id,
                    'document_type' => $request->document_type,
                    'document_name' => $request->document_name,
                    'file_url' => $filePath,
                    'mime_type' => $file->getMimeType(),
                    'file_size' => $file->getSize(),
                    'verification_status' => 'PENDING',
                    'uploaded_at' => now(),
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Document uploaded successfully',
                'data' => $document
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
     * Delete a document.
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
}
