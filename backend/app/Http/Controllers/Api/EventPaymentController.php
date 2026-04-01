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
     * This triggers the Database Triggers (update_pledge_payment_totals, update_event_wallet_after_contribution)
     */
    public function store(Request $request, $eventId)
    {
        $event = Event::findOrFail($eventId);

        // Authorization
        $user = $request->user();
        $canManage = $event->owner_user_id === $user->id ||
                     $event->committee()->where('user_id', $user->id)->where('can_manage_contributions', true)->exists();

        if (!$canManage) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'pledge_id' => 'required|uuid|exists:contribution_pledges,id',
            'amount' => 'required|numeric|gt:0', // Greater than 0
            'payment_method' => ['required', Rule::in(['CASH', 'MPESA', 'AIRTEL_MONEY', 'BANK_TRANSFER', 'OTHER'])],
            'transaction_reference' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $pledge = ContributionPledge::where('id', $request->pledge_id)
                                    ->where('event_id', $event->id)
                                    ->firstOrFail();

        try {
            DB::transaction(function () use ($request, $event, $pledge, $user) {
                // Generate internal receipt number
                $receipt = 'REC-' . strtoupper(Str::random(8));

                ContributionPayment::create([
                    'id' => Str::uuid(),
                    'event_id' => $event->id,
                    'pledge_id' => $pledge->id,
                    'contact_id' => $pledge->contact_id,
                    'amount' => $request->amount,
                    'payment_method' => $request->payment_method,
                    'payment_status' => 'SUCCESS', // MANUAL RECORDING = SUCCESS IMMEDIATELY
                    'transaction_reference' => $request->transaction_reference,
                    'internal_receipt_number' => $receipt,
                    'paid_at' => now(),
                    'confirmed_at' => now(),
                    'notes' => $request->notes,
                    'recorded_by' => $user->id,
                ]);

                // TRIGGER LOGIC:
                // The PostgreSQL Trigger 'trg_update_pledge_after_payment_insert' will fire NOW.
                // It will update:
                // 1. contribution_pledges.amount_paid
                // 2. contribution_pledges.outstanding_amount
                // 3. contribution_pledges.contribution_status
                // 4. event_wallets.current_balance
            });

            return response()->json([
                'success' => true,
                'message' => 'Payment recorded successfully. Balances updated.'
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to record payment: ' . $e->getMessage()
            ], 500);
        }
    }
}
