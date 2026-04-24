<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventBudgetItem;
use App\Models\BudgetCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use App\Exports\BudgetExport;
use Maatwebsite\Excel\Facades\Excel;
use App\Services\NotificationService;

class EventBudgetController extends Controller
{
    public function index(Request $request, $eventId)
    {
        $event = Event::findOrFail($eventId);

        // --- CHANGE: Use Policy Check ---
        //$this->authorize('viewBudget', $event);

        $items = EventBudgetItem::where('event_id', $eventId)
            ->with(['category', 'vendorAssignment']) // Load vendorAssignment to check status
            ->orderBy('created_at', 'desc')
            ->get();

        // --- AUTO-CORRECTION BRAIN: Sync Status with Financial Reality ---
        foreach ($items as $item) {
            $contract = $item->vendorAssignment;
            if ($contract) {
                $newStatus = $item->budget_item_status;

                if ($contract->status === 'ACCEPTED') {
                    $newStatus = ($contract->amount_paid > 0) ? 'IN_PROGRESS' : 'APPROVED';
                } elseif ($contract->status === 'COMPLETED') {
                    $newStatus = 'PAID';
                }

                // Only update if different to save performance
                if ($newStatus !== $item->budget_item_status) {
                    $item->update(['budget_item_status' => $newStatus]);
                }
            }
        }

        // Also fetch categories for the form
        $categories = BudgetCategory::all();

        return $this->successResponse('Budget items fetched successfully', [
            'items' => $items,
            'categories' => $categories
        ]);
    }

    public function store(Request $request, $eventId)
    {
        $event = Event::findOrFail($eventId);
        $user = $request->user();

        // --- CHANGE: Use Policy Check ---
        $this->authorize('viewBudget', $event);

        $request->validate([
            'category_id' => 'required|uuid|exists:budget_categories,id',
            'item_name' => 'required|string|max:255',
            'estimated_cost' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'priority_level' => 'integer|between:1,5',
        ]);

        try {
            $item = EventBudgetItem::create([
                'id' => Str::uuid(),
                'event_id' => $event->id,
                'category_id' => $request->category_id,
                'item_name' => $request->item_name,
                'description' => $request->description,
                'estimated_cost' => $request->estimated_cost,
                'actual_cost' => 0,
                'variance_amount' => 0,
                'budget_item_status' => 'PLANNED',
                'priority_level' => $request->priority_level ?? 3,
            ]);

            // NOTIFY HOST
            NotificationService::notify(
                $event->owner,
                "Budget Updated",
                "A new budget item '{$item->item_name}' has been added to '{$event->event_name}'.",
                [
                    'icon' => 'FileText', 
                    'event_id' => $event->id, 
                    'link' => "/events/{$event->id}?tab=budget"
                ],
                auth()->user()
            );

            return $this->successResponse('Budget item added', $item, [], 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), [], 500);
        }
    }

    public function update(Request $request, $eventId, $id)
    {
        $item = EventBudgetItem::where('id', $id)->where('event_id', $eventId)->firstOrFail();
        $event = $item->event;

        // --- CHANGE: Use Policy Check ---
        $this->authorize('viewBudget', $event);

        $request->validate([
            'category_id' => 'sometimes|required|uuid|exists:budget_categories,id',
            'item_name' => 'sometimes|required|string|max:255',
            'estimated_cost' => 'sometimes|required|numeric|min:0',
            'description' => 'nullable|string',
            'budget_item_status' => 'sometimes|required|in:PLANNED,APPROVED,IN_PROGRESS,PAID,CANCELLED',
        ]);

        $item->update($request->only(['category_id', 'item_name', 'estimated_cost', 'description', 'budget_item_status']));

        // NOTIFY HOST
        NotificationService::notify(
            $event->owner,
            "Budget Item Updated",
            "The budget item '{$item->item_name}' in '{$event->event_name}' has been updated.",
            [
                'icon' => 'FileText', 
                'event_id' => $event->id, 
                'link' => "/events/{$event->id}?tab=budget"
            ],
            auth()->user()
        );

        return $this->successResponse('Budget item updated successfully', $item);
    }

    public function destroy(Request $request, $eventId, $id)
    {
        $item = EventBudgetItem::where('id', $id)->where('event_id', $eventId)->firstOrFail();
        $event = $item->event;

        // --- CHANGE: Use Policy Check ---
        //$this->authorize('viewBudget', $event);

        $item->delete();

        // NOTIFY HOST
        NotificationService::notify(
            $event->owner,
            "Budget Item Removed",
            "The budget item '{$item->item_name}' has been removed from '{$event->event_name}'.",
            [
                'icon' => 'Trash2', 
                'event_id' => $event->id, 
                'link' => "/events/{$event->id}?tab=budget"
            ],
            auth()->user()
        );

        return $this->successResponse('Budget item deleted successfully');
    }

    public function export($eventId)
    {
        return Excel::download(new BudgetExport($eventId), 'budget_export.xlsx');
    }
}
