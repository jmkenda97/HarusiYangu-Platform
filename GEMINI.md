# Project Mandates (GEMINI.md)

This file contains foundational mandates for Gemini CLI interaction within the `HarusiYangu-system` project. These instructions take absolute precedence over general defaults.

## Project Structure
- **Backend:** Laravel (PHP 8.2+) located in the `/backend` directory.
- **Frontend:** React (Vite, TypeScript/JS) located in the `/frontend` directory.

## Core Engineering Standards
- **Style:** Adhere strictly to PSR-12 for PHP and Airbnb style guide for JavaScript/React.
- **Naming:** 
  - PHP: PascalCase for classes, camelCase for methods/variables, snake_case for database columns.
  - JS/React: PascalCase for components, camelCase for hooks/functions/variables.
- **Type Safety:** 
  - Backend: Use strict types in PHP (`declare(strict_types=1);`). Use type hints and return types for all methods.
  - Frontend: Prioritize TypeScript usage (if applicable) and avoid `any`.
- **Testing:** 
  - Backend: Use Pest or PHPUnit for all new features and bug fixes.
  - Frontend: Use Vitest/React Testing Library for component testing.
- **Git:** Never use `git commit -m "..."`. Always provide a descriptive multi-line message if requested, or propose a draft first.

## Host & Vendor Lifecycle Strategy
This section defines the professional workflow for event management and financial tracking.

### 1. Event Phases
- **Planning:** Host defines total budget and creates `EventBudgetItem` records with estimated costs.
- **Inquiry:** Host sends an inquiry to a Vendor, creating an `EventVendor` record with `INQUIRY` status.
- **Quote:** Vendor responds with a specific price (`last_quote_amount`), changing status to `QUOTED`.
- **Agreement:** Host accepts the Quote, setting `agreed_amount`, status to `ACCEPTED`, and linking the Vendor to an `EventBudgetItem`.
- **Execution:** Payments are made based on Milestones (e.g., 20% Deposit, 50% Interim, 30% Final).
- **Completion:** Host confirms service delivery to release final payment and change status to `COMPLETED`.

### 2. Financial Architecture (Wallet System)
- **Event Wallet:**
  - Tracks all inflows from contributors.
  - Controls outflows to vendors via milestone payments.
- **Vendor Wallet:**
  - `total_earnings`: Lifetime revenue.
  - `pending_balance`: Money held for incomplete milestones.
  - `available_balance`: Money ready for withdrawal after service confirmation.

### 3. Payment Logic & Milestones
- **Milestone 1 (Deposit - 20%):** Paid from Event Wallet to Vendor Wallet upon agreement. Locks the date.
- **Milestone 2 (Interim - 50%):** Paid shortly before the event.
- **Milestone 3 (Final - 30%):** Released only after Host clicks "Confirm Service Received".
- **Tracking:** Every payment must decrement `EventWallet.current_balance` and increment `EventBudgetItem.paid_amount` and `EventVendor.amount_paid`.

### 4. Communication & Messaging
- **Notification Service:** Centralized service to handle Email (current) and log messages for future SMS/WhatsApp integration.
- **In-App Notifications:** Real-time bell notifications for all status changes (Quotes received, Payments confirmed, etc.).
- **Message Logs:** Professional audit trail of all automated communication sent to users.

