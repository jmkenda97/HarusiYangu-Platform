<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. VENDOR PAYOUT ACCOUNTS (Bank & Mobile Money)
        Schema::create('vendor_payout_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('vendor_id')->index();
            $table->enum('account_type', ['BANK', 'MOBILE_MONEY']);
            $table->string('provider_name'); // e.g., CRDB, Vodacom, M-Pesa
            $table->string('account_number');
            $table->string('account_name');
            $table->string('branch_code')->nullable();
            $table->string('swift_code')->nullable();
            $table->boolean('is_verified')->default(false);
            $table->uuid('verified_by')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->boolean('is_primary')->default(false);
            $table->jsonb('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('vendor_id')->references('id')->on('vendors')->onDelete('cascade');
            $table->foreign('verified_by')->references('id')->on('users')->onDelete('set null');
        });

        // 2. WITHDRAWAL REQUESTS
        Schema::create('withdrawal_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('vendor_id')->index();
            $table->uuid('payout_account_id');
            $table->decimal('amount', 14, 2);
            $table->decimal('fee_amount', 14, 2)->default(0);
            $table->string('currency', 3)->default('TZS');
            $table->enum('status', ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'])->default('PENDING');
            $table->string('transaction_reference')->nullable(); // External ID from Bank/M-Pesa
            $table->text('admin_notes')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->uuid('processed_by')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestamps();

            $table->foreign('vendor_id')->references('id')->on('vendors')->onDelete('cascade');
            $table->foreign('payout_account_id')->references('id')->on('vendor_payout_accounts')->onDelete('restrict');
            $table->foreign('processed_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('withdrawal_requests');
        Schema::dropIfExists('vendor_payout_accounts');
    }
};
