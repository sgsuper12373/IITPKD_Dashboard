-- Least-privilege read surface for the public dashboard stats endpoints
-- (administrative_stats.py, academic_stats.py), so a leaked/misused
-- application-level connection can only ever reach the handful of
-- demographic columns those endpoints actually use — never salary, contact
-- details, health/disability status, or any other column on the base
-- employees / student_table tables.
--
-- Two views per table:
--   *_dashboard_view — everyone (public, anonymous visitors)
--   *_admin_view     — management (role_id=3) only, adds appointed_category /
--                      original_category / pwd_status. Still not the raw
--                      table: basicpay, personalmail, and everything else
--                      stays out even for management, on this read path.
--
-- Plain views, not materialized: these tables are small (thousands, not
-- millions, of rows), so a live view costs nothing meaningful and never
-- goes stale. Run setup_dashboard_roles.py separately to create the two
-- Postgres roles that are actually granted access to these views — a view
-- alone is advisory, not a security boundary, until paired with a role
-- that has no grant on the base table at all.

CREATE OR REPLACE VIEW employees_dashboard_view AS
SELECT
    id, department, designation, gender, emp_type, empstatus,
    group_name, doj, dor, last_updated
FROM employees;

CREATE OR REPLACE VIEW students_dashboard_view AS
SELECT
    admission_year, admission_batch, programme_current, stream_current,
    department_current, academic_program_type, student_status,
    gender, state, nationality
FROM student_table;

CREATE OR REPLACE VIEW employees_admin_view AS
SELECT
    id, department, designation, gender, emp_type, empstatus,
    group_name, appointed_category, doj, dor, last_updated
FROM employees;

CREATE OR REPLACE VIEW students_admin_view AS
SELECT
    admission_year, admission_batch, programme_current, stream_current,
    department_current, academic_program_type, student_status,
    gender, state, nationality, original_category, pwd_status
FROM student_table;
