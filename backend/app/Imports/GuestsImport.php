<?php

namespace App\Imports;

use App\Models\EventContact;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class GuestsImport implements ToCollection, WithHeadingRow
{
    public $eventId;
    public $importedCount = 0;
    public $skippedCount = 0;
    public $errors = [];

    // We inject the Event ID in the constructor
    public function __construct($eventId)
    {
        $this->eventId = $eventId;
    }

      public function collection(Collection $rows)
    {
        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2;

            // FIX: Clean the data first (Remove Spaces)
            $data = $row->toArray();
            $cleanData = array_map(function ($value) {
                return is_string($value) ? trim($value) : $value;
            }, $data);

            // UPDATED VALIDATION: Removed 'string|max:20' on phone to be safer, added 'max:20' back but with trim
            $validator = Validator::make($cleanData, [
                'full_name' => 'required|string|max:255',
                'phone' => 'required|string|max:20', // Standardizing phone length
                'email' => 'nullable|email|max:255',
                'is_vip' => 'nullable|in:Yes,No,yes,no', // Case insensitive check for Excel inputs
            ]);

            if ($validator->fails()) {
                $this->skippedCount++;
                // FIX: Show specific error message
                $error = $validator->errors()->first();
                $this->errors[] = "Row {$rowNumber}: " . $error;
                continue;
            }

            // 2. Check for Duplicate
            $exists = EventContact::where('event_id', $this->eventId)
                                   ->where('phone', $cleanData['phone'])
                                   ->exists();

            if ($exists) {
                $this->skippedCount++;
                $this->errors[] = "Row {$rowNumber}: Phone number already exists.";
                continue;
            }

            // 3. Create Guest
            try {
                EventContact::create([
                    'id' => \Str::uuid(),
                    'event_id' => $this->eventId,
                    'full_name' => $cleanData['full_name'],
                    'phone' => $cleanData['phone'],
                    'email' => $cleanData['email'] ?? null,
                    'relationship_label' => $cleanData['relationship'] ?? null,
                    'is_vip' => strtolower($cleanData['is_vip'] ?? 'no') === 'yes',
                    'is_invited' => true,
                    'is_contributor' => false,
                    'created_by' => auth()->id(),
                ]);

                $this->importedCount++;
            } catch (\Exception $e) {
                $this->skippedCount++;
                $this->errors[] = "Row {$rowNumber}: Database error (" . $e->getMessage() . ")";
            }
        }
    }
}
