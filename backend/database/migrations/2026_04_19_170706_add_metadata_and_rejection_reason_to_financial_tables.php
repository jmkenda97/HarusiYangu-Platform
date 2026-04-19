<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('contribution_payments', function (Blueprint $table) {
            $table->jsonb('metadata')->nullable();
        });

        Schema::table('vendor_payments', function (Blueprint $table) {
            $table->jsonb('metadata')->nullable();
        });

        Schema::table('event_vendors', function (Blueprint $table) {
            $table->jsonb('metadata')->nullable();
            $table->text('rejection_reason')->nullable();
        });

        Schema::table('wallet_ledger_entries', function (Blueprint $table) {
            $table->jsonb('metadata')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contribution_payments', function (Blueprint $table) {
            $table->dropColumn('metadata');
        });

        Schema::table('vendor_payments', function (Blueprint $table) {
            $table->dropColumn('metadata');
        });

        Schema::table('event_vendors', function (Blueprint $table) {
            $table->dropColumn(['metadata', 'rejection_reason']);
        });

        Schema::table('wallet_ledger_entries', function (Blueprint $table) {
            $table->dropColumn('metadata');
        });
    }
};
