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
        Schema::create('message_logs', function (Blueprint $blueprint) {
            $blueprint->uuid('id')->primary();
            $blueprint->uuid('sender_id')->nullable();
            $blueprint->uuid('receiver_id');
            $blueprint->string('type'); // EMAIL, SMS, WHATSAPP, SYSTEM
            $blueprint->string('recipient'); // Email address or phone number
            $blueprint->string('subject')->nullable();
            $blueprint->text('content');
            $blueprint->string('status')->default('SENT'); // SENT, FAILED, PENDING
            $blueprint->timestamp('sent_at')->useCurrent();
            
            $blueprint->foreign('sender_id')->references('id')->on('users')->onDelete('set null');
            $blueprint->foreign('receiver_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('message_logs');
    }
};
