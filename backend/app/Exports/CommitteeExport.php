<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use App\Models\EventCommitteeMember;

class CommitteeExport implements FromCollection, WithHeadings
{
    protected $eventId;

    public function __construct($eventId)
    {
        $this->eventId = $eventId;
    }

    public function collection()
    {
        return EventCommitteeMember::where('event_id', $this->eventId)
            ->with('user')
            ->get()
            ->map(function ($member) {
                return [
                    // Use the user name if available, otherwise placeholder
                    $member->user ? $member->user->full_name : 'Unknown User',
                    str_replace('_', ' ', $member->committee_role),
                    $member->user ? $member->user->phone : '-',
                    $member->user ? $member->user->email : '-',
                    $member->can_manage_budget ? 'Yes' : 'No',
                    $member->can_manage_contributions ? 'Yes' : 'No',
                    $member->created_at->format('Y-m-d'),
                ];
            });
    }

    public function headings(): array
    {
        return [
            'Name', 'Role', 'Phone', 'Email', 'Can Manage Budget', 'Can Manage Contributions', 'Joined At'
        ];
    }
}