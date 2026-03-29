<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::transaction(function () {
            $sql = <<<'SQL'
-- =========================================================
-- HARUSIYANGU PLATFORM - FULL DATABASE SCHEMA
-- =========================================================

-- 1. RECOMMENDED EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CLEANUP ENUMS (CRITICAL: This prevents the "Duplicate Object" error)
DROP TYPE IF EXISTS user_role, account_status, event_type, event_status, committee_role,
contribution_status, payment_status, payment_method, vendor_status,
vendor_service_type, budget_item_status, message_channel, message_status,
card_type, card_status, attendance_status, expense_status, notification_trigger_type CASCADE;

-- 3. ENUM TYPES
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'HOST', 'COMMITTEE_MEMBER', 'GATE_OFFICER', 'VENDOR', 'CONTRIBUTOR');
CREATE TYPE account_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION');
CREATE TYPE event_type AS ENUM ('KITCHEN_PARTY', 'SENDOFF', 'WEDDING', 'BAG_PARTY', 'BRIDAL_SHOWER', 'ENGAGEMENT', 'OTHER');
CREATE TYPE event_status AS ENUM ('DRAFT', 'PLANNING', 'ACTIVE', 'ONGOING', 'COMPLETED', 'CANCELLED', 'ARCHIVED');
CREATE TYPE committee_role AS ENUM ('CHAIRPERSON', 'SECRETARY', 'TREASURER', 'COORDINATOR', 'MEMBER');
CREATE TYPE contribution_status AS ENUM ('PLEDGED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE payment_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REVERSED', 'REFUNDED', 'CANCELLED');
CREATE TYPE payment_method AS ENUM ('CASH', 'MPESA', 'AIRTEL_MONEY', 'TIGO_PESA', 'HALOPESA', 'BANK_TRANSFER', 'CARD', 'INTERNAL_WALLET', 'OTHER');
CREATE TYPE vendor_status AS ENUM ('ACTIVE', 'INACTIVE', 'BLACKLISTED');
CREATE TYPE vendor_service_type AS ENUM ('CATERING', 'DECORATION', 'MC', 'PHOTOGRAPHY', 'VIDEOGRAPHY', 'SOUND', 'TRANSPORT', 'TENT_CHAIRS', 'CAKE', 'MAKEUP', 'SECURITY', 'VENUE', 'PRINTING', 'OTHER');
CREATE TYPE budget_item_status AS ENUM ('PLANNED', 'APPROVED', 'IN_PROGRESS', 'PAID', 'CANCELLED');
CREATE TYPE message_channel AS ENUM ('SMS', 'WHATSAPP', 'EMAIL', 'IN_APP');
CREATE TYPE message_status AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'READ', 'CANCELLED');
CREATE TYPE card_type AS ENUM ('INVITATION', 'VIP_INVITATION', 'CONTRIBUTOR_CARD', 'SINGLE_CARD', 'DOUBLE_CARD', 'THANK_YOU_CARD');
CREATE TYPE card_status AS ENUM ('ACTIVE', 'USED', 'EXPIRED', 'REVOKED');
CREATE TYPE attendance_status AS ENUM ('NOT_CHECKED_IN', 'CHECKED_IN', 'CHECKED_OUT', 'DENIED');
CREATE TYPE expense_status AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED');
CREATE TYPE notification_trigger_type AS ENUM ('MANUAL', 'SCHEDULED', 'PAYMENT_RECEIVED', 'PLEDGE_CREATED', 'EVENT_REMINDER', 'THANK_YOU', 'CARD_ISSUED');

-- 4. COMMON TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$ BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
 $$ LANGUAGE plpgsql;

-- 5. USERS & AUTHENTICATION
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash TEXT,
    profile_photo_url TEXT,
    role user_role NOT NULL DEFAULT 'HOST',
    status account_status NOT NULL DEFAULT 'PENDING_VERIFICATION',
    is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token_hash TEXT NOT NULL,
    refresh_token_hash TEXT,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

CREATE TABLE otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_phone_purpose ON otp_verifications(phone, purpose);

