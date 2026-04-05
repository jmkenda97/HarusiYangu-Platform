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

class EventBudgetController extends Controller
{
    public function index(Request $request, $eventId)
    {
        $event = Event::findOrFail($eventId);

        // --- CHANGE: Use Policy Check ---
        //$this->authorize('viewBudget', $event);

        $items = EventBudgetItem::where('event_id', $eventId)
            ->with('category')
            ->orderBy('created_at', 'desc')
            ->get();

        // Also fetch categories for the form
        $categories = BudgetCategory::all();

        return response()->json([
            'success' => true,
            'data' => [
                'items' => $items,
                'categories' => $categories
            ]
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

            return response()->json([
                'success' => true,
                'message' => 'Budget item added',
                'data' => $item
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
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

        return response()->json(['success' => true, 'data' => $item]);
    }

    public function destroy(Request $request, $eventId, $id)
    {
        $item = EventBudgetItem::where('id', $id)->where('event_id', $eventId)->firstOrFail();
        $event = $item->event;

        // --- CHANGE: Use Policy Check ---
        //$this->authorize('viewBudget', $event);

        $item->delete();

        return response()->json(['success' => true, 'message' => 'Item deleted']);
    }

    public function export($eventId)
    {
        return Excel::download(new BudgetExport($eventId), 'budget_export.xlsx');
    }
}
