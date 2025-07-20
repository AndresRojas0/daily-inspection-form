-- Add non_compliance column to service_checks table
ALTER TABLE service_checks 
ADD COLUMN non_compliance BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for better performance when filtering by non-compliance
CREATE INDEX IF NOT EXISTS idx_service_checks_non_compliance ON service_checks(non_compliance);

-- Update any existing records to have non_compliance = false (already the default)
UPDATE service_checks SET non_compliance = FALSE WHERE non_compliance IS NULL;

SELECT 'Non-compliance column added successfully' as status;
