<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BudgetCategory;
use Illuminate\Http\JsonResponse;

class BudgetCategoryController extends Controller
{
    /**
     * List all budget categories.
     * Spec 10.1
     */
    public function index(): JsonResponse
    {
        $categories = BudgetCategory::all();

        return $this->successResponse('Budget categories fetched successfully', $categories);
    }
}
