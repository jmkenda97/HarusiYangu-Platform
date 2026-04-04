<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;

class GuestsTemplateExport implements
    FromCollection,
    WithHeadings,
    WithMapping,
    WithColumnFormatting,
    ShouldAutoSize
{
    /**
     * Sample Data
     */
    public function collection()
    {
        return collect([
            [
                'full_name' => 'John Doe',
                'phone' => '+255712345678',
                'email' => 'john@example.com',
                'relationship' => 'Friend',
                'is_vip' => 'No'
            ]
        ]);
    }

    public function headings(): array
    {
        return [
            'Full Name',
            'Phone',
            'Email',
            'Relationship',
            'Is VIP'
        ];
    }

    /**
     * Map data to rows
     */
    public function map($row): array
    {
        return [
            $row['full_name'],
            (string) $row['phone'], // force string
            $row['email'],
            $row['relationship'],
            $row['is_vip']
        ];
    }

    /**
     * Format columns
     */
    public function columnFormats(): array
    {
        return [
            'B' => '@', // Phone column as text
        ];
    }
}
