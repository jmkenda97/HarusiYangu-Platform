<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContributionPayment;
use App\Models\ContributionPledge;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class EventPaymentController extends Controller
{
    /**
     * Record a Contribution Payment
     */
    public function store(Request $request, $eventId)
    {
        $event = Event::findOrFail($eventId);

        // --- CHANGE: Use Policy Check ---
        $this->authorize('manageContributions', $event);

        $request->validate([
            'pledge_id' => 'required|uuid|exists:contribution_pledges,id',
            'amount' => 'required|numeric|gt:0',
            'payment_method' => ['required', Rule::in(['CASH', 'MPESA', 'AIRTEL_MONEY', 'BANK_TRANSFER', 'OTHER'])],
            'transaction_reference' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $pledge = ContributionPledge::where('id', $request->pledge_id)
            ->where('event_id', $event->id)
            ->firstOrFail();

        try {
            DB::transaction(function () use ($request, $event, $pledge) {
                $receipt = 'REC-' . strtoupper(Str::random(8));

                ContributionPayment::create([
                    'id' => Str::uuid(),
                    'event_id' => (string) $event->id,
                    'pledge_id' => (string) $pledge->id,
                    'contact_id' => (string) $pledge->contact_id,
                    'amount' => $request->amount,
                    'payment_method' => $request->payment_method,
                    'payment_status' => 'SUCCESS',
                    'transaction_reference' => $request->transaction_reference,
                    'internal_receipt_number' => $receipt,
                    'paid_at' => now(),
                    'confirmed_at' => now(),
                    'notes' => $request->notes,
                    'recorded_by' => (string) auth()->id(),
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Payment recorded successfully. Balances updated.'
            ], 201);
        } catch (\Exception $e) {
            \Log::error('Payment Error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to record payment: ' . $e->getMessage()
            ], 500);
        }
    }
}
