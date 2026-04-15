<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class VendorStatusChange extends Mailable
{
    use Queueable, SerializesModels;

    public $vendor;
    public $status;
    public $reason;

    /**
     * Create a new message instance.
     */
    public function __construct($vendor, $status, $reason = null)
    {
        $this->vendor = $vendor;
        $this->status = $status;
        $this->reason = $reason;
    }

    /**
     * Build the message.
     */
    public function build()
    {
        $subject = match($this->status) {
            'PENDING_APPROVAL' => 'Vendor Registration Received - Under Review',
            'ACTIVE' => 'Your Vendor Account is Approved!',
            'INACTIVE' => 'Update on your Vendor Account',
            'BLACKLISTED' => 'Vendor Account Suspended',
            default => 'Account Status Update'
        };

        return $this->subject($subject)
                    ->view('emails.vendor-status-change')
                    ->with([
                        'vendorName' => $this->vendor->business_name,
                        'status' => $this->status,
                        'reason' => $this->reason,
                        'loginUrl' => url('/login') // Or your login page
                    ]);
    }
}
