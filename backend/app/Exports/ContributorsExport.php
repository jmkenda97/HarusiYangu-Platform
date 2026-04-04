<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use App\Models\EventContact;

class ContributorsExport implements FromCollection, WithHeadings
{
    protected $eventId;

    public function __construct($eventId)
    {
        $this->eventId = $eventId;
    }

    public function collection()
    {
        return EventContact::where('event_id', $this->eventId)
            ->whereHas('pledge')
            ->with('pledge')
            ->get()
            ->map(function ($contact) {
                return [
                    $contact->full_name,
                    $contact->phone,
                    $contact->email ?? '-',
                    $contact->pledge->pledge_amount,
                    $contact->pledge->amount_paid,
                    $contact->pledge->outstanding_amount,
                    $contact->pledge->contribution_status,
                    $contact->created_at->format('Y-m-d'),
                ];
            });
    }

    public function headings(): array
    {
        return [
            'Name', 'Phone', 'Email', 'Pledged Amount', 'Paid Amount', 'Outstanding', 'Status', 'Created At'
        ];
    }
}