<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vendor Account Update</title>
    <style>
        body { font-family: sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
        .logo { font-size: 24px; font-weight: bold; color: #1e3a8a; }
        .content { line-height: 1.6; color: #333; }
        .btn { display: inline-block; padding: 12px 24px; background-color: #1e3a8a; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; }
        .alert { background-color: #fef3c7; border: 1px solid #f59e0b; color: #92400e; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">HarusiYangu</div>
            <h2>Vendor Account Status Update</h2>
        </div>

        <div class="content">
            <p>Dear <strong>{{ $vendorName }}</strong>,</p>

            @if($status === 'PENDING_APPROVAL')
                <p>Thank you for registering with <strong>HarusiYangu</strong>! Your vendor application has been received and is currently under review.</p>
                <p>Our team will carefully review your business details and documents. You will receive another email once the review is complete.</p>
                <div class="alert">
                    <strong>Current Status:</strong> Pending Approval
                    @if($reason)
                        <br><strong>Note:</strong> {{ $reason }}
                    @endif
                </div>
                <p>Typical review time is 24-48 hours. Thank you for your patience!</p>
            @elseif($status === 'ACTIVE')
                <div style="background-color: #d1fae5; border: 1px solid #10b981; color: #065f46; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    <strong>🎉 Congratulations!</strong> Your vendor account has been approved and is now active!
                </div>
                <p>You can now login to your dashboard and start managing your services, receive event bookings, and grow your business.</p>
            @elseif($status === 'INACTIVE')
                <p>We regret to inform you that your vendor application has been rejected.</p>
                @if($reason)
                    <div class="alert">
                        <strong>Reason provided:</strong> {{ $reason }}
                    </div>
                @endif
                <p>If you believe this is an error or would like to reapply, please contact our support team.</p>
            @elseif($status === 'BLACKLISTED')
                <div style="background-color: #fee2e2; border: 1px solid #ef4444; color: #991b1b; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    <strong>Important:</strong> Your vendor account has been suspended.
                </div>
                @if($reason)
                    <div class="alert">
                        <strong>Reason:</strong> {{ $reason }}
                    </div>
                @endif
                <p>Please contact our support team for more information.</p>
            @endif

            <p style="margin-top: 30px;">If you have any questions, please contact our support team.</p>
            <p><strong>Login:</strong> Use your registered phone number to login.</p>

            <div style="text-align: center;">
                <a href="{{ $loginUrl }}" class="btn">Go to Login</a>
            </div>
        </div>
    </div>
</body>
</html>