-- 6. EVENTS
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    event_type event_type NOT NULL,
    description TEXT,
    groom_name VARCHAR(255),
    bride_name VARCHAR(255),
    celebrant_name VARCHAR(255),
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    venue_name VARCHAR(255),
    venue_address TEXT,
    region VARCHAR(100),
    district VARCHAR(100),
    ward VARCHAR(100),
    google_map_link TEXT,
    expected_guests INTEGER DEFAULT 0 CHECK (expected_guests >= 0),
    event_status event_status NOT NULL DEFAULT 'DRAFT',
    currency_code VARCHAR(10) NOT NULL DEFAULT 'TZS',
    target_budget NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (target_budget >= 0),
    contingency_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (contingency_amount >= 0),
    allow_public_registration BOOLEAN NOT NULL DEFAULT FALSE,
    require_contribution_before_card BOOLEAN NOT NULL DEFAULT FALSE,
    contribution_card_mode VARCHAR(20) DEFAULT 'AUTO',
    archived_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_events_owner_user_id ON events(owner_user_id);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_status ON events(event_status);

CREATE TABLE event_committee_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    committee_role committee_role NOT NULL DEFAULT 'MEMBER',
    can_manage_budget BOOLEAN NOT NULL DEFAULT FALSE,
    can_manage_contributions BOOLEAN NOT NULL DEFAULT TRUE,
    can_send_messages BOOLEAN NOT NULL DEFAULT TRUE,
    can_manage_vendors BOOLEAN NOT NULL DEFAULT FALSE,
    can_scan_cards BOOLEAN NOT NULL DEFAULT FALSE,
    added_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, user_id)
);

CREATE INDEX idx_event_committee_event_id ON event_committee_members(event_id);
CREATE INDEX idx_event_committee_user_id ON event_committee_members(user_id);

-- 7. CONTACTS
CREATE TABLE event_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    gender VARCHAR(20),
    relationship_label VARCHAR(100),
    address TEXT,
    notes TEXT,
    is_contributor BOOLEAN NOT NULL DEFAULT TRUE,
    is_invited BOOLEAN NOT NULL DEFAULT TRUE,
    is_vip BOOLEAN NOT NULL DEFAULT FALSE,
    opt_in_sms BOOLEAN NOT NULL DEFAULT TRUE,
    opt_in_whatsapp BOOLEAN NOT NULL DEFAULT TRUE,
    opt_in_email BOOLEAN NOT NULL DEFAULT FALSE,
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(event_id, phone)
);

CREATE TRIGGER trg_event_contacts_updated_at BEFORE UPDATE ON event_contacts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_event_contacts_event_id ON event_contacts(event_id);
CREATE INDEX idx_event_contacts_phone ON event_contacts(phone);

-- 8. CONTRIBUTIONS
CREATE TABLE contribution_pledges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES event_contacts(id) ON DELETE CASCADE,
    pledge_amount NUMERIC(14,2) NOT NULL CHECK (pledge_amount >= 0),
    amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    outstanding_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (outstanding_amount >= 0),
    contribution_status contribution_status NOT NULL DEFAULT 'PLEDGED',
    due_date DATE,
    contribution_type VARCHAR(50) DEFAULT 'CASH',
    notes TEXT,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(event_id, contact_id)
);

CREATE TRIGGER trg_contribution_pledges_updated_at BEFORE UPDATE ON contribution_pledges FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_contribution_pledges_event_id ON contribution_pledges(event_id);
CREATE INDEX idx_contribution_pledges_contact_id ON contribution_pledges(contact_id);
CREATE INDEX idx_contribution_pledges_status ON contribution_pledges(contribution_status);

