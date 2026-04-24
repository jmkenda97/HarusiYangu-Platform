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
        if ($request->filled('search')) {
            $query->where('description', 'like', '%' . $request->search . '%');
        }

        // 2. Filter by Entry Type (CREDIT/DEBIT)
        if ($request->filled('type')) {
            $query->where('entry_type', $request->type);
        }

        // 3. Filter by Month/Year (e.g. 2026-04)
        if ($request->filled('month')) {
            $query->whereMonth('entry_date', substr($request->month, 5, 2))
                  ->whereYear('entry_date', substr($request->month, 0, 4));
        }

        // 4. Professional Date Range Filter (Between Date X and Date Y)
        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('entry_date', [$request->start_date, $request->end_date]);
        }

        $ledger = $query->orderBy('entry_date', 'desc')            ->paginate($request->get('per_page', 15));

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

        // --- ADVANCED VENDOR FILTERS BROO ---

        // 1. Search by Description or Reference
        if ($request->filled('search')) {
            $searchTerm = '%' . $request->search . '%';
            
            $query->where(function($q) use ($searchTerm) {
                $q->where('description', 'like', $searchTerm)
                  ->orWhereHas('vendorPayment', function($pq) use ($searchTerm) {
                      $pq->where('transaction_reference', 'like', $searchTerm);
                  });
            });
        }

        // 2. Filter by Month
        if ($request->filled('month')) {
            $query->whereMonth('entry_date', substr($request->month, 5, 2))
                  ->whereYear('entry_date', substr($request->month, 0, 4));
        }

        // 3. Professional Date Range Filter
        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('entry_date', [$request->start_date, $request->end_date]);
        }

        // 4. Filter by Service Type
        if ($request->filled('service_type')) {
            $query->whereHas('vendorPayment.booking', function($q) use ($request) {
                $q->where('assigned_service', 'like', '%' . $request->service_type . '%');
            });
        }

        $ledger = $query->orderBy('entry_date', 'desc')
            ->paginate($request->get('per_page', 15));

        return $this->paginatedResponse($ledger, \App\Http\Resources\WalletLedgerResource::class, 'Earnings history fetched successfully');
    }
}
