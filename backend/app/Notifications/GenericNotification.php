<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class GenericNotification extends Notification
{
    use Queueable;

    private $subject;
    private $content;
    private $data;

    /**
     * Create a new notification instance.
     */
    public function __construct($subject, $content, $data = [])
    {
        $this->subject = $subject;
        $this->content = $content;
        $this->data = $data;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return array_merge([
            'subject' => $this->subject,
            'content' => $this->content,
            'icon' => $this->data['icon'] ?? 'Bell',
        ], $this->data);
    }
}
