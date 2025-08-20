-- Add non_compliance column to service_checks table
ALTER TABLE service_checks 
ADD COLUMN IF NOT EXISTS non_compliance BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for better performance when filtering by non-compliance
CREATE INDEX IF NOT EXISTS idx_service_checks_non_compliance ON service_checks(non_compliance);

-- Update any existing records to have non_compliance = false (already the default)
UPDATE service_checks SET non_compliance = FALSE WHERE non_compliance IS NULL;

-- Create the non_compliance_reports table
CREATE TABLE IF NOT EXISTS non_compliance_reports (
    id SERIAL PRIMARY KEY,
    service_check_id INTEGER NOT NULL REFERENCES service_checks(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
    assigned_to VARCHAR(255),
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for the new table
CREATE INDEX IF NOT EXISTS idx_non_compliance_reports_service_check_id ON non_compliance_reports(service_check_id);
CREATE INDEX IF NOT EXISTS idx_non_compliance_reports_status ON non_compliance_reports(status);
CREATE INDEX IF NOT EXISTS idx_non_compliance_reports_assigned_to ON non_compliance_reports(assigned_to);

-- Create trigger to automatically update updated_at for non_compliance_reports
CREATE TRIGGER update_non_compliance_reports_updated_at
    BEFORE UPDATE ON non_compliance_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT 'Non-compliance column and reports table added successfully' as status;
