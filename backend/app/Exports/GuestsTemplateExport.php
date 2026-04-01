<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

class GuestsTemplateExport implements FromArray, WithHeadings
{
    // We return an empty array, or one sample row
    public function array(): array
    {
        return [
            ['John Doe', '+255712345678', 'john@example.com', 'Friend', 'No']
        ];
    }

    public function headings(): array
    {
        return [
            'Full Name',
            'Phone',
            'Email',
            'Relationship', // e.g. Aunt, Colleague
            'Is VIP' // Yes or No
        ];
    }
}
