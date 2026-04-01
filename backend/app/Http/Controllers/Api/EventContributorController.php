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

        // Authorization: Only Owner or Committee with 'can_manage_contributions'
        $user = $request->user();
        // (Add strict Spatie checks here in production, keeping logic simple for Phase 2)
        $canManage = $event->owner_user_id === $user->id ||
                     $event->committee()->where('user_id', $user->id)->where('can_manage_contributions', true)->exists();

        if (!$canManage) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'full_name' => 'required|string|max:255',
            'phone' => 'required|string|max:20',
            'email' => 'nullable|email|max:255',
            'pledge_amount' => 'required|numeric|min:0',
            'is_vip' => 'boolean',
        ]);

        try {
            DB::transaction(function () use ($request, $event, $user) {
                // 1. Create Contact
                $contact = EventContact::create([
                    'id' => Str::uuid(),
                    'event_id' => $event->id,
                    'full_name' => $request->full_name,
                    'phone' => $request->phone,
                    'email' => $request->email,
                    'is_vip' => $request->is_vip ?? false,
                    'is_contributor' => true, // Automatically true since we are pledging
                    'created_by' => $user->id,
                ]);

                // 2. Create Pledge linked to Contact
                ContributionPledge::create([
                    'id' => Str::uuid(),
                    'event_id' => $event->id,
                    'contact_id' => $contact->id,
                    'pledge_amount' => $request->pledge_amount,
                    'amount_paid' => 0,
                    'outstanding_amount' => $request->pledge_amount, // Initially equals pledge
                    'contribution_status' => 'PLEDGED',
                    'assigned_by' => $user->id,
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Contributor and Pledge added successfully'
            ], 201);

        } catch (\Exception $e) {
            // Likely a duplicate phone constraint violation
            return response()->json([
                'success' => false,
                'message' => 'Error adding contributor. Phone number might already exist for this event.',
                'error' => $e->getMessage()
            ], 400);
        }
    }
}
