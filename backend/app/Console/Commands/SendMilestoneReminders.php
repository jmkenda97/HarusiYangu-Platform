<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\EventVendor;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class SendMilestoneReminders extends Command
{
    /**
     * The name and signature of the console command.
     * @var string
     */
    protected $signature = 'app:send-milestone-reminders';

    /**
     * The console command description.
     * @var string
     */
    protected $description = 'Scan milestone dates and send reminders to Hosts and Vendors';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Scanning milestones for reminders...');

        // Fetch bookings that are in negotiation or active
        $bookings = EventVendor::whereIn('status', ['QUOTED', 'ACCEPTED'])
            ->with(['event', 'event.owner', 'vendor', 'vendor.user'])
            ->get();

        foreach ($bookings as $booking) {
            $milestones = $booking->metadata['milestones'] ?? null;
            if (!$milestones) continue;

            foreach (['phase_1', 'phase_2', 'phase_3'] as $phaseKey) {
                $phase = $milestones[$phaseKey] ?? null;
                if (!$phase || ($phase['status'] ?? '') === 'PAID') continue;

                $dueDate = Carbon::parse($phase['due_date']);
                $today = Carbon::today();
                $diff = $today->diffInDays($dueDate, false);

                // Scenario A: Due in 3 Days
                if ($diff === 3) {
                    $this->sendReminders($booking, $phase, "due in 3 days");
                }
                // Scenario B: Due Today
                elseif ($diff === 0) {
                    $this->sendReminders($booking, $phase, "is due today");
                }
            }
        }

        $this->info('Milestone scan completed.');
    }

    private function sendReminders($booking, $phase, $timeLabel)
    {
        $host = $booking->event->owner;
        $vendorUser = $booking->vendor->user;
        $serviceName = $booking->assigned_service;
        $amount = number_format($phase['amount']);

        // 1. NOTIFY HOST (The Payer)
        NotificationService::notify(
            $host,
            "Payment Reminder: {$phase['name']}",
            "Friendly reminder that the {$phase['name']} payment of TZS {$amount} for '{$serviceName}' {$timeLabel}. Please check your invoice for payout details.",
            [
                'icon' => 'Clock',
                'event_id' => $booking->event_id,
                'link' => "/events/{$booking->event_id}?tab=vendors"
            ]
        );

        // 2. NOTIFY VENDOR (The Provider)
        if ($vendorUser) {
            NotificationService::notify(
                $vendorUser,
                "Milestone Notice: {$phase['name']}",
                "The {$phase['name']} milestone for '{$booking->event->event_name}' ({$serviceName}) {$timeLabel}. Total expected: TZS {$amount}.",
                [
                    'icon' => 'DollarSign',
                    'event_id' => $booking->event_id,
                    'link' => '/vendor/dashboard'
                ]
            );
        }
    }
}
