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
        Schema::create('vendor_wallets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('vendor_id')->unique();
            $table->decimal('total_earnings', 15, 2)->default(0);
            $table->decimal('pending_balance', 15, 2)->default(0); // For milestones not yet cleared
            $table->decimal('available_balance', 15, 2)->default(0);
            $table->timestamps();

            $table->foreign('vendor_id')->references('id')->on('vendors')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vendor_wallets');
    }
};
