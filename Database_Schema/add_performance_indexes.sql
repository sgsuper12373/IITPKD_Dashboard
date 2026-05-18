-- Performance indexes for frequently-filtered columns.
-- Run once on the target database.
-- All statements use IF NOT EXISTS so re-running is safe.

-- ── student_table ─────────────────────────────────────────────────────────────
-- These columns appear in WHERE clauses for every filter-options call
-- (7 queries per call, each scanning the table unless indexed).
CREATE INDEX IF NOT EXISTS idx_student_admission_year
    ON student_table (admission_year);

CREATE INDEX IF NOT EXISTS idx_student_programme
    ON student_table (programme_current);

CREATE INDEX IF NOT EXISTS idx_student_batch
    ON student_table (admission_batch);

CREATE INDEX IF NOT EXISTS idx_student_stream
    ON student_table (stream_current);

CREATE INDEX IF NOT EXISTS idx_student_department
    ON student_table (department_current);

CREATE INDEX IF NOT EXISTS idx_student_category
    ON student_table (original_category);

CREATE INDEX IF NOT EXISTS idx_student_gender
    ON student_table (gender);

CREATE INDEX IF NOT EXISTS idx_student_state
    ON student_table (state);

CREATE INDEX IF NOT EXISTS idx_student_status
    ON student_table (student_status);

CREATE INDEX IF NOT EXISTS idx_student_program_type
    ON student_table (academic_program_type);

-- ── employees ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_employees_emp_type
    ON employees (emp_type);

CREATE INDEX IF NOT EXISTS idx_employees_department
    ON employees (department);

CREATE INDEX IF NOT EXISTS idx_employees_designation
    ON employees (designation);

CREATE INDEX IF NOT EXISTS idx_employees_gender
    ON employees (gender);

CREATE INDEX IF NOT EXISTS idx_employees_group_name
    ON employees (group_name);

CREATE INDEX IF NOT EXISTS idx_employees_appointed_category
    ON employees (appointed_category);

CREATE INDEX IF NOT EXISTS idx_employees_empstatus
    ON employees (empstatus);

-- doj is used for year extraction in date-range filters
CREATE INDEX IF NOT EXISTS idx_employees_doj
    ON employees (doj);

-- ── placement tables ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_placement_summary_year
    ON placement_summary (placement_year);

CREATE INDEX IF NOT EXISTS idx_placement_summary_program
    ON placement_summary (program);

CREATE INDEX IF NOT EXISTS idx_placement_summary_gender
    ON placement_summary (gender);

CREATE INDEX IF NOT EXISTS idx_placement_summary_branch
    ON placement_summary (branch);

CREATE INDEX IF NOT EXISTS idx_placement_companies_sector
    ON placement_companies (sector);

CREATE INDEX IF NOT EXISTS idx_placement_companies_year
    ON placement_companies (placement_year);

CREATE INDEX IF NOT EXISTS idx_placement_packages_year
    ON placement_packages (placement_year);

-- ── ICSR research tables ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_icsr_sponsored_year
    ON icsr_sponsered_projects (year);

CREATE INDEX IF NOT EXISTS idx_icsr_sponsored_department
    ON icsr_sponsered_projects (department);

CREATE INDEX IF NOT EXISTS idx_icsr_consultancy_year
    ON icsr_consultancy_projects (year);

CREATE INDEX IF NOT EXISTS idx_icsr_consultancy_department
    ON icsr_consultancy_projects (department);
