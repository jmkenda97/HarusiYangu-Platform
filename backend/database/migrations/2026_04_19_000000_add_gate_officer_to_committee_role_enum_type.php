<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // For PostgreSQL, we need to add the value to the existing enum type
        DB::statement("ALTER TYPE committee_role ADD VALUE IF NOT EXISTS 'GATE_OFFICER'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Note: PostgreSQL does not support removing values from an enum easily.
        // Since this is a safe addition, we leave it in down().
    }
};
