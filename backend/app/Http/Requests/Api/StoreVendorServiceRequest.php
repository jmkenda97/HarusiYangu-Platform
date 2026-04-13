<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class StoreVendorServiceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'service_name' => 'required|string|max:255',
            'service_type' => 'required|in:CATERING,DECORATION,MC,PHOTOGRAPHY,VIDEOGRAPHY,SOUND,TRANSPORT,TENT_CHAIRS,CAKE,MAKEUP,SECURITY,VENUE,PRINTING,OTHER',
            'description' => 'nullable|string|max:1000',
            'min_price' => 'required|numeric|min:0',
            'max_price' => 'nullable|numeric|gte:min_price',
            'price_unit' => 'nullable|string|in:per_event,per_hour,per_day,per_person,flat_rate',
        ];
    }

    /**
     * Custom error messages for validation.
     */
    public function messages(): array
    {
        return [
            'service_name.required' => 'Service name is required.',
            'service_name.max' => 'Service name must not exceed 255 characters.',
            'service_type.required' => 'Service type is required.',
            'service_type.in' => 'Invalid service type selected.',
            'description.max' => 'Description must not exceed 1000 characters.',
            'min_price.required' => 'Minimum price is required.',
            'min_price.numeric' => 'Minimum price must be a number.',
            'min_price.min' => 'Minimum price must be at least 0.',
            'max_price.numeric' => 'Maximum price must be a number.',
            'max_price.gte' => 'Maximum price must be greater than or equal to minimum price.',
            'price_unit.in' => 'Invalid price unit selected.',
        ];
    }

    /**
     * Force JSON response on validation failure.
     */
    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => 'Validation failed',
            'errors' => $validator->errors()
        ], 422));
    }
}
