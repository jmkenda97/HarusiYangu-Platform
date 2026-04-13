<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vendor;
use App\Models\VendorService;
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

        $services = VendorService::where('vendor_id', $vendor->id)
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
                return VendorService::create([
                    'id' => Str::uuid(),
                    'vendor_id' => $vendor->id,
                    'service_name' => $request->service_name,
                    'service_type' => $request->service_type,
                    'description' => $request->description,
                    'min_price' => $request->min_price,
                    'max_price' => $request->max_price,
                    'price_unit' => $request->price_unit,
                    'is_available' => true,
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Service created successfully',
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

    /**
     * Update an existing service.
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
                'service_type' => $request->service_type,
                'description' => $request->description,
                'min_price' => $request->min_price,
                'max_price' => $request->max_price,
                'price_unit' => $request->price_unit,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Service updated successfully',
                'data' => $service
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
     * Delete a service.
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
}
