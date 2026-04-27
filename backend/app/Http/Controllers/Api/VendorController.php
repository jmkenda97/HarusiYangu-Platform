<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vendor;
use App\Models\VendorService;
use App\Models\VendorDocument;
use App\Models\EventVendor;
use App\Http\Requests\Api\StoreVendorRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class VendorController extends Controller
{
    /**
     * Get the authenticated user's vendor profile.
     */
    public function getProfile(Request $request)
    {
        $vendor = Vendor::with(['services', 'documents'])
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$vendor) {
            return $this->errorResponse('No vendor profile found. Please create your vendor profile first.', [], 404);
        }

        return $this->successResponse('Vendor profile fetched successfully', new \App\Http\Resources\VendorResource($vendor));
    }

    /**
     * Create a new vendor profile for the authenticated user.
     */
    public function createProfile(StoreVendorRequest $request)
    {
        $user = $request->user();

        if ($user->role !== 'VENDOR') {
            return $this->errorResponse('Only vendor accounts can create a vendor profile.', [], 403);
        }

        $existingVendor = Vendor::where('user_id', $user->id)->first();
        if ($existingVendor) {
            return $this->errorResponse('You already have a vendor profile.', [], 400);
        }

        try {
            $vendor = DB::transaction(function () use ($request, $user) {
                return Vendor::create([
                    'id' => Str::uuid(),
                    'user_id' => $user->id,
                    'business_name' => $request->business_name,
                    'full_name' => $request->full_name,
                    'phone' => $request->phone,
                    'email' => $request->email,
                    'address' => $request->address,
                    'service_type' => $request->service_type,
                    'status' => 'PENDING_APPROVAL',
                ]);
            });

            return $this->successResponse('Vendor profile created successfully', new \App\Http\Resources\VendorResource($vendor), [], 201);
        } catch (\Exception $e) {
            Log::error('Vendor Profile Creation Failed: ' . $e->getMessage());
            return $this->errorResponse('Failed to create vendor profile: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Update the authenticated user's vendor profile.
     */
    public function updateProfile(StoreVendorRequest $request)
    {
        $vendor = Vendor::where('user_id', $request->user()->id)->first();

        if (!$vendor) {
            return $this->errorResponse('No vendor profile found.', [], 404);
        }

        $this->authorize('manageProfile', $vendor);

        try {
            $vendor->update([
                'business_name' => $request->business_name,
                'full_name' => $request->full_name,
                'phone' => $request->phone,
                'email' => $request->email,
                'address' => $request->address,
                'service_type' => $request->service_type,
            ]);

            return $this->successResponse('Vendor profile updated successfully', new \App\Http\Resources\VendorResource($vendor));
        } catch (\Exception $e) {
            Log::error('Vendor Profile Update Failed: ' . $e->getMessage());
            return $this->errorResponse('Failed to update vendor profile: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Get the vendor dashboard with profile, services, documents, and payment summary.
     */
    public function getDashboard(Request $request)
    {
        $user = $request->user();
        $vendor = Vendor::with(['services', 'documents'])
            ->where('user_id', $user->id)
            ->first();

        if (!$vendor) {
            return $this->errorResponse('No vendor profile found. Please complete your vendor profile first.', [], 404);
        }

        $assignedEvents = EventVendor::with(['event', 'event.owner'])
            ->where('vendor_id', $vendor->id)
            ->get();

        $confirmedDates = $assignedEvents->where('status', 'ACCEPTED')
            ->pluck('event.event_date')
            ->filter()
            ->map(fn($date) => $date instanceof \DateTimeInterface ? $date->format('Y-m-d') : (string)$date)
            ->toArray();

        $confirmedEvents = $assignedEvents->where('status', 'ACCEPTED')->map(function ($ev) {
            return [
                'id' => $ev->id,
                'event_name' => $ev->event?->event_name,
                'event_date' => $ev->event?->event_date,
                'venue_name' => $ev->event?->venue_name,
                'venue_address' => $ev->event?->venue_address,
                'host_name' => $ev->event?->owner?->first_name . ' ' . $ev->event?->owner?->last_name,
                'host_phone' => $ev->event?->owner?->phone,
                'assigned_service' => $ev->assigned_service,
                'agreed_amount' => $ev->agreed_amount,
                'amount_paid' => $ev->amount_paid,
                'balance_due' => $ev->balance_due,
            ];
        })->values();

        $inquiries = $assignedEvents->whereIn('status', ['INQUIRY', 'QUOTED'])->map(function ($ev) use ($confirmedDates) {
            $eventDate = $ev->event?->event_date;
            $formattedDate = $eventDate instanceof \DateTimeInterface ? $eventDate->format('Y-m-d') : (string)$eventDate;
            $hasConflict = in_array($formattedDate, $confirmedDates);

            return [
                'id' => $ev->id,
                'event_id' => $ev->event_id,
                'event_name' => $ev->event?->event_name,
                'event_date' => $ev->event?->event_date,
                'has_conflict' => $hasConflict,
                'host_name' => $ev->event?->owner?->first_name . ' ' . $ev->event?->owner?->last_name,
                'host_phone' => $ev->event?->owner?->phone,
                'assigned_service' => $ev->assigned_service,
                'status' => $ev->status,
                'last_quote_amount' => $ev->last_quote_amount,
                'contract_notes' => $ev->contract_notes,
                'metadata' => $ev->metadata,
            ];
        })->values();

        $wallet = \App\Models\VendorWallet::where('vendor_id', $vendor->id)->first();

        $payoutAccounts = \App\Models\VendorPayoutAccount::where('vendor_id', $vendor->id)
            ->get();

        $payments = \App\Models\VendorPayment::with(['event'])
            ->where('vendor_id', $vendor->id)
            ->orderBy('payment_date', 'desc')
            ->limit(10)
            ->get();

        return $this->successResponse('Vendor dashboard fetched successfully', [
            'profile' => new \App\Http\Resources\VendorResource($vendor),
            'services' => $vendor->services,
            'documents' => $vendor->documents,
            'events' => $confirmedEvents,
            'inquiries' => $inquiries,
            'payments' => $payments,
            'wallet' => [
                'available_balance' => $wallet ? $wallet->available_balance : 0,
                'pending_balance' => $wallet ? $wallet->pending_balance : 0,
                'total_earnings' => $wallet ? $wallet->total_earnings : 0,
            ],
            'payout_accounts' => $payoutAccounts,
        ]);
    }
}
