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
        Schema::table('vendor_payments', function (Blueprint $table) {
            $table->string('milestone')->nullable(); // DEPOSIT, INTERIM, FINAL, CUSTOM
            $table->decimal('milestone_percentage', 5, 2)->nullable(); // 20.00, 50.00, 30.00
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vendor_payments', function (Blueprint $table) {
            $table->dropColumn(['milestone', 'milestone_percentage']);
        });
    }
};
