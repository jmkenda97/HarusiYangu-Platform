<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\WalletLedgerEntry;
use Illuminate\Http\Request;

class WalletLedgerController extends Controller
{
    /**
     * Get the financial statement (Transaction History) for an event (Host/Committee View)
     */
    public function index(Request $request, $eventId)
    {
        $event = Event::findOrFail($eventId);

        // Security Check
        if ($event->owner_user_id !== auth()->id() && auth()->user()->role !== 'SUPER_ADMIN') {
            $membership = \App\Models\EventCommitteeMember::where('event_id', $eventId)
                ->where('user_id', auth()->id())
                ->first();

            if (!$membership || !in_array($membership->committee_role, ['CHAIRPERSON', 'TREASURER'])) {
                return $this->errorResponse('Unauthorized.', [], 403);
            }
        }

        $query = WalletLedgerEntry::where('event_id', $eventId)->with(['creator']);

        // --- ADVANCED FILTERS BROO ---
        
        // 1. Search by Description
        if ($request->has('search')) {
            $query->where('description', 'like', '%' . $request->search . '%');
        }

        // 2. Filter by Entry Type (CREDIT/DEBIT)
        if ($request->has('type')) {
            $query->where('entry_type', $request->type);
        }

        // 3. Filter by Month/Year (e.g. 2026-04)
        if ($request->has('month')) {
            $query->whereMonth('entry_date', substr($request->month, 5, 2))
                  ->whereYear('entry_date', substr($request->month, 0, 4));
        }

        // 4. Filter by specific Week
        if ($request->has('week')) {
            $query->whereBetween('entry_date', [
                now()->startOfWeek()->addWeeks($request->week - 1), 
                now()->endOfWeek()->addWeeks($request->week - 1)
            ]);
        }

        $ledger = $query->orderBy('entry_date', 'desc')
            ->paginate($request->get('per_page', 15));

        return $this->paginatedResponse($ledger, \App\Http\Resources\WalletLedgerResource::class, 'Transaction history fetched successfully');
    }

    /**
     * Get the financial statement for a Vendor (all events they are involved in)
     */
    public function vendorIndex(Request $request)
    {
        $vendor = auth()->user()->vendor;
        if (!$vendor) {
            return $this->errorResponse('Vendor profile not found.', [], 404);
        }

        // We find ledger entries where the source is a VENDOR_PAYMENT to THIS vendor
        $query = WalletLedgerEntry::where('source_type', 'VENDOR_PAYMENT')
            ->whereHas('vendorPayment', function($q) use ($vendor) {
                $q->where('vendor_id', $vendor->id);
            })
            ->with(['creator', 'vendorPayment', 'vendorPayment.event']);

        // Filter by Month
        if ($request->has('month')) {
            $query->whereMonth('entry_date', substr($request->month, 5, 2))
                  ->whereYear('entry_date', substr($request->month, 0, 4));
        }

        // Filter by Service Type (Searching through the Payment -> Booking)
        if ($request->has('service_type')) {
            $query->whereHas('vendorPayment.booking', function($q) use ($request) {
                $q->where('assigned_service', 'like', '%' . $request->service_type . '%');
            });
        }

        $ledger = $query->orderBy('entry_date', 'desc')
            ->paginate($request->get('per_page', 15));

        return $this->paginatedResponse($ledger, \App\Http\Resources\WalletLedgerResource::class, 'Earnings history fetched successfully');
    }
}
