-- ============================================================================
-- V2: Update reports status check constraint to include RESOLVED
-- ============================================================================

ALTER TABLE reports DROP CONSTRAINT IF EXISTS chk_report_status;
ALTER TABLE reports ADD CONSTRAINT chk_report_status 
    CHECK (status IN ('PENDING', 'REVIEWED', 'DISMISSED', 'ACTIONED', 'RESOLVED'));
