-- First, let's check if the tables already exist and drop them if needed for a clean start
DROP TABLE IF EXISTS out_of_section_service_checks CASCADE;
DROP TABLE IF EXISTS out_of_section_forms CASCADE;

-- Create the out_of_section_forms table
CREATE TABLE IF NOT EXISTS out_of_section_forms (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL DEFAULT 'OUT-OF-SECTION TICKETS (PASADOS)',
    inspector_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    place_of_work VARCHAR(255) NOT NULL,
    line_or_route_number VARCHAR(100) NOT NULL,
    direction VARCHAR(50) NOT NULL,
    total_of_services INTEGER NOT NULL DEFAULT 0,
    total_of_passengers INTEGER NOT NULL DEFAULT 0,
    total_of_oos INTEGER NOT NULL DEFAULT 0,
    total_of_passes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the out_of_section_service_checks table
CREATE TABLE IF NOT EXISTS out_of_section_service_checks (
    id SERIAL PRIMARY KEY,
    form_id INTEGER NOT NULL REFERENCES out_of_section_forms(id) ON DELETE CASCADE,
    service_code VARCHAR(100) NOT NULL,
    line_route_branch VARCHAR(100) NOT NULL,
    exact_hour_of_schedule TIME NOT NULL,
    gps_minutes INTEGER NOT NULL DEFAULT 0,
    gps_seconds INTEGER NOT NULL DEFAULT 0,
    gps_status VARCHAR(20) NOT NULL CHECK (gps_status IN ('on-time', 'early', 'late')),
    passengers_on_board INTEGER NOT NULL DEFAULT 0,
    out_of_section_tickets INTEGER NOT NULL DEFAULT 0,
    passes_used INTEGER NOT NULL DEFAULT 0,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_out_of_section_forms_date ON out_of_section_forms(date);
CREATE INDEX IF NOT EXISTS idx_out_of_section_forms_inspector ON out_of_section_forms(inspector_name);
CREATE INDEX IF NOT EXISTS idx_out_of_section_service_checks_form_id ON out_of_section_service_checks(form_id);
CREATE INDEX IF NOT EXISTS idx_out_of_section_service_checks_route ON out_of_section_service_checks(line_or_route_number);

-- Create trigger to automatically update updated_at for out_of_section_forms
CREATE TRIGGER update_out_of_section_forms_updated_at 
    BEFORE UPDATE ON out_of_section_forms 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify tables were created
SELECT 'out_of_section_forms' as table_name, COUNT(*) as record_count FROM out_of_section_forms
UNION ALL
SELECT 'out_of_section_service_checks' as table_name, COUNT(*) as record_count FROM out_of_section_service_checks;

SELECT 'Out-of-section tables created successfully' as status;
