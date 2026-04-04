<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use App\Models\EventBudgetItem;

class BudgetExport implements FromCollection, WithHeadings
{
    protected $eventId;

    public function __construct($eventId)
    {
        $this->eventId = $eventId;
    }

    public function collection()
    {
        return EventBudgetItem::where('event_id', $this->eventId)
            ->with('category')
            ->get()
            ->map(function ($item) {
                return [
                    $item->item_name,
                    $item->category ? $item->category->category_name : 'Uncategorized',
                    $item->estimated_cost,
                    $item->actual_cost ?? 0,
                    $item->estimated_cost - ($item->actual_cost ?? 0),
                    $item->budget_item_status,
                    $item->description ?? '-',
                ];
            });
    }

    public function headings(): array
    {
        return [
            'Item Name', 'Category', 'Estimated Cost', 'Actual Cost', 'Variance', 'Status', 'Description'
        ];
    }
}