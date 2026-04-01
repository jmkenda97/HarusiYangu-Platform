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
            $rowNumber = $index + 2; // Excel rows start at 1, Header is 1

            // 1. Manual Validation
            $validator = Validator::make($row->toArray(), [
                'full_name' => 'required|string|max:255',
                'phone' => 'required|string|max:20',
                'email' => 'nullable|email|max:255',
                'is_vip' => 'nullable|in:Yes,No,yes,no',
            ]);

            if ($validator->fails()) {
                $this->skippedCount++;
                $this->errors[] = "Row {$rowNumber}: Invalid data.";
                continue; // Skip this row
            }

            // 2. Check for Duplicate (Based on Phone + Event)
            $exists = EventContact::where('event_id', $this->eventId)
                                   ->where('phone', $row['phone'])
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
                    'full_name' => $row['full_name'],
                    'phone' => $row['phone'],
                    'email' => $row['email'] ?? null,
                    'relationship_label' => $row['relationship'] ?? null,
                    'is_vip' => strtolower($row['is_vip'] ?? 'no') === 'yes',
                    'is_invited' => true,
                    'is_contributor' => false,
                    'created_by' => auth()->id(),
                ]);

                $this->importedCount++;
            } catch (\Exception $e) {
                $this->skippedCount++;
                $this->errors[] = "Row {$rowNumber}: Database error.";
            }
        }
    }
}
