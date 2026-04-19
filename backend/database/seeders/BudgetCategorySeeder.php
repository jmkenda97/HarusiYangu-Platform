<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BudgetCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Catering', 'desc' => 'Food, drinks, and catering services'],
            ['name' => 'Decoration', 'desc' => 'Venue decoration, flowers, and setup'],
            ['name' => 'MC', 'desc' => 'Master of Ceremonies and program directors'],
            ['name' => 'Photography', 'desc' => 'Professional photography services'],
            ['name' => 'Videography', 'desc' => 'Professional video coverage and editing'],
            ['name' => 'Sound & Music', 'desc' => 'DJ, PA system, and live bands'],
            ['name' => 'Transport', 'desc' => 'Car hire and guest transportation'],
            ['name' => 'Tents & Chairs', 'desc' => 'Outdoor setup and rentals'],
            ['name' => 'Cake', 'desc' => 'Wedding cake and desert services'],
            ['name' => 'Makeup & Salon', 'desc' => 'Beauty and grooming services'],
            ['name' => 'Security', 'desc' => 'Event security and bouncers'],
            ['name' => 'Venue', 'desc' => 'Hall booking and ground fees'],
            ['name' => 'Printing', 'desc' => 'Cards, banners, and stationery'],
            ['name' => 'Attire', 'desc' => 'Clothing, jewelry, and accessories'],
            ['name' => 'Gifts', 'desc' => 'Gifts for family and guests'],
            ['name' => 'Other', 'desc' => 'Miscellaneous event costs'],
        ];

        // Clear existing categories to avoid duplicates
        DB::statement('SET CONSTRAINTS ALL DEFERRED');
        DB::table('budget_categories')->delete();

        foreach ($categories as $cat) {
            DB::table('budget_categories')->insert([
                'id' => (string) Str::uuid(),
                'category_name' => $cat['name'],
                'description' => $cat['desc'],
                'created_at' => now(),
            ]);
        }
    }
}
