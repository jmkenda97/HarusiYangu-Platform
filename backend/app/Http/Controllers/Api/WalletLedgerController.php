<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\WalletLedgerEntry;
use Illuminate\Http\Request;

class WalletLedgerController extends Controller
{
    /**
     * Get the financial statement (ledger) for an event
     */
    public function index(Request $request, $eventId)
    {
        $event = Event::findOrFail($eventId);

        // Security Check
        if ($event->owner_user_id !== auth()->id() && auth()->user()->role !== 'SUPER_ADMIN') {
            // Check if committee member with treasurer/chairperson permissions
            $membership = \App\Models\EventCommitteeMember::where('event_id', $eventId)
                ->where('user_id', auth()->id())
                ->first();

            if (!$membership || !in_array($membership->committee_role, ['CHAIRPERSON', 'TREASURER'])) {
                return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
            }
        }

        $ledger = WalletLedgerEntry::where('event_id', $eventId)
            ->with('creator')
            ->orderBy('entry_date', 'desc')
            ->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $ledger
        ]);
    }
}
