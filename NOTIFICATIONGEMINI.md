# HarusiYangu Notification System Documentation (NOTIFICATIONGEMINI.md)

This document tracks the complete overhaul and integration of the notification system within the HarusiYangu platform.

## 1. System Recovery & Fixes
*   **Frontend Data Mismatch Fixed:** Updated `NotificationBell.jsx` and `NotificationsPage.jsx` to support the new nested API structure (`data.notifications` and `data.unread_count`). This restored the Red Dot count and the notification list.
*   **Surgical Logic Preservation:** The recovery was done without changing the backend API spec, ensuring perfect integration with other modules.
*   **Redirect Logic:** Every notification now includes a `link` property that takes the user directly to the relevant module or tab (e.g., `/events/{id}?tab=vendors`).

## 2. Full Notification Coverage (Email + Bell)
Previously "Silent Actions" have been upgraded to trigger real-time notifications and emails.

### A. Committee Management
*   **Action:** Adding a new member.
*   **Receiver:** The added user.
*   **Message:** "You have been added to the committee for [Event Name] as a [Role]."
*   **Link:** Direct to Event Dashboard.

### B. Budget Management
*   **Action:** Store/Update/Destroy budget items.
*   **Receiver:** Event Host.
*   **Message:** Notifies of additions, cost updates, or removals.
*   **Link:** `/events/{id}?tab=budget`.

### C. Guest Management
*   **Action:** Individual guest addition & Bulk Excel import.
*   **Receiver:** Event Host.
*   **Message:** "Successfully imported X guests" or "[Name] added to guest list."
*   **Link:** `/events/{id}?tab=guests`.

### D. Event Lifecycle
*   **Action:** Event Creation, Update, and Archiving.
*   **Receiver:** Event Host.
*   **Message:** Confirms live status or security updates to event details.

### E. Financials & Pledges
*   **Action:** Recording a new pledge.
*   **Receiver:** Event Host.
*   **Message:** "A new pledge of TZS X has been recorded."
*   **Link:** `/events/{id}?tab=contributions`.

### F. Security & Profile
*   **Action:** Profile Detail Updates.
*   **Receiver:** The User.
*   **Message:** "Your profile details have been successfully updated (Security Alert)."

## 3. Core Notification Standard
All `NotificationService::notify` calls now follow this standard structure:
```php
NotificationService::notify(
    $receiver, 
    "Subject Text", 
    "Detailed Content", 
    [
        'icon' => 'IconName', // Lucide icon mapping
        'event_id' => $id, 
        'link' => '/destination/path'
    ],
    $sender
);
```

## 4. Message Logging
*   All notifications are logged in the `message_logs` table.
*   This serves as a "Sent Folder" for auditing and future SMS/WhatsApp integration.
*   Emails are triggered via SMTP settings in `.env`.

---
**Status:** FULLY INTEGRATED & ACTIVE (24 Apr 2026)
