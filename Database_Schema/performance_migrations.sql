-- Migration: Create standardized views for performance and logic centralization
-- This view handles the engagement type standardization logic in one place.

CREATE OR REPLACE VIEW v_faculty_engagement_standardized AS
SELECT 
    *,
    CASE
        WHEN engagement_type ILIKE '%Adjunct%' THEN 'Adjunct'
        WHEN engagement_type ILIKE '%Honorary%' THEN 'Honorary'
        WHEN engagement_type ILIKE '%Visiting%' THEN 'Visiting'
        WHEN engagement_type ILIKE '%Faculty Fellow%' OR engagement_type ILIKE '%FacultyFellow%' THEN 'FacultyFellow'
        WHEN engagement_type ILIKE '%PoP%' OR engagement_type ILIKE '%Professor of Practice%' OR engagement_type ILIKE '%Practice%' THEN 'PoP'
        ELSE 'Other'
    END AS std_type,
    CASE 
        WHEN enddate IS NULL OR enddate > CURRENT_DATE THEN 'Active'
        ELSE 'Inactive'
    END AS current_status
FROM faculty_engagement;

-- Add indexes to support fast filtering (if not already present)
CREATE INDEX IF NOT EXISTS idx_faculty_engagement_year ON faculty_engagement(year);
CREATE INDEX IF NOT EXISTS idx_faculty_engagement_dept ON faculty_engagement(department);
CREATE INDEX IF NOT EXISTS idx_faculty_engagement_startdate ON faculty_engagement(startdate);
