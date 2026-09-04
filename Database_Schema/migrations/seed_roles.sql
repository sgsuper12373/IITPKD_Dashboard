-- public.roles was never seeded anywhere in schema_dump.sql, but every
-- users.role_id is a foreign key into it (fk_role) — so on a database
-- restored before this fix, every user insert (login provisioning, guest
-- login, create_admin.py, /auth/create-user, /auth/google) fails with
-- "violates foreign key constraint fk_role". Idempotent — safe to re-run.
-- Source of truth for the id -> name mapping: Frontend/src/utils/rolePermissions.js (ROLE_NAMES).
INSERT INTO public.roles (id, name) VALUES
    (0,  'Guest'),
    (1,  'Management View'),
    (2,  'Administration Section'),
    (3,  'Master Admin'),
    (4,  'Academic Section'),
    (5,  'IAR'),
    (6,  'EWD'),
    (7,  'IGRC'),
    (8,  'ICC'),
    (9,  'ICSR'),
    (10, 'Library'),
    (11, 'CDC'),
    (12, 'IAC'),
    (13, 'TechIn'),
    (14, 'IPTIF'),
    (15, 'Open House'),
    (16, 'CCE'),
    (17, 'UBA'),
    (18, 'Science Quest'),
    (19, 'PMC'),
    (20, 'PBD'),
    (21, 'Institute Visits'),
    (22, 'NSS')
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.roles_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM public.roles), false);
