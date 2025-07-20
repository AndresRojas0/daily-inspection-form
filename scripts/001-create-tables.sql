-- Create the daily_inspection_forms table
CREATE TABLE IF NOT EXISTS daily_inspection_forms (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL DEFAULT 'DAILY INSPECTION FORM',
    inspector_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    place_of_work VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the service_checks table
CREATE TABLE IF NOT EXISTS service_checks (
    id SERIAL PRIMARY KEY,
    form_id INTEGER NOT NULL REFERENCES daily_inspection_forms(id) ON DELETE CASCADE,
    line_or_route_number VARCHAR(100) NOT NULL,
    driver_name VARCHAR(255) NOT NULL,
    service_code VARCHAR(100) NOT NULL,
    fleet_coach_number VARCHAR(100) NOT NULL,
    exact_hour_of_arrival TIME NOT NULL,
    gps_minutes INTEGER NOT NULL DEFAULT 0,
    gps_status VARCHAR(20) NOT NULL CHECK (gps_status IN ('on-time', 'early', 'late')),
    passengers_on_board INTEGER NOT NULL DEFAULT 0,
    passes_used INTEGER NOT NULL DEFAULT 0,
    address_of_stop TEXT NOT NULL,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_inspection_forms_date ON daily_inspection_forms(date);
CREATE INDEX IF NOT EXISTS idx_daily_inspection_forms_inspector ON daily_inspection_forms(inspector_name);
CREATE INDEX IF NOT EXISTS idx_service_checks_form_id ON service_checks(form_id);
CREATE INDEX IF NOT EXISTS idx_service_checks_route ON service_checks(line_or_route_number);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_daily_inspection_forms_updated_at 
    BEFORE UPDATE ON daily_inspection_forms 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
