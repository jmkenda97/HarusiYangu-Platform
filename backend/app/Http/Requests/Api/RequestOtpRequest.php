<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class RequestOtpRequest extends FormRequest
{
    // 1. Authorization: We allow everyone to request an OTP
    public function authorize(): bool
    {
        return true;
    }

    // 2. Rules: Strict validation for phone and purpose
    public function rules(): array
    {
        return [
            'phone' => 'required|string|regex:/^\+?[0-9]{10,15}$/', // Regex for international phone format
            'purpose' => 'required|in:LOGIN,REGISTER',
        ];
    }

    // 3. Custom Error Messages (Professional UX)
    public function messages(): array
    {
        return [
            'phone.required' => 'Phone number is required.',
            'phone.regex' => 'Invalid phone number format.',
            'purpose.in' => 'Purpose must be either LOGIN or REGISTER.',
        ];
    }

    // 4. Force JSON Response on Validation Failure
    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => 'Validation failed',
            'errors' => $validator->errors()
        ], 422));
    }
}
