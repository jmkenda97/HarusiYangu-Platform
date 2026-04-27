<?php

namespace App\Services;

use App\Models\MessageLog;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use App\Notifications\GenericNotification;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    /**
     * Send a notification through multiple channels and log it.
     */
    public static function notify(User $receiver, string $subject, string $content, array $data = [])
    {
        try {
            $sender = auth()->user();

            // Auto-determine link if not provided
            if (!isset($data['link'])) {
                $sub = strtolower($subject);
                $msg = strtolower($content);
                
                if (str_contains($sub, 'service') || str_contains($msg, 'service')) {
                    $data['link'] = '/vendor/profile?tab=services';
                } elseif (str_contains($sub, 'document') || str_contains($msg, 'document')) {
                    $data['link'] = '/vendor/profile?tab=documents';
                } elseif (str_contains($sub, 'account') || str_contains($sub, 'vendor') || str_contains($msg, 'registration')) {
                    if ($receiver->hasRole('VENDOR')) {
                        $data['link'] = '/vendor/dashboard';
                    } else {
                        $data['link'] = '/admin/vendors';
                    }
                }
            }

            // 1. In-App Notification (Database)
            // This will show up in the "Bell" on the frontend
            $receiver->notify(new GenericNotification($subject, $content, $data));

            // 2. Email Notification
            if ($receiver->email) {
                try {
                    Mail::raw($content, function ($message) use ($receiver, $subject) {
                        $message->to($receiver->email)
                                ->subject($subject);
                    });
                } catch (\Exception $e) {
                    Log::error('Mail sending failed: ' . $e->getMessage());
                }
            }

            // 3. SMS / Phone Message (Current: Log, Future: API Hook)
            self::sendSMS($receiver->phone, $content);

            // 4. Log the message for future SMS/WhatsApp integration
            MessageLog::create([
                'sender_id' => $sender ? $sender->id : null,
                'receiver_id' => $receiver->id,
                'type' => 'EMAIL', 
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
     * SMS Gateway Hook
     * Prepared for real API integration later.
     */
    public static function sendSMS(string $phone, string $message)
    {
        Log::info("--- [SMS NOTIFICATION LOG] ---");
        Log::info("TO: {$phone}");
        Log::info("MESSAGE: {$message}");
        Log::info("---------------------------------");

        // TODO: Plug in real SMS API here (Beem, Twilio, etc.)
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
