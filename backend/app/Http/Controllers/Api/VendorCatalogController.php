<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vendor;
use App\Models\VendorService;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Builder;

class VendorCatalogController extends Controller
{
    /**
     * List all ACTIVE (admin-approved) vendors for browsing.
     * Supports filtering by service_type, search, and price range.
     */
    public function index(Request $request)
    {
        $query = Vendor::with(['services' => function ($q) {
            $q->where('is_available', true);
        }])
            ->where('status', 'ACTIVE');

        // Filter by service_type (vendor's primary type OR any of their services)
        if ($request->has('service_type') && $request->service_type) {
            $serviceType = $request->service_type;
            $query->where(function (Builder $q) use ($serviceType) {
                $q->where('service_type', $serviceType)
                    ->orWhereHas('services', function (Builder $sq) use ($serviceType) {
                        $sq->where('service_type', $serviceType)
                            ->where('is_available', true);
                    });
            });
        }

        // Search by business_name or full_name
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function (Builder $q) use ($search) {
                $q->where('business_name', 'ILIKE', "%{$search}%")
                    ->orWhere('full_name', 'ILIKE', "%{$search}%");
            });
        }

        // Filter by price range (services within min/max price)
        if ($request->has('min_price') && $request->min_price !== null) {
            $minPrice = $request->min_price;
            $query->whereHas('services', function (Builder $q) use ($minPrice) {
                $q->where('is_available', true)
                    ->where('min_price', '>=', $minPrice);
            });
        }

        if ($request->has('max_price') && $request->max_price !== null) {
            $maxPrice = $request->max_price;
            $query->whereHas('services', function (Builder $q) use ($maxPrice) {
                $q->where('is_available', true)
                    ->where('max_price', '<=', $maxPrice);
            });
        }

        // Order by rating DESC, then business_name ASC
        $vendors = $query->orderBy('rating', 'desc')
            ->orderBy('business_name', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $vendors
        ]);
    }

    /**
     * Show a single ACTIVE vendor's full profile.
     * Includes available services and APPROVED documents only.
     */
    public function show($id)
    {
        $vendor = Vendor::with([
            'services' => function ($q) {
                $q->where('is_available', true);
            },
            'documents' => function ($q) {
                $q->where('verification_status', 'APPROVED');
            }
        ])
            ->where('status', 'ACTIVE')
            ->find($id);

        if (!$vendor) {
            return response()->json([
                'success' => false,
                'message' => 'Vendor not found or not available'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $vendor
        ]);
    }
}
