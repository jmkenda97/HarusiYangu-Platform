<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VendorPayoutAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class VendorPayoutAccountController extends Controller
{
    /**
     * List all payout accounts for the authenticated vendor
     */
    public function index()
    {
        $user = auth()->user();
        $vendor = $user->vendor;

        if (!$vendor) {
            return $this->errorResponse('Vendor profile not found.', [], 404);
        }

        $accounts = VendorPayoutAccount::where('vendor_id', $vendor->id)
            ->orderBy('is_primary', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return $this->successResponse('Payout accounts fetched successfully.', $accounts);
    }

    /**
     * Add a new payout account (Bank or Mobile Money)
     */
    public function store(Request $request)
    {
        $user = auth()->user();
        $vendor = $user->vendor;

        if (!$vendor) {
            return $this->errorResponse('Vendor profile not found.', [], 404);
        }

        $request->validate([
            'account_type' => 'required|string|in:BANK,MOBILE_MONEY',
            'provider_name' => 'required|string|max:100', // e.g., CRDB, Vodacom, M-Pesa
            'account_number' => 'required|string|max:50',
            'account_name' => 'required|string|max:100', // Holder Name
            'branch_code' => 'nullable|string|max:20',
            'is_primary' => 'boolean'
        ]);

        DB::beginTransaction();
        try {
            // Check if this is the first account
            $isFirst = VendorPayoutAccount::where('vendor_id', $vendor->id)->count() === 0;
            $shouldBePrimary = $isFirst || $request->is_primary;

            if ($shouldBePrimary) {
                // Reset other primary accounts for this vendor
                VendorPayoutAccount::where('vendor_id', $vendor->id)->update(['is_primary' => false]);
            }

            $account = VendorPayoutAccount::create([
                'id' => (string) Str::uuid(),
                'vendor_id' => $vendor->id,
                'account_type' => $request->account_type,
                'provider_name' => $request->provider_name,
                'account_number' => $request->account_number,
                'account_name' => $request->account_name,
                'branch_code' => $request->branch_code,
                'is_primary' => $shouldBePrimary,
                'is_verified' => false
            ]);

            DB::commit();
            return $this->successResponse('Payout account added successfully.', $account, [], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to save account: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Set an account as the primary payout destination
     */
    public function setPrimary($id)
    {
        $user = auth()->user();
        $vendor = $user->vendor;
        $account = VendorPayoutAccount::where('id', $id)->where('vendor_id', $vendor->id)->firstOrFail();

        DB::beginTransaction();
        try {
            VendorPayoutAccount::where('vendor_id', $vendor->id)->update(['is_primary' => false]);
            $account->update(['is_primary' => true]);
            
            DB::commit();
            return $this->successResponse('Primary account updated.', $account);
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to update primary account.', [], 500);
        }
    }

    /**
     * Remove a payout account
     */
    public function destroy($id)
    {
        $user = auth()->user();
        $vendor = $user->vendor;
        $account = VendorPayoutAccount::where('id', $id)->where('vendor_id', $vendor->id)->firstOrFail();

        if ($account->is_primary) {
            return $this->errorResponse('Cannot delete primary account. Please set another account as primary first.', [], 422);
        }

        $account->delete();
        return $this->successResponse('Payout account removed successfully.');
    }
}
