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
    Schema::table('users', function (Blueprint $table) {
        $table->string('first_name')->nullable()->change();
        $table->string('last_name')->nullable()->change(); // Do it for last name too if needed
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
