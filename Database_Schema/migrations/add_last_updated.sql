-- Migration: add last_updated tracking to all tables
-- Idempotent — safe to re-run.
-- Run with: psql -h <host> -U <user> -d <db> -f Database_Schema/migrations/add_last_updated.sql

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add last_updated column to every table
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.alumni                        ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.courses_table                 ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.department                    ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.employees                     ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.ewd_yearwise                  ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.externship_info               ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.faculty_engagement            ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.iar_mous                      ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.icc_yearwise                  ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.icsr_consultancy_projects     ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.icsr_csr                      ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.icsr_sponsered_projects       ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.igrs_yearwise                 ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.industry_conclave             ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.industry_events               ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.innovation_projects           ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.iptif_facilities_table        ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.iptif_program_table           ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.iptif_projects_table          ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.iptif_startup_table           ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.nirf_ranking                  ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.nptel_courses                 ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.open_house                    ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.outreach                      ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.placement_companies           ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.placement_packages            ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.placement_summary             ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.research_mous                 ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.research_patents              ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.research_publications         ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.roles                         ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.student_table                 ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.techin_program_table          ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.techin_skill_development_program ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.techin_startup_table          ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.uba_events                    ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.uba_projects                  ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.users                         ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();

-- mou_partner_logos: only present after running add_mou_partner_logos.sql first
-- Uncomment once that migration has been applied:
ALTER TABLE public.mou_partner_logos ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Shared trigger function
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_last_updated()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Skip the timestamp bump if nothing actually changed (UPDATE only)
    IF TG_OP = 'UPDATE' AND NEW IS NOT DISTINCT FROM OLD THEN
        RETURN NEW;
    END IF;
    NEW.last_updated = now();
    RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Per-table triggers  (DROP IF EXISTS → CREATE to stay idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_alumni_last_updated                        ON public.alumni;
CREATE TRIGGER trg_alumni_last_updated
    BEFORE INSERT OR UPDATE ON public.alumni
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_courses_table_last_updated                 ON public.courses_table;
CREATE TRIGGER trg_courses_table_last_updated
    BEFORE INSERT OR UPDATE ON public.courses_table
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_department_last_updated                    ON public.department;
CREATE TRIGGER trg_department_last_updated
    BEFORE INSERT OR UPDATE ON public.department
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_employees_last_updated                     ON public.employees;
CREATE TRIGGER trg_employees_last_updated
    BEFORE INSERT OR UPDATE ON public.employees
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_ewd_yearwise_last_updated                  ON public.ewd_yearwise;
CREATE TRIGGER trg_ewd_yearwise_last_updated
    BEFORE INSERT OR UPDATE ON public.ewd_yearwise
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_externship_info_last_updated               ON public.externship_info;
CREATE TRIGGER trg_externship_info_last_updated
    BEFORE INSERT OR UPDATE ON public.externship_info
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_faculty_engagement_last_updated            ON public.faculty_engagement;
CREATE TRIGGER trg_faculty_engagement_last_updated
    BEFORE INSERT OR UPDATE ON public.faculty_engagement
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_iar_mous_last_updated                      ON public.iar_mous;
CREATE TRIGGER trg_iar_mous_last_updated
    BEFORE INSERT OR UPDATE ON public.iar_mous
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_icc_yearwise_last_updated                  ON public.icc_yearwise;
CREATE TRIGGER trg_icc_yearwise_last_updated
    BEFORE INSERT OR UPDATE ON public.icc_yearwise
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_icsr_consultancy_projects_last_updated     ON public.icsr_consultancy_projects;
CREATE TRIGGER trg_icsr_consultancy_projects_last_updated
    BEFORE INSERT OR UPDATE ON public.icsr_consultancy_projects
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_icsr_csr_last_updated                      ON public.icsr_csr;
CREATE TRIGGER trg_icsr_csr_last_updated
    BEFORE INSERT OR UPDATE ON public.icsr_csr
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_icsr_sponsered_projects_last_updated       ON public.icsr_sponsered_projects;
CREATE TRIGGER trg_icsr_sponsered_projects_last_updated
    BEFORE INSERT OR UPDATE ON public.icsr_sponsered_projects
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_igrs_yearwise_last_updated                 ON public.igrs_yearwise;
CREATE TRIGGER trg_igrs_yearwise_last_updated
    BEFORE INSERT OR UPDATE ON public.igrs_yearwise
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_industry_conclave_last_updated             ON public.industry_conclave;
CREATE TRIGGER trg_industry_conclave_last_updated
    BEFORE INSERT OR UPDATE ON public.industry_conclave
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_industry_events_last_updated               ON public.industry_events;
CREATE TRIGGER trg_industry_events_last_updated
    BEFORE INSERT OR UPDATE ON public.industry_events
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_innovation_projects_last_updated           ON public.innovation_projects;
CREATE TRIGGER trg_innovation_projects_last_updated
    BEFORE INSERT OR UPDATE ON public.innovation_projects
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_iptif_facilities_table_last_updated        ON public.iptif_facilities_table;
CREATE TRIGGER trg_iptif_facilities_table_last_updated
    BEFORE INSERT OR UPDATE ON public.iptif_facilities_table
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_iptif_program_table_last_updated           ON public.iptif_program_table;
CREATE TRIGGER trg_iptif_program_table_last_updated
    BEFORE INSERT OR UPDATE ON public.iptif_program_table
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_iptif_projects_table_last_updated          ON public.iptif_projects_table;
CREATE TRIGGER trg_iptif_projects_table_last_updated
    BEFORE INSERT OR UPDATE ON public.iptif_projects_table
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_iptif_startup_table_last_updated           ON public.iptif_startup_table;
CREATE TRIGGER trg_iptif_startup_table_last_updated
    BEFORE INSERT OR UPDATE ON public.iptif_startup_table
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_nirf_ranking_last_updated                  ON public.nirf_ranking;
CREATE TRIGGER trg_nirf_ranking_last_updated
    BEFORE INSERT OR UPDATE ON public.nirf_ranking
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_nptel_courses_last_updated                 ON public.nptel_courses;
CREATE TRIGGER trg_nptel_courses_last_updated
    BEFORE INSERT OR UPDATE ON public.nptel_courses
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_open_house_last_updated                    ON public.open_house;
CREATE TRIGGER trg_open_house_last_updated
    BEFORE INSERT OR UPDATE ON public.open_house
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_outreach_last_updated                      ON public.outreach;
CREATE TRIGGER trg_outreach_last_updated
    BEFORE INSERT OR UPDATE ON public.outreach
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_placement_companies_last_updated           ON public.placement_companies;
CREATE TRIGGER trg_placement_companies_last_updated
    BEFORE INSERT OR UPDATE ON public.placement_companies
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_placement_packages_last_updated            ON public.placement_packages;
CREATE TRIGGER trg_placement_packages_last_updated
    BEFORE INSERT OR UPDATE ON public.placement_packages
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_placement_summary_last_updated             ON public.placement_summary;
CREATE TRIGGER trg_placement_summary_last_updated
    BEFORE INSERT OR UPDATE ON public.placement_summary
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_research_mous_last_updated                 ON public.research_mous;
CREATE TRIGGER trg_research_mous_last_updated
    BEFORE INSERT OR UPDATE ON public.research_mous
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_research_patents_last_updated              ON public.research_patents;
CREATE TRIGGER trg_research_patents_last_updated
    BEFORE INSERT OR UPDATE ON public.research_patents
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_research_publications_last_updated         ON public.research_publications;
CREATE TRIGGER trg_research_publications_last_updated
    BEFORE INSERT OR UPDATE ON public.research_publications
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_roles_last_updated                         ON public.roles;
CREATE TRIGGER trg_roles_last_updated
    BEFORE INSERT OR UPDATE ON public.roles
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_student_table_last_updated                 ON public.student_table;
CREATE TRIGGER trg_student_table_last_updated
    BEFORE INSERT OR UPDATE ON public.student_table
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_techin_program_table_last_updated          ON public.techin_program_table;
CREATE TRIGGER trg_techin_program_table_last_updated
    BEFORE INSERT OR UPDATE ON public.techin_program_table
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_techin_skill_development_program_last_updated ON public.techin_skill_development_program;
CREATE TRIGGER trg_techin_skill_development_program_last_updated
    BEFORE INSERT OR UPDATE ON public.techin_skill_development_program
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_techin_startup_table_last_updated          ON public.techin_startup_table;
CREATE TRIGGER trg_techin_startup_table_last_updated
    BEFORE INSERT OR UPDATE ON public.techin_startup_table
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_uba_events_last_updated                    ON public.uba_events;
CREATE TRIGGER trg_uba_events_last_updated
    BEFORE INSERT OR UPDATE ON public.uba_events
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_uba_projects_last_updated                  ON public.uba_projects;
CREATE TRIGGER trg_uba_projects_last_updated
    BEFORE INSERT OR UPDATE ON public.uba_projects
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

DROP TRIGGER IF EXISTS trg_users_last_updated                         ON public.users;
CREATE TRIGGER trg_users_last_updated
    BEFORE INSERT OR UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Indexes on last_updated (for fast MAX queries)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_alumni_last_updated                        ON public.alumni (last_updated);
CREATE INDEX IF NOT EXISTS idx_courses_table_last_updated                 ON public.courses_table (last_updated);
CREATE INDEX IF NOT EXISTS idx_department_last_updated                    ON public.department (last_updated);
CREATE INDEX IF NOT EXISTS idx_employees_last_updated                     ON public.employees (last_updated);
CREATE INDEX IF NOT EXISTS idx_ewd_yearwise_last_updated                  ON public.ewd_yearwise (last_updated);
CREATE INDEX IF NOT EXISTS idx_externship_info_last_updated               ON public.externship_info (last_updated);
CREATE INDEX IF NOT EXISTS idx_faculty_engagement_last_updated            ON public.faculty_engagement (last_updated);
CREATE INDEX IF NOT EXISTS idx_iar_mous_last_updated                      ON public.iar_mous (last_updated);
CREATE INDEX IF NOT EXISTS idx_icc_yearwise_last_updated                  ON public.icc_yearwise (last_updated);
CREATE INDEX IF NOT EXISTS idx_icsr_consultancy_projects_last_updated     ON public.icsr_consultancy_projects (last_updated);
CREATE INDEX IF NOT EXISTS idx_icsr_csr_last_updated                      ON public.icsr_csr (last_updated);
CREATE INDEX IF NOT EXISTS idx_icsr_sponsered_projects_last_updated       ON public.icsr_sponsered_projects (last_updated);
CREATE INDEX IF NOT EXISTS idx_igrs_yearwise_last_updated                 ON public.igrs_yearwise (last_updated);
CREATE INDEX IF NOT EXISTS idx_industry_conclave_last_updated             ON public.industry_conclave (last_updated);
CREATE INDEX IF NOT EXISTS idx_industry_events_last_updated               ON public.industry_events (last_updated);
CREATE INDEX IF NOT EXISTS idx_innovation_projects_last_updated           ON public.innovation_projects (last_updated);
CREATE INDEX IF NOT EXISTS idx_iptif_facilities_table_last_updated        ON public.iptif_facilities_table (last_updated);
CREATE INDEX IF NOT EXISTS idx_iptif_program_table_last_updated           ON public.iptif_program_table (last_updated);
CREATE INDEX IF NOT EXISTS idx_iptif_projects_table_last_updated          ON public.iptif_projects_table (last_updated);
CREATE INDEX IF NOT EXISTS idx_iptif_startup_table_last_updated           ON public.iptif_startup_table (last_updated);
CREATE INDEX IF NOT EXISTS idx_nirf_ranking_last_updated                  ON public.nirf_ranking (last_updated);
CREATE INDEX IF NOT EXISTS idx_nptel_courses_last_updated                 ON public.nptel_courses (last_updated);
CREATE INDEX IF NOT EXISTS idx_open_house_last_updated                    ON public.open_house (last_updated);
CREATE INDEX IF NOT EXISTS idx_outreach_last_updated                      ON public.outreach (last_updated);
CREATE INDEX IF NOT EXISTS idx_placement_companies_last_updated           ON public.placement_companies (last_updated);
CREATE INDEX IF NOT EXISTS idx_placement_packages_last_updated            ON public.placement_packages (last_updated);
CREATE INDEX IF NOT EXISTS idx_placement_summary_last_updated             ON public.placement_summary (last_updated);
CREATE INDEX IF NOT EXISTS idx_research_mous_last_updated                 ON public.research_mous (last_updated);
CREATE INDEX IF NOT EXISTS idx_research_patents_last_updated              ON public.research_patents (last_updated);
CREATE INDEX IF NOT EXISTS idx_research_publications_last_updated         ON public.research_publications (last_updated);
CREATE INDEX IF NOT EXISTS idx_roles_last_updated                         ON public.roles (last_updated);
CREATE INDEX IF NOT EXISTS idx_student_table_last_updated                 ON public.student_table (last_updated);
CREATE INDEX IF NOT EXISTS idx_techin_program_table_last_updated          ON public.techin_program_table (last_updated);
CREATE INDEX IF NOT EXISTS idx_techin_skill_development_program_last_updated ON public.techin_skill_development_program (last_updated);
CREATE INDEX IF NOT EXISTS idx_techin_startup_table_last_updated          ON public.techin_startup_table (last_updated);
CREATE INDEX IF NOT EXISTS idx_uba_events_last_updated                    ON public.uba_events (last_updated);
CREATE INDEX IF NOT EXISTS idx_uba_projects_last_updated                  ON public.uba_projects (last_updated);
CREATE INDEX IF NOT EXISTS idx_users_last_updated                         ON public.users (last_updated);

COMMIT;
