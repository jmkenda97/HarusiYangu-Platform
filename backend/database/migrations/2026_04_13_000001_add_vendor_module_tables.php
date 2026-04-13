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
        // ALTER TYPE ADD VALUE cannot run inside a transaction in PostgreSQL
        // Execute this OUTSIDE the transaction first
        DB::statement("ALTER TYPE vendor_status ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL' BEFORE 'ACTIVE'");

        DB::transaction(function () {
            $sql = <<<'SQL'
-- 1. ALTER vendors table - add user_id column
ALTER TABLE vendors ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE vendors ADD CONSTRAINT uq_vendors_user_id UNIQUE(user_id);

-- 2. CREATE vendor_services table
CREATE TABLE vendor_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    service_name VARCHAR(255) NOT NULL,
    service_type vendor_service_type NOT NULL,
    description TEXT,
    min_price NUMERIC(14,2) NOT NULL CHECK (min_price >= 0),
    max_price NUMERIC(14,2) CHECK (max_price IS NULL OR max_price >= min_price),
    price_unit VARCHAR(50) DEFAULT 'per_event',
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vendor_services_vendor_id ON vendor_services(vendor_id);
CREATE INDEX idx_vendor_services_service_type ON vendor_services(service_type);

-- 3. CREATE vendor_documents table
CREATE TABLE vendor_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100),
    file_size BIGINT,
    verification_status VARCHAR(50) DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vendor_documents_vendor_id ON vendor_documents(vendor_id);
CREATE INDEX idx_vendor_documents_status ON vendor_documents(verification_status);

-- 4. Create trigger for updated_at on vendor_services
CREATE TRIGGER trg_vendor_services_updated_at
    BEFORE UPDATE ON vendor_services
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
SQL;

            DB::unprepared($sql);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS vendor_documents CASCADE');
        DB::statement('DROP TABLE IF EXISTS vendor_services CASCADE');
        DB::statement('ALTER TABLE vendors DROP COLUMN IF EXISTS user_id');
        // Note: Cannot remove enum values in PostgreSQL, so PENDING_APPROVAL remains
    }
};
