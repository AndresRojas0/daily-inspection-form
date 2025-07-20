-- Verify tables exist and show their structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('daily_inspection_forms', 'service_checks')
ORDER BY table_name, ordinal_position;

-- Show any existing data
SELECT 'daily_inspection_forms' as table_name, COUNT(*) as record_count 
FROM daily_inspection_forms
UNION ALL
SELECT 'service_checks' as table_name, COUNT(*) as record_count 
FROM service_checks;

-- Test insert (this will be rolled back)
BEGIN;
INSERT INTO daily_inspection_forms (title, inspector_name, date, place_of_work) 
VALUES ('TEST', 'Test Inspector', CURRENT_DATE, 'Test Location');
ROLLBACK;

SELECT 'Database setup verification complete' as status;