CREATE TABLE contribution_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    pledge_id UUID NOT NULL REFERENCES contribution_pledges(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES event_contacts(id) ON DELETE CASCADE,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    payment_method payment_method NOT NULL,
    payment_status payment_status NOT NULL DEFAULT 'PENDING',
    transaction_reference VARCHAR(255),
    provider_reference VARCHAR(255),
    internal_receipt_number VARCHAR(100),
    paid_at TIMESTAMP,
    confirmed_at TIMESTAMP,
    notes TEXT,
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_contribution_payments_updated_at BEFORE UPDATE ON contribution_payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_contribution_payments_event_id ON contribution_payments(event_id);
CREATE INDEX idx_contribution_payments_pledge_id ON contribution_payments(pledge_id);
CREATE INDEX idx_contribution_payments_contact_id ON contribution_payments(contact_id);
CREATE INDEX idx_contribution_payments_status ON contribution_payments(payment_status);
CREATE UNIQUE INDEX uq_contribution_payments_reference ON contribution_payments(transaction_reference) WHERE transaction_reference IS NOT NULL;

-- 9. EVENT WALLET / LEDGER
CREATE TABLE event_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
    total_inflow NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_outflow NUMERIC(14,2) NOT NULL DEFAULT 0,
    current_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_event_wallets_updated_at BEFORE UPDATE ON event_wallets FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE wallet_ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES event_wallets(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    entry_type VARCHAR(20) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    source_id UUID,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    description TEXT,
    entry_date TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_wallet_ledger_wallet_id ON wallet_ledger_entries(wallet_id);
CREATE INDEX idx_wallet_ledger_event_id ON wallet_ledger_entries(event_id);

-- 10. BUDGET MANAGEMENT
CREATE TABLE budget_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO budget_categories (category_name, description) VALUES
('Venue', 'Venue booking and related costs'),
('Food', 'Food and catering costs'),
('Decoration', 'Decoration and setup costs'),
('Transport', 'Transport and logistics'),
('Clothes', 'Attire and clothing'),
('Photography', 'Photography and video coverage'),
('Entertainment', 'MC, DJ, music and program support'),
('Printing', 'Cards, banners and stationery'),
('Gifts', 'Gifts and appreciation'),
('Miscellaneous', 'Other costs');

CREATE TABLE event_budget_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    category_id UUID REFERENCES budget_categories(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_cost NUMERIC(14,2) NOT NULL CHECK (estimated_cost >= 0),
    actual_cost NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (actual_cost >= 0),
    variance_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    budget_item_status budget_item_status NOT NULL DEFAULT 'PLANNED',
    priority_level INTEGER NOT NULL DEFAULT 3 CHECK (priority_level BETWEEN 1 AND 5),
    vendor_id UUID,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_event_budget_items_updated_at BEFORE UPDATE ON event_budget_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_event_budget_items_event_id ON event_budget_items(event_id);
CREATE INDEX idx_event_budget_items_category_id ON event_budget_items(category_id);

-- 11. VENDORS
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    business_name VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    service_type vendor_service_type NOT NULL,
    status vendor_status NOT NULL DEFAULT 'ACTIVE',
    rating NUMERIC(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_vendors_phone ON vendors(phone);
CREATE INDEX idx_vendors_service_type ON vendors(service_type);

ALTER TABLE event_budget_items
ADD CONSTRAINT fk_event_budget_items_vendor
FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL;

CREATE TABLE event_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    assigned_service VARCHAR(255) NOT NULL,
    agreed_amount NUMERIC(14,2) NOT NULL CHECK (agreed_amount >= 0),
    amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    balance_due NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (balance_due >= 0),
    contract_notes TEXT,
    start_date DATE,
    end_date DATE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(event_id, vendor_id, assigned_service)
);

CREATE TRIGGER trg_event_vendors_updated_at BEFORE UPDATE ON event_vendors FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_event_vendors_event_id ON event_vendors(event_id);
CREATE INDEX idx_event_vendors_vendor_id ON event_vendors(vendor_id);

-- 11.5 VENDOR PAYMENTS (VERIFIED COMPLETE)
CREATE TABLE vendor_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    event_vendor_id UUID NOT NULL REFERENCES event_vendors(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    payment_method payment_method NOT NULL,
    payment_status payment_status NOT NULL DEFAULT 'PENDING',
    transaction_reference VARCHAR(255),
    payment_date TIMESTAMP,
    notes TEXT,
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_vendor_payments_updated_at BEFORE UPDATE ON vendor_payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_vendor_payments_event_id ON vendor_payments(event_id);
CREATE INDEX idx_vendor_payments_vendor_id ON vendor_payments(vendor_id);

-- 12. EXPENSES
CREATE TABLE event_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    budget_item_id UUID REFERENCES event_budget_items(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    expense_title VARCHAR(255) NOT NULL,
    description TEXT,
    amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
    expense_status expense_status NOT NULL DEFAULT 'PENDING',
    expense_date DATE NOT NULL,
    receipt_url TEXT,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_event_expenses_updated_at BEFORE UPDATE ON event_expenses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_event_expenses_event_id ON event_expenses(event_id);
CREATE INDEX idx_event_expenses_budget_item_id ON event_expenses(budget_item_id);

-- 13. MESSAGE TEMPLATES
CREATE TABLE message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(255) NOT NULL UNIQUE,
    channel message_channel NOT NULL,
    subject VARCHAR(255),
    body TEXT NOT NULL,
    language_code VARCHAR(10) NOT NULL DEFAULT 'sw',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_message_templates_updated_at BEFORE UPDATE ON message_templates FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE event_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES event_contacts(id) ON DELETE CASCADE,
    trigger_type notification_trigger_type NOT NULL,
    channel message_channel NOT NULL,
    template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
    recipient_phone VARCHAR(20),
    recipient_email VARCHAR(255),
    message_subject VARCHAR(255),
    message_body TEXT NOT NULL,
    status message_status NOT NULL DEFAULT 'QUEUED',
    provider_message_id VARCHAR(255),
    provider_response TEXT,
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    failed_at TIMESTAMP,
    failure_reason TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_event_notifications_updated_at BEFORE UPDATE ON event_notifications FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_event_notifications_event_id ON event_notifications(event_id);
CREATE INDEX idx_event_notifications_contact_id ON event_notifications(contact_id);
CREATE INDEX idx_event_notifications_status ON event_notifications(status);
CREATE INDEX idx_event_notifications_channel ON event_notifications(channel);

-- 14. DIGITAL CARDS & QR
CREATE TABLE digital_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES event_contacts(id) ON DELETE SET NULL,
    pledge_id UUID REFERENCES contribution_pledges(id) ON DELETE SET NULL,
    card_type card_type NOT NULL,
    card_title VARCHAR(255) NOT NULL,
    qr_code_text TEXT NOT NULL,
    qr_code_image_url TEXT,
    secure_token VARCHAR(255) NOT NULL UNIQUE,
    allowed_guests INTEGER NOT NULL DEFAULT 1 CHECK (allowed_guests > 0),
    card_status card_status NOT NULL DEFAULT 'ACTIVE',
    issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP,
    used_at TIMESTAMP,
    revoked_at TIMESTAMP,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_digital_cards_updated_at BEFORE UPDATE ON digital_cards FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_digital_cards_event_id ON digital_cards(event_id);
CREATE INDEX idx_digital_cards_contact_id ON digital_cards(contact_id);
CREATE INDEX idx_digital_cards_status ON digital_cards(card_status);

CREATE TABLE card_scan_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES digital_cards(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    scanned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    scan_time TIMESTAMP NOT NULL DEFAULT NOW(),
    scan_location VARCHAR(255),
    device_identifier VARCHAR(255),
    attendance_status attendance_status NOT NULL,
    remarks TEXT
);

CREATE INDEX idx_card_scan_logs_card_id ON card_scan_logs(card_id);
CREATE INDEX idx_card_scan_logs_event_id ON card_scan_logs(event_id);

-- 15. EVENT PARTICIPATION / ATTENDANCE
CREATE TABLE event_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES event_contacts(id) ON DELETE CASCADE,
    card_id UUID REFERENCES digital_cards(id) ON DELETE SET NULL,
    attendance_status attendance_status NOT NULL DEFAULT 'NOT_CHECKED_IN',
    checked_in_at TIMESTAMP,
    checked_out_at TIMESTAMP,
    checked_in_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(event_id, contact_id)
);

CREATE TRIGGER trg_event_attendance_updated_at BEFORE UPDATE ON event_attendance FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_event_attendance_event_id ON event_attendance(event_id);
CREATE INDEX idx_event_attendance_contact_id ON event_attendance(contact_id);

-- 16. ACKNOWLEDGEMENTS / THANK YOU TRACKING
CREATE TABLE acknowledgements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES event_contacts(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES contribution_payments(id) ON DELETE SET NULL,
    message_channel message_channel NOT NULL,
    message_body TEXT NOT NULL,
    sent_status message_status NOT NULL DEFAULT 'QUEUED',
    sent_at TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_acknowledgements_event_id ON acknowledgements(event_id);
CREATE INDEX idx_acknowledgements_contact_id ON acknowledgements(contact_id);

-- 17. REMINDER RULES / SCHEDULING
CREATE TABLE reminder_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    rule_name VARCHAR(255) NOT NULL,
    channel message_channel NOT NULL,
    days_before_event INTEGER,
    days_after_event INTEGER,
    only_for_unpaid BOOLEAN NOT NULL DEFAULT TRUE,
    only_for_paid BOOLEAN NOT NULL DEFAULT FALSE,
    minimum_outstanding_amount NUMERIC(14,2) DEFAULT 0,
    template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_reminder_rules_updated_at BEFORE UPDATE ON reminder_rules FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_reminder_rules_event_id ON reminder_rules(event_id);

-- 18. AUDIT LOGS
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_event_id ON audit_logs(event_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- 19. FILE ATTACHMENTS
CREATE TABLE file_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    related_entity_name VARCHAR(100),
    related_entity_id UUID,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    mime_type VARCHAR(100),
    file_size BIGINT CHECK (file_size >= 0),
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_file_attachments_event_id ON file_attachments(event_id);

-- 20. SYSTEM SETTINGS
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 21. REPORTING VIEWS
CREATE OR REPLACE VIEW vw_event_contribution_summary AS
SELECT
e.id AS event_id,
e.event_name,
e.target_budget,
COALESCE(SUM(cp.pledge_amount), 0) AS total_pledged,
COALESCE(SUM(cp.amount_paid), 0) AS total_paid,
COALESCE(SUM(cp.outstanding_amount), 0) AS total_outstanding,
(e.target_budget - COALESCE(SUM(cp.amount_paid), 0)) AS budget_gap
FROM events e
LEFT JOIN contribution_pledges cp ON cp.event_id = e.id
GROUP BY e.id, e.event_name, e.target_budget;

CREATE OR REPLACE VIEW vw_event_budget_summary AS
SELECT
e.id AS event_id,
e.event_name,
COALESCE(SUM(ebi.estimated_cost), 0) AS total_estimated_cost,
COALESCE(SUM(ebi.actual_cost), 0) AS total_actual_cost,
COALESCE(SUM(ebi.actual_cost - ebi.estimated_cost), 0) AS total_variance
FROM events e
LEFT JOIN event_budget_items ebi ON ebi.event_id = e.id
GROUP BY e.id, e.event_name;

CREATE OR REPLACE VIEW vw_event_vendor_summary AS
SELECT
ev.event_id,
v.id AS vendor_id,
v.full_name,
v.business_name,
ev.assigned_service,
ev.agreed_amount,
ev.amount_paid,
ev.balance_due
FROM event_vendors ev
JOIN vendors v ON v.id = ev.vendor_id;

-- 22. TRIGGER FUNCTION TO UPDATE PLEDGE TOTALS AFTER PAYMENT
CREATE OR REPLACE FUNCTION update_pledge_payment_totals()
RETURNS TRIGGER AS $$ BEGIN
UPDATE contribution_pledges
SET
amount_paid = (
SELECT COALESCE(SUM(amount), 0)
FROM contribution_payments
WHERE pledge_id = NEW.pledge_id
AND payment_status = 'SUCCESS'
),
outstanding_amount = GREATEST(
pledge_amount - (
SELECT COALESCE(SUM(amount), 0)
FROM contribution_payments
WHERE pledge_id = NEW.pledge_id
AND payment_status = 'SUCCESS'
), 0
),
contribution_status = CASE
WHEN (
SELECT COALESCE(SUM(amount), 0)
FROM contribution_payments
WHERE pledge_id = NEW.pledge_id
AND payment_status = 'SUCCESS'
) = 0 THEN 'PLEDGED'
WHEN (
SELECT COALESCE(SUM(amount), 0)
FROM contribution_payments
WHERE pledge_id = NEW.pledge_id
AND payment_status = 'SUCCESS'
) < pledge_amount THEN 'PARTIALLY_PAID'
ELSE 'PAID'
END,
updated_at = NOW()
WHERE id = NEW.pledge_id;

RETURN NEW;
END;
 $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_pledge_after_payment_insert
AFTER INSERT OR UPDATE ON contribution_payments
FOR EACH ROW
WHEN (NEW.payment_status = 'SUCCESS')
EXECUTE FUNCTION update_pledge_payment_totals();

-- 23. TRIGGER FUNCTION TO UPDATE EVENT WALLET AFTER PAYMENT
CREATE OR REPLACE FUNCTION update_event_wallet_after_contribution()
RETURNS TRIGGER AS $$ BEGIN
INSERT INTO event_wallets (event_id, total_inflow, total_outflow, current_balance)
VALUES (NEW.event_id, 0, 0, 0)
ON CONFLICT (event_id) DO NOTHING;

UPDATE event_wallets
SET
total_inflow = (
SELECT COALESCE(SUM(amount), 0)
FROM contribution_payments
WHERE event_id = NEW.event_id
AND payment_status = 'SUCCESS'
),
current_balance = (
SELECT COALESCE(SUM(amount), 0)
FROM contribution_payments
WHERE event_id = NEW.event_id
AND payment_status = 'SUCCESS'
) - total_outflow,
updated_at = NOW()
WHERE event_id = NEW.event_id;

RETURN NEW;
END;
 $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_wallet_after_contribution
AFTER INSERT OR UPDATE ON contribution_payments
FOR EACH ROW
WHEN (NEW.payment_status = 'SUCCESS')
EXECUTE FUNCTION update_event_wallet_after_contribution();

-- 24. TRIGGER FUNCTION TO UPDATE EVENT WALLET AFTER VENDOR PAYMENT
CREATE OR REPLACE FUNCTION update_event_wallet_after_vendor_payment()
RETURNS TRIGGER AS $$ BEGIN
INSERT INTO event_wallets (event_id, total_inflow, total_outflow, current_balance)
VALUES (NEW.event_id, 0, 0, 0)
ON CONFLICT (event_id) DO NOTHING;

UPDATE event_wallets
SET
total_outflow = (
SELECT COALESCE(SUM(amount), 0)
FROM vendor_payments
WHERE event_id = NEW.event_id
AND payment_status = 'SUCCESS'
) + (
SELECT COALESCE(SUM(amount), 0)
FROM event_expenses
WHERE event_id = NEW.event_id
AND expense_status = 'PAID'
),
current_balance = total_inflow - (
(
SELECT COALESCE(SUM(amount), 0)
FROM vendor_payments
WHERE event_id = NEW.event_id
AND payment_status = 'SUCCESS'
) + (
SELECT COALESCE(SUM(amount), 0)
FROM event_expenses
WHERE event_id = NEW.event_id
AND expense_status = 'PAID'
)
),
updated_at = NOW()
WHERE event_id = NEW.event_id;

RETURN NEW;
END;
 $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_wallet_after_vendor_payment
AFTER INSERT OR UPDATE ON vendor_payments
FOR EACH ROW
WHEN (NEW.payment_status = 'SUCCESS')
EXECUTE FUNCTION update_event_wallet_after_vendor_payment();

-- 25. TRIGGER FUNCTION TO UPDATE EVENT WALLET AFTER EXPENSE PAYMENT
CREATE OR REPLACE FUNCTION update_event_wallet_after_expense()
RETURNS TRIGGER AS $$ BEGIN
INSERT INTO event_wallets (event_id, total_inflow, total_outflow, current_balance)
VALUES (NEW.event_id, 0, 0, 0)
ON CONFLICT (event_id) DO NOTHING;

UPDATE event_wallets
SET
total_outflow = (
SELECT COALESCE(SUM(amount), 0)
FROM vendor_payments
WHERE event_id = NEW.event_id
AND payment_status = 'SUCCESS'
) + (
SELECT COALESCE(SUM(amount), 0)
FROM event_expenses
WHERE event_id = NEW.event_id
AND expense_status = 'PAID'
),
current_balance = total_inflow - (
(
SELECT COALESCE(SUM(amount), 0)
FROM vendor_payments
WHERE event_id = NEW.event_id
AND payment_status = 'SUCCESS'
) + (
SELECT COALESCE(SUM(amount), 0)
FROM event_expenses
WHERE event_id = NEW.event_id
AND expense_status = 'PAID'
)
),
updated_at = NOW()
WHERE event_id = NEW.event_id;

RETURN NEW;
END;
 $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_wallet_after_expense
AFTER INSERT OR UPDATE ON event_expenses
FOR EACH ROW
WHEN (NEW.expense_status = 'PAID')
EXECUTE FUNCTION update_event_wallet_after_expense();

-- 26. OPTIONAL DEFAULT SETTINGS
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES
('platform_name', 'HarusiYangu', 'System display name'),
('default_currency', 'TZS', 'Default operating currency'),
('default_sms_sender_id', 'HARUSIYANGU', 'Default SMS sender ID'),
('allow_whatsapp_notifications', 'true', 'Enable WhatsApp notifications'),
('allow_sms_notifications', 'true', 'Enable SMS notifications');
SQL;

            DB::unprepared($sql);
        });
    }

    /**
     * Reverse the migrations.
     *
     * NOTE: We use 'DROP SCHEMA public CASCADE' instead of listing tables.
     * This is the professional standard for complex raw SQL migrations because it
     * automatically handles the dependency tree (Enums -> Tables -> Views -> Triggers)
     * without manual ordering errors.
     */
    public function down(): void
    {
        DB::statement('DROP SCHEMA public CASCADE');
        DB::statement('CREATE SCHEMA public');
    }
};
