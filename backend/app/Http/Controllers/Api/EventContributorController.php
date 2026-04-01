<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventContact;
use App\Models\ContributionPledge;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class EventContributorController extends Controller
{


    /**
     * Add a new Contact and Pledge to an Event
     */
    public function store(Request $request, $eventId)
    {
        $event = Event::findOrFail($eventId);

        $user = $request->user();
        $canManage = $event->owner_user_id === $user->id ||
            $event->committee()->where('user_id', $user->id)->where('can_manage_contributions', true)->exists();

        if (!$canManage) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        // UPDATED VALIDATION: We allow 'contact_id' to be passed if converting a guest
        $request->validate([
            'contact_id' => 'nullable|uuid|exists:event_contacts,id', // <--- NEW
            'full_name' => 'required_without:contact_id|string|max:255',
            'phone' => 'required_without:contact_id|string|max:20',
            'email' => 'nullable|string|max:255',
            'pledge_amount' => 'required|numeric|min:0',
            'is_vip' => 'boolean',
        ]);

        try {
            DB::transaction(function () use ($request, $event, $user) {
                $contactId = null;

                // LOGIC: If contact_id is provided, use existing guest. Otherwise, create new.
                if ($request->contact_id) {
                    // Use existing guest
                    $contact = EventContact::where('id', $request->contact_id)
                        ->where('event_id', $event->id)
                        ->firstOrFail();

                    // Check if they already have a pledge
                    if ($contact->pledge) {
                        throw new \Exception("This guest already has an active pledge.");
                    }

                    $contactId = $contact->id;
                    // Optional: Update their VIP status if changed
                    if ($request->has('is_vip')) {
                        $contact->update(['is_vip' => $request->is_vip]);
                    }
                } else {
                    // Create new contact (Original flow)
                    $contact = EventContact::create([
                        'id' => Str::uuid(),
                        'event_id' => $event->id,
                        'full_name' => $request->full_name,
                        'phone' => $request->phone,
                        'email' => $request->email,
                        'is_vip' => $request->is_vip ?? false,
                        'is_contributor' => true,
                        'created_by' => $user->id,
                    ]);
                    $contactId = $contact->id;
                }

                // Create Pledge
                ContributionPledge::create([
                    'id' => Str::uuid(),
                    'event_id' => $event->id,
                    'contact_id' => $contactId,
                    'pledge_amount' => $request->pledge_amount,
                    'amount_paid' => 0,
                    'outstanding_amount' => $request->pledge_amount,
                    'contribution_status' => 'PLEDGED',
                    'assigned_by' => $user->id,
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Pledge added successfully'
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }
}
