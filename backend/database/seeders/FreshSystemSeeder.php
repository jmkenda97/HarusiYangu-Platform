<!--  --><?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class FreshSystemSeeder extends Seeder
{
    public function run(): void
    {
        // 1. DISABLE FOREIGN KEY CHECKS
        DB::statement('SET CONSTRAINTS ALL DEFERRED');

        // 2. TRUNCATE ALL TABLES IN ORDER
        $tables = [
            'message_logs',
            'notifications',
            'vendor_payments',
            'vendor_documents',
            'vendor_services',
            'vendor_wallets',
            'vendors',
            'event_committee_members',
            'contribution_payments',
            'contribution_pledges',
            'event_contacts',
            'event_budget_items',
            'event_wallets',
            'events',
            'user_sessions',
            'personal_access_tokens',
            'otp_verifications',
            'model_has_roles',
            'model_has_permissions',
            'users'
        ];

        foreach ($tables as $table) {
            if (DB::getSchemaBuilder()->hasTable($table)) {
                DB::table($table)->delete();
            }
        }

        // 3. CREATE FRESH SUPER ADMIN
        $admin = User::create([
            'id' => (string) Str::uuid(),
            'first_name' => 'Super',
            'last_name' => 'Admin',
            'phone' => '0714870313',
            'email' => 'admin@harusiyangu.com',
            'password_hash' => Hash::make('Admin@2026'), // Temporary professional password
            'role' => 'SUPER_ADMIN',
            'status' => 'ACTIVE',
            'onboarding_completed' => true,
            'is_phone_verified' => true,
            'is_email_verified' => true,
        ]);

        // Assign Spatie Role
        $admin->assignRole('SUPER_ADMIN');

        echo "\n==========================================\n";
        echo " SYSTEM WIPED & INITIALIZED SUCCESSFULLY \n";
        echo "==========================================\n";
        echo " Email: admin@harusiyangu.com\n";
        echo " Phone: 0714870313\n";
        echo " Pass:  Admin@2026\n";
        echo "==========================================\n";
    }
}
