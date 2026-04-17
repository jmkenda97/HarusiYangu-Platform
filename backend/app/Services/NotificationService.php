<?php

namespace App\Services;

use App\Models\MessageLog;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use App\Notifications\SystemNotification; // We'll create this next
use Illuminate\Support\Facades\Log;

class NotificationService
{
    /**
     * Send a notification through multiple channels and log it.
     */
    public static function notify(User $receiver, string $subject, string $content, array $data = [], User $sender = null)
    {
        try {
            // 1. In-App Notification (Database)
            // This will show up in the "Bell" on the frontend
            $receiver->notify(new \App\Notifications\GenericNotification($subject, $content, $data));

            // 2. Email Notification
            if ($receiver->email) {
                Mail::raw($content, function ($message) use ($receiver, $subject) {
                    $message->to($receiver->email)
                            ->subject($subject);
                });
            }

            // 3. Log the message for future SMS/WhatsApp integration
            MessageLog::create([
                'sender_id' => $sender ? $sender->id : null,
                'receiver_id' => $receiver->id,
                'type' => 'EMAIL', // Current primary channel
                'recipient' => $receiver->email,
                'subject' => $subject,
                'content' => $content,
                'status' => 'SENT',
                'sent_at' => now(),
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error('Notification failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Notify all Super Admins about important system events.
     */
    public static function notifyAdmins(string $subject, string $content, array $data = [])
    {
        try {
            // Default admin notification icon
            if (!isset($data['icon'])) {
                $data['icon'] = 'AlertCircle';
            }
            
            $admins = User::role('SUPER_ADMIN')->get();
            foreach ($admins as $admin) {
                self::notify($admin, $subject, $content, $data);
            }
            return true;
        } catch (\Exception $e) {
            Log::error('Admin notification failed: ' . $e->getMessage());
            return false;
        }
    }
}
