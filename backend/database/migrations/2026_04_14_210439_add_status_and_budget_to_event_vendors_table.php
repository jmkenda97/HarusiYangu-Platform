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
        Schema::table('event_vendors', function (Blueprint $table) {
            $table->string('status')->default('INQUIRY'); // INQUIRY, QUOTED, ACCEPTED, REJECTED, CANCELLED, COMPLETED
            $table->uuid('budget_item_id')->nullable();
            $table->decimal('last_quote_amount', 15, 2)->nullable();
            
            $table->foreign('budget_item_id')->references('id')->on('event_budget_items')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('event_vendors', function (Blueprint $table) {
            $table->dropForeign(['budget_item_id']);
            $table->dropColumn(['status', 'budget_item_id', 'last_quote_amount']);
        });
    }
};
