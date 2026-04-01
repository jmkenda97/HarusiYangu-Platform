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
            'amount' => 'required|numeric|gt:0',
            'payment_method' => ['required', Rule::in(['CASH', 'MPESA', 'AIRTEL_MONEY', 'BANK_TRANSFER', 'OTHER'])],
            'transaction_reference' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $pledge = ContributionPledge::where('id', $request->pledge_id)
            ->where('event_id', $event->id)
            ->firstOrFail();

        try {
            DB::transaction(function () use ($request, $event, $pledge, $user) {
                $receipt = 'REC-' . strtoupper(Str::random(8));

                // FIX: Explicitly cast IDs to String to prevent UUID/Integer mismatch errors
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
                    'recorded_by' => (string) $user->id, // <--- CRITICAL FIX
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Payment recorded successfully. Balances updated.'
            ], 201);
        } catch (\Exception $e) {
            // Log for debugging
            \Log::error('Payment Error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to record payment: ' . $e->getMessage()
            ], 500);
        }
    }
}
