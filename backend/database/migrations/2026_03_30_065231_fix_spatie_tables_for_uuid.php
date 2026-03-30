<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Drop the existing incorrect tables
        Schema::dropIfExists('model_has_roles');
        Schema::dropIfExists('model_has_permissions');
        Schema::dropIfExists('role_has_permissions');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');

        // 2. Recreate Roles Table (Standard)
        Schema::create('roles', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()')); // <--- ADDED DEFAULT
            $table->string('name');
            $table->string('guard_name')->default('web');
            $table->timestamps();
        });

        Schema::create('permissions', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()')); // <--- ADDED DEFAULT
            $table->string('name');
            $table->string('guard_name')->default('web');
            $table->timestamps();
        });

        // 4. Create Model_Has_Roles (FIXED: UUID for model_id)
        Schema::create('model_has_roles', function (Blueprint $table) {
            $table->uuid('role_id'); // UUID because we made roles UUID
            $table->uuid('model_id'); // <--- THE FIX: UUID instead of unsignedBigInteger

            $table->string('model_type');
            $table->foreign('role_id')->references('id')->on('roles')->onDelete('cascade');
            $table->primary(['role_id', 'model_id', 'model_type']);
        });

        // 5. Create Model_Has_Permissions (FIXED: UUID for model_id)
        Schema::create('model_has_permissions', function (Blueprint $table) {
            $table->uuid('permission_id'); // UUID because we made permissions UUID
            $table->uuid('model_id'); // <--- THE FIX: UUID instead of unsignedBigInteger

            $table->string('model_type');
            $table->foreign('permission_id')->references('id')->on('permissions')->onDelete('cascade');
            $table->primary(['permission_id', 'model_id', 'model_type']);
        });

        // 6. Create Role_Has_Permissions
        Schema::create('role_has_permissions', function (Blueprint $table) {
            $table->uuid('permission_id');
            $table->uuid('role_id');
            $table->foreign('permission_id')->references('id')->on('permissions')->onDelete('cascade');
            $table->foreign('role_id')->references('id')->on('roles')->onDelete('cascade');
            $table->primary(['permission_id', 'role_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('model_has_roles');
        Schema::dropIfExists('model_has_permissions');
        Schema::dropIfExists('role_has_permissions');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');
    }
};
