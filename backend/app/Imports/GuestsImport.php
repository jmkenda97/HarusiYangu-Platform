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

            // FIX 1: Get raw array
            $data = $row->toArray();

            // FIX 2: FORCE PHONE TO STRING HERE
            // This handles the case where Excel sends a Number (Integer) instead of String
            if (isset($data['phone'])) {
                $data['phone'] = (string) $data['phone'];
            }
            if (isset($data['is_vip'])) {
                $data['is_vip'] = trim($data['is_vip']); // VIP can be text
            }
            if (isset($data['full_name'])) {
                $data['full_name'] = trim($data['full_name']);
            }
            if (isset($data['email'])) {
                $data['email'] = trim($data['email']);
            }

            // FIX 3: Remove 'max:20' from validation to see if that is causing issues (safety first)
            // We validate, but we will be lenient on length temporarily to see if it passes
            $validator = Validator::make($data, [
                'full_name' => 'required|string|max:255',
                'phone' => 'required|string', // Removed 'max:20' temporarily
                'email' => 'nullable|email|max:255',
                'is_vip' => 'nullable|in:Yes,No,yes,no',
            ]);

            if ($validator->fails()) {
                $this->skippedCount++;
                $error = $validator->errors()->first();
                $this->errors[] = "Row {$rowNumber}: " . $error;
                continue;
            }

            // 2. Check for Duplicate
            $exists = EventContact::where('event_id', $this->eventId)
                                   ->where('phone', $data['phone']) // This is now guaranteed to be a string
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
                    'full_name' => $data['full_name'],
                    'phone' => $data['phone'], // This is now guaranteed to be a string
                    'email' => $data['email'] ?? null,
                    'relationship_label' => $data['relationship'] ?? null,
                    'is_vip' => strtolower($data['is_vip'] ?? 'no') === 'yes',
                    'is_invited' => true,
                    'is_contributor' => false,
                    'update_by' => auth()->id(),
                ]);

                $this->importedCount++;
            } catch (\Exception $e) {
                $this->skippedCount++;
                $this->errors[] = "Row {$rowNumber}: Database error (" . $e->getMessage() . ")";
            }
        }
    }
}
