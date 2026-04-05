<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Define Permissions used in EventCommitteeController
        $permissions = [
            // Budget Permissions
            'view-event-budget',
            'edit-event-budget',

            // Guest/Contributor Permissions
            'view-event-guests',
            'edit-event-guests',

            // Contribution Permissions
            'view-event-contributions',
            'record-event-payments',

            // Vendor Permissions
            'view-event-vendors',
            'manage-event-vendors',

            // Committee Permissions
            'view-event-committee',
            'manage-event-committee',

            // Gate Officer Permissions
            'scan-event-qr',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web',
            ]);
        }

        $this->command->info('✅ HarusiYangu Permissions seeded successfully.');
    }
}
