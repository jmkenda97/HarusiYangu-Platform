<?php

namespace App\Exports;

use App\Models\EventContact;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;

class GuestsExport implements FromQuery, WithHeadings, WithMapping, ShouldAutoSize
{
    protected $eventId;

    public function __construct($eventId)
    {
        $this->eventId = $eventId;
    }

    public function query()
    {
        return EventContact::query()
            ->where('event_id', $this->eventId)
            ->with('pledge'); // Load pledge relation to see if they are contributors
    }

    public function headings(): array
    {
        return [
            'Name',
            'Phone',
            'Email',
            'Relationship',
            'Is VIP',
            'Pledged Amount',
            'Status'
        ];
    }

    public function map($contact): array
    {
        return [
            $contact->full_name,
            $contact->phone,
            $contact->email ?? '-',
            $contact->relationship_label ?? '-',
            $contact->is_vip ? 'Yes' : 'No',
            $contact->pledge ? number_format($contact->pledge->pledge_amount) : '0',
            $contact->pledge ? 'Contributor' : 'Guest'
        ];
    }
}
