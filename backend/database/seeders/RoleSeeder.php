<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        
        // 1. Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // 2. Create Roles exactly as defined in your Schema
        $roles = ['SUPER_ADMIN', 'ADMIN', 'HOST', 'COMMITTEE_MEMBER', 'GATE_OFFICER', 'VENDOR', 'CONTRIBUTOR'];

        foreach ($roles as $roleName) {
            Role::firstOrCreate(['name' => $roleName]);
        }

        // 3. BACKFILL: Assign SUPER_ADMIN to your existing account
        // We find the user by phone and assign the role
        $superAdminPhone = '0714870313'; // Your phone number
        $user = User::where('phone', $superAdminPhone)->first();

        if ($user) {
            $user->assignRole('SUPER_ADMIN');
            $this->command->info("✅ Super Admin role assigned to: " . $user->phone);
        } else {
            $this->command->warn("⚠️ User with phone $superAdminPhone not found for backfill.");
        }

        // 4. Assign HOST to the other user if exists
        $hostPhone = '+25571870313';
        $hostUser = User::where('phone', $hostPhone)->first();
        if ($hostUser) {
            $hostUser->assignRole('HOST');
            $this->command->info("✅ Host role assigned to: " . $hostUser->phone);
        }
    }
}
