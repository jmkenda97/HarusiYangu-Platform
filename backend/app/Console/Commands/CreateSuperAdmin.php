<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CreateSuperAdmin extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'make:super-admin {phone} {--email=} {--password=}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create a new Super Admin user';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $phone = $this->argument('phone');
        $email = $this->option('email') ?? 'admin@harusiyangu.com';
        $password = $this->option('password') ?? 'Admin@2026';

        $this->info("Creating Super Admin with phone: $phone");

        $user = User::where('phone', $phone)->first();

        if ($user) {
            $this->warn("User with phone $phone already exists. Assigning SUPER_ADMIN role.");
        } else {
            $user = User::create([
                'id' => (string) Str::uuid(),
                'first_name' => 'Super',
                'last_name' => 'Admin',
                'phone' => $phone,
                'email' => $email,
                'password_hash' => Hash::make($password),
                'role' => 'SUPER_ADMIN',
                'status' => 'ACTIVE',
                'onboarding_completed' => true,
                'is_phone_verified' => true,
                'is_email_verified' => true,
            ]);
            $this->info("Created new user.");
        }

        // Ensure SUPER_ADMIN role exists
        $role = Role::firstOrCreate(['name' => 'SUPER_ADMIN']);
        
        $user->assignRole($role);

        $this->info("✅ Super Admin role assigned successfully.");
        $this->table(['Field', 'Value'], [
            ['Phone', $phone],
            ['Email', $email],
            ['Password', $password],
        ]);
    }
}
