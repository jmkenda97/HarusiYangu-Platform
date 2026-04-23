<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vendor_payments', function (Blueprint $table) {
            $table->string('proof_attachment_url')->nullable()->after('transaction_reference');
            $table->boolean('is_vendor_confirmed')->default(false)->after('is_released');
            $table->timestamp('vendor_confirmed_at')->nullable()->after('is_vendor_confirmed');
        });
    }

    public function down(): void
    {
        Schema::table('vendor_payments', function (Blueprint $table) {
            $table->dropColumn(['proof_attachment_url', 'is_vendor_confirmed', 'vendor_confirmed_at']);
        });
    }
};
