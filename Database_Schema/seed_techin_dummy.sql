-- Dummy data for TechIn (Technology Innovation Foundation) section.
-- Safe to re-run: clears the three TechIn tables before inserting.
-- Spans multiple years so trend charts and revenue metrics render meaningfully.

BEGIN;

TRUNCATE public.techin_program_table,
         public.techin_skill_development_program,
         public.techin_startup_table
RESTART IDENTITY;

-- ----------------------------------------------------------------------------
-- techin_program_table
-- ----------------------------------------------------------------------------
INSERT INTO public.techin_program_table
    (id, program_name, type, association, start_end, event_date, targetted_audience, no_of_attendess, remarks)
VALUES
    (1, 'Startup Bootcamp 2022',        'Workshop',   'NSRCEL',            '2022-02-10', '2022-02-12', 'Students',        85,  'Three-day intensive bootcamp'),
    (2, 'Innovation Challenge 2022',    'Competition','IIT Palakkad',      '2022-08-05', '2022-08-06', 'Students',       120,  'Inter-college innovation contest'),
    (3, 'TechIn Mentor Connect 2023',  'Seminar',    'TIDE 2.0',          '2023-03-15', '2023-03-15', 'Entrepreneurs',   60,  'Mentor networking session'),
    (4, 'Deep Tech Conclave 2023',     'Conference', 'MeitY',             '2023-09-20', '2023-09-22', 'Industry',       210,  'Flagship deep-tech conference'),
    (5, 'Idea to Prototype 2024',      'Workshop',   'AICTE',             '2024-01-18', '2024-01-20', 'Students',        95,  'Hands-on prototyping workshop'),
    (6, 'Women in Tech Summit 2024',   'Conference', 'WeHub',             '2024-07-11', '2024-07-12', 'Professionals',  140,  'Empowering women entrepreneurs'),
    (7, 'Founder Fireside 2025',       'Seminar',    'IIT Palakkad',      '2025-02-25', '2025-02-25', 'Entrepreneurs',   75,  'Fireside chat with founders'),
    (8, 'AI Startup Sprint 2025',      'Competition','NVIDIA Inception',  '2025-09-08', '2025-09-10', 'Startups',       160,  'AI-focused startup sprint');

-- ----------------------------------------------------------------------------
-- techin_skill_development_program
-- ----------------------------------------------------------------------------
INSERT INTO public.techin_skill_development_program
    (id, program_name, category, association, start_end, event_date, targetted_audience, no_of_attendess, remarks)
VALUES
    (1, 'Python for Data Science 2022', 'Technical',     'NPTEL',          '2022-03-01', '2022-03-05', 'Students',      130, 'Beginner-friendly data science track'),
    (2, 'IoT Hardware Lab 2022',        'Technical',     'Texas Instruments','2022-10-12','2022-10-15', 'Students',       70, 'Hands-on IoT hardware sessions'),
    (3, 'Design Thinking 2023',         'Soft Skills',   'Stanford d.school','2023-04-08','2023-04-09', 'Entrepreneurs',  90, 'Human-centred design workshop'),
    (4, 'Cloud & DevOps 2023',          'Technical',     'AWS',            '2023-11-02', '2023-11-04', 'Professionals', 110, 'Cloud deployment and CI/CD'),
    (5, 'Financial Literacy 2024',      'Business',      'SIDBI',          '2024-02-14', '2024-02-15', 'Entrepreneurs',  65, 'Funding and finance basics'),
    (6, 'Machine Learning Bootcamp 2024','Technical',    'Google',         '2024-08-19', '2024-08-23', 'Students',      155, 'End-to-end ML pipeline training'),
    (7, 'Pitch & Storytelling 2025',    'Soft Skills',   'TiE',            '2025-03-10', '2025-03-11', 'Startups',       80, 'Investor pitch preparation'),
    (8, 'Cybersecurity Essentials 2025','Technical',     'CERT-In',        '2025-09-15', '2025-09-18', 'Professionals', 100, 'Security fundamentals workshop');

-- ----------------------------------------------------------------------------
-- techin_startup_table
-- ----------------------------------------------------------------------------
INSERT INTO public.techin_startup_table
    (id, startup_name, domain, startup_origin, incubated_date, status, revenue, number_of_jobs, remarks)
VALUES
    ( 1, 'AgroSense Technologies', 'AgriTech',    'Student',   '2022-01-20', 'Active',     4500000.00, 12, 'IoT-based soil monitoring'),
    ( 2, 'MediQueue Health',       'HealthTech',  'Faculty',   '2022-06-15', 'Active',     6200000.00, 18, 'Hospital queue management'),
    ( 3, 'EduSpark Learning',      'EdTech',      'Student',   '2022-11-03', 'Active',     2800000.00,  9, 'Adaptive learning platform'),
    ( 4, 'GreenVolt Energy',       'CleanTech',   'External',  '2023-02-28', 'Active',     8100000.00, 24, 'Solar micro-grid solutions'),
    ( 5, 'FinPilot Analytics',     'FinTech',     'Student',   '2023-07-19', 'Active',     5400000.00, 15, 'SME credit scoring engine'),
    ( 6, 'RoboWeld Systems',       'Robotics',    'Faculty',   '2023-12-09', 'Active',     7300000.00, 21, 'Automated welding arms'),
    ( 7, 'AquaPure Labs',          'CleanTech',   'Student',   '2024-03-22', 'Active',     3100000.00, 10, 'Low-cost water purification'),
    ( 8, 'VisionAI Diagnostics',   'HealthTech',  'External',  '2024-09-05', 'Active',     9600000.00, 28, 'AI medical imaging'),
    ( 9, 'CargoLink Logistics',    'LogiTech',    'Student',   '2024-12-14', 'Incubating', 1500000.00,  6, 'Last-mile delivery optimisation'),
    (10, 'NanoCoat Materials',     'DeepTech',    'Faculty',   '2025-04-10', 'Incubating', 2200000.00,  8, 'Anti-corrosion nano coatings'),
    (11, 'SkillBridge Careers',    'EdTech',      'Student',   '2025-08-27', 'Active',     3700000.00, 11, 'Vocational skilling marketplace'),
    (12, 'TerraDrone Surveys',     'DroneTech',   'External',  '2025-11-30', 'Incubating', 1900000.00,  7, 'Aerial land survey services');

COMMIT;
