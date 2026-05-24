-- Rollback: remove last_updated tracking from all tables
-- Reverses add_last_updated.sql completely.
-- Run with: psql -h <host> -U <user> -d <db> -f Database_Schema/migrations/rollback_last_updated.sql

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Drop triggers
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_alumni_last_updated                           ON public.alumni;
DROP TRIGGER IF EXISTS trg_courses_table_last_updated                    ON public.courses_table;
DROP TRIGGER IF EXISTS trg_department_last_updated                       ON public.department;
DROP TRIGGER IF EXISTS trg_employees_last_updated                        ON public.employees;
DROP TRIGGER IF EXISTS trg_ewd_yearwise_last_updated                     ON public.ewd_yearwise;
DROP TRIGGER IF EXISTS trg_externship_info_last_updated                  ON public.externship_info;
DROP TRIGGER IF EXISTS trg_faculty_engagement_last_updated               ON public.faculty_engagement;
DROP TRIGGER IF EXISTS trg_iar_mous_last_updated                         ON public.iar_mous;
DROP TRIGGER IF EXISTS trg_icc_yearwise_last_updated                     ON public.icc_yearwise;
DROP TRIGGER IF EXISTS trg_icsr_consultancy_projects_last_updated        ON public.icsr_consultancy_projects;
DROP TRIGGER IF EXISTS trg_icsr_csr_last_updated                         ON public.icsr_csr;
DROP TRIGGER IF EXISTS trg_icsr_sponsered_projects_last_updated          ON public.icsr_sponsered_projects;
DROP TRIGGER IF EXISTS trg_igrs_yearwise_last_updated                    ON public.igrs_yearwise;
DROP TRIGGER IF EXISTS trg_industry_conclave_last_updated                ON public.industry_conclave;
DROP TRIGGER IF EXISTS trg_industry_events_last_updated                  ON public.industry_events;
DROP TRIGGER IF EXISTS trg_innovation_projects_last_updated              ON public.innovation_projects;
DROP TRIGGER IF EXISTS trg_iptif_facilities_table_last_updated           ON public.iptif_facilities_table;
DROP TRIGGER IF EXISTS trg_iptif_program_table_last_updated              ON public.iptif_program_table;
DROP TRIGGER IF EXISTS trg_iptif_projects_table_last_updated             ON public.iptif_projects_table;
DROP TRIGGER IF EXISTS trg_iptif_startup_table_last_updated              ON public.iptif_startup_table;
DROP TRIGGER IF EXISTS trg_nirf_ranking_last_updated                     ON public.nirf_ranking;
DROP TRIGGER IF EXISTS trg_nptel_courses_last_updated                    ON public.nptel_courses;
DROP TRIGGER IF EXISTS trg_open_house_last_updated                       ON public.open_house;
DROP TRIGGER IF EXISTS trg_outreach_last_updated                         ON public.outreach;
DROP TRIGGER IF EXISTS trg_placement_companies_last_updated              ON public.placement_companies;
DROP TRIGGER IF EXISTS trg_placement_packages_last_updated               ON public.placement_packages;
DROP TRIGGER IF EXISTS trg_placement_summary_last_updated                ON public.placement_summary;
DROP TRIGGER IF EXISTS trg_research_mous_last_updated                    ON public.research_mous;
DROP TRIGGER IF EXISTS trg_research_patents_last_updated                 ON public.research_patents;
DROP TRIGGER IF EXISTS trg_research_publications_last_updated            ON public.research_publications;
DROP TRIGGER IF EXISTS trg_roles_last_updated                            ON public.roles;
DROP TRIGGER IF EXISTS trg_student_table_last_updated                    ON public.student_table;
DROP TRIGGER IF EXISTS trg_techin_program_table_last_updated             ON public.techin_program_table;
DROP TRIGGER IF EXISTS trg_techin_skill_development_program_last_updated ON public.techin_skill_development_program;
DROP TRIGGER IF EXISTS trg_techin_startup_table_last_updated             ON public.techin_startup_table;
DROP TRIGGER IF EXISTS trg_uba_events_last_updated                       ON public.uba_events;
DROP TRIGGER IF EXISTS trg_uba_projects_last_updated                     ON public.uba_projects;
DROP TRIGGER IF EXISTS trg_users_last_updated                            ON public.users;
DROP TRIGGER IF EXISTS trg_mou_partner_logos_last_updated                ON public.mou_partner_logos;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Drop trigger function
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.set_last_updated();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Drop indexes
-- ─────────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_alumni_last_updated;
DROP INDEX IF EXISTS public.idx_courses_table_last_updated;
DROP INDEX IF EXISTS public.idx_department_last_updated;
DROP INDEX IF EXISTS public.idx_employees_last_updated;
DROP INDEX IF EXISTS public.idx_ewd_yearwise_last_updated;
DROP INDEX IF EXISTS public.idx_externship_info_last_updated;
DROP INDEX IF EXISTS public.idx_faculty_engagement_last_updated;
DROP INDEX IF EXISTS public.idx_iar_mous_last_updated;
DROP INDEX IF EXISTS public.idx_icc_yearwise_last_updated;
DROP INDEX IF EXISTS public.idx_icsr_consultancy_projects_last_updated;
DROP INDEX IF EXISTS public.idx_icsr_csr_last_updated;
DROP INDEX IF EXISTS public.idx_icsr_sponsered_projects_last_updated;
DROP INDEX IF EXISTS public.idx_igrs_yearwise_last_updated;
DROP INDEX IF EXISTS public.idx_industry_conclave_last_updated;
DROP INDEX IF EXISTS public.idx_industry_events_last_updated;
DROP INDEX IF EXISTS public.idx_innovation_projects_last_updated;
DROP INDEX IF EXISTS public.idx_iptif_facilities_table_last_updated;
DROP INDEX IF EXISTS public.idx_iptif_program_table_last_updated;
DROP INDEX IF EXISTS public.idx_iptif_projects_table_last_updated;
DROP INDEX IF EXISTS public.idx_iptif_startup_table_last_updated;
DROP INDEX IF EXISTS public.idx_nirf_ranking_last_updated;
DROP INDEX IF EXISTS public.idx_nptel_courses_last_updated;
DROP INDEX IF EXISTS public.idx_open_house_last_updated;
DROP INDEX IF EXISTS public.idx_outreach_last_updated;
DROP INDEX IF EXISTS public.idx_placement_companies_last_updated;
DROP INDEX IF EXISTS public.idx_placement_packages_last_updated;
DROP INDEX IF EXISTS public.idx_placement_summary_last_updated;
DROP INDEX IF EXISTS public.idx_research_mous_last_updated;
DROP INDEX IF EXISTS public.idx_research_patents_last_updated;
DROP INDEX IF EXISTS public.idx_research_publications_last_updated;
DROP INDEX IF EXISTS public.idx_roles_last_updated;
DROP INDEX IF EXISTS public.idx_student_table_last_updated;
DROP INDEX IF EXISTS public.idx_techin_program_table_last_updated;
DROP INDEX IF EXISTS public.idx_techin_skill_development_program_last_updated;
DROP INDEX IF EXISTS public.idx_techin_startup_table_last_updated;
DROP INDEX IF EXISTS public.idx_uba_events_last_updated;
DROP INDEX IF EXISTS public.idx_uba_projects_last_updated;
DROP INDEX IF EXISTS public.idx_users_last_updated;
DROP INDEX IF EXISTS public.idx_mou_partner_logos_last_updated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Drop columns
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.alumni                           DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.courses_table                    DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.department                       DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.employees                        DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.ewd_yearwise                     DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.externship_info                  DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.faculty_engagement               DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.iar_mous                         DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.icc_yearwise                     DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.icsr_consultancy_projects        DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.icsr_csr                         DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.icsr_sponsered_projects          DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.igrs_yearwise                    DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.industry_conclave                DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.industry_events                  DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.innovation_projects              DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.iptif_facilities_table           DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.iptif_program_table              DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.iptif_projects_table             DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.iptif_startup_table              DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.nirf_ranking                     DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.nptel_courses                    DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.open_house                       DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.outreach                         DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.placement_companies              DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.placement_packages               DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.placement_summary                DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.research_mous                    DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.research_patents                 DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.research_publications            DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.roles                            DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.student_table                    DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.techin_program_table             DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.techin_skill_development_program DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.techin_startup_table             DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.uba_events                       DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.uba_projects                     DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.users                            DROP COLUMN IF EXISTS last_updated;
ALTER TABLE public.mou_partner_logos                DROP COLUMN IF EXISTS last_updated;

COMMIT;
