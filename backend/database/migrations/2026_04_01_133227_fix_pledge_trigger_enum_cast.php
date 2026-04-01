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
            -- 1. Drop the existing Trigger
            DROP TRIGGER IF EXISTS trg_update_pledge_after_payment_insert ON contribution_payments;

            -- 2. Drop the old Function
            DROP FUNCTION IF EXISTS update_pledge_payment_totals();

            -- 3. Recreate Function with the FIX (Added ::contribution_status cast)
            CREATE OR REPLACE FUNCTION update_pledge_payment_totals()
            RETURNS TRIGGER AS $$             BEGIN
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
                    -- FIX: We cast the CASE result to 'contribution_status' type
                    contribution_status = (
                        CASE
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
                        END
                    )::contribution_status,
                    updated_at = NOW()
                WHERE id = NEW.pledge_id;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            -- 4. Recreate the Trigger
            CREATE TRIGGER trg_update_pledge_after_payment_insert
            AFTER INSERT OR UPDATE ON contribution_payments
            FOR EACH ROW
            WHEN (NEW.payment_status = 'SUCCESS')
            EXECUTE FUNCTION update_pledge_payment_totals();
SQL;

            DB::unprepared($sql);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS trg_update_pledge_after_payment_insert ON contribution_payments');
        DB::statement('DROP FUNCTION IF EXISTS update_pledge_payment_totals()');
    }
};
