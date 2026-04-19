# Vendor Module & Financial Escrow Implementation Plan (Phase 2 Update)

This document serves as the absolute source of truth for the implementation of the Vendor Escrow System, Event Wallet Ledger, and Host Phases. It extends the core mandates in `GEMINI.md`.

## 1. Host Event Phases
The lifecycle of an event must follow these strict phases to guide the Host effectively:
- **DRAFT:** Initial creation. Basic details only.
- **PLANNING:** Budget is being set, and vendor inquiries are being sent.
- **ACTIVE:** Triggered automatically when the first Vendor is officially booked (i.e., the first 30% Deposit is paid). This signifies the event is "Real".
- **ONGOING:** Time-based trigger (e.g., 48 hours before the event date).
- **COMPLETED:** All vendors have been confirmed as "Service Received", and the final 40% escrow funds have been released.

## 2. Vendor Milestone Payment Structure (30 / 30 / 40)
The payment logic must be rigidly enforced to protect both Host and Vendor in the Tanzanian market.
- **Milestone 1 (Deposit - 30%):** 
  - Paid by Host immediately upon accepting a quote. 
  - *Action:* Funds move from `EventWallet` directly to Vendor's `available_balance`.
  - *Purpose:* Locks the Vendor's date and changes Event status to ACTIVE.
- **Milestone 2 (Interim - 30%):** 
  - Paid by Host closer to the event date.
  - *Action:* Funds move from `EventWallet` directly to Vendor's `available_balance`.
  - *Purpose:* Allows the vendor to purchase materials/supplies for execution.
- **Milestone 3 (Final - 40%):**
  - Paid by Host before or right after the event.
  - *Action:* Funds are deducted from `EventWallet` but are **HELD** in the Vendor's `pending_balance` (Escrow).
  - *Purpose:* Security for the Host. Funds are only moved to `available_balance` when the Host clicks "Confirm Service Received".

## 3. Perfect Traceability & Ledger System (IoT/M-Pesa Ready)
To prepare for future automated payment integrations (M-Pesa, etc.), every transaction must be perfectly traceable.
- **Ledger Entries:** Every financial movement (Inflow from contributions, Outflow to vendors) MUST write a detailed record to `wallet_ledger_entries`. This is the single source of truth for generating Account Statements.
- **Data Integrity:** 
  - `internal_receipt_number` must be generated for all payments.
  - `transaction_reference` must be captured.
  - A `metadata` JSON column should be added to payment tables to seamlessly store raw M-Pesa API webhook responses in the future without schema changes.
- **Models:** Ensure `EventWallet` and `WalletLedgerEntry` models exist and are properly mapped.

## 4. Communication & Notifications
- Maintain the current `NotificationService` pattern.
- **In-App (Bell):** Triggered for all milestone payments, quote acceptances, and service confirmations.
- **Email:** Sent concurrently with Bell notifications.
- **Logging:** All messages must be securely logged in `message_logs` to prepare for future SMS/WhatsApp integration. The environment must be clean and ready for API hooks.

## 5. UI/UX Consistency & Strict Standards
- **Styling:** Strictly adhere to the existing Tailwind classes, color palettes (`brand`, `slate`, `emerald`), and modal designs.
- **Loading States:** Use the existing `SkeletonLoader` patterns. **NEVER show '0' or empty states before data has finished loading.**
- **Components:** Ensure all tables use the standard pagination layout and responsive wrappers. Search inputs must function instantly and consistently.
- **Isolation:** DO NOT alter existing modules (e.g., standard authentication, basic event creation) outside of this specific Vendor/Financial scope. Changes must be purely additive or surgically modify the exact controllers required.

---
**Execution Rule:** Every step of this implementation must be cross-checked against this document to ensure 100% adherence to the requested business logic and system stability.