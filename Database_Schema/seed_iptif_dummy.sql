-- Dummy data for IPTIF (IIT Palakkad Technology IHub Foundation) section.
-- Safe to re-run: clears the four IPTIF tables before inserting.
-- Spans multiple years so trend charts and revenue metrics render meaningfully.

BEGIN;

TRUNCATE public.iptif_projects_table,
         public.iptif_program_table,
         public.iptif_startup_table,
         public.iptif_facilities_table;

-- ----------------------------------------------------------------------------
-- iptif_projects_table  (trend grouped by YEAR(start_date))
-- ----------------------------------------------------------------------------
INSERT INTO public.iptif_projects_table
    (project_id, project_name, scheme, status, start_date, end_date)
VALUES
    ('IPTIF-PRJ-001', 'Smart Mobility Sensor Network',        'TIDE 2.0',          'Completed',   '2022-01-15', '2023-01-14'),
    ('IPTIF-PRJ-002', 'Rural HealthTech Diagnostics',         'NIDHI-PRAYAS',      'Completed',   '2022-05-20', '2023-05-19'),
    ('IPTIF-PRJ-003', 'AI Crop Yield Prediction',             'TIDE 2.0',          'Ongoing',     '2022-09-10', '2024-09-09'),
    ('IPTIF-PRJ-004', 'Water Quality Monitoring Grid',        'MeitY TIH',         'Ongoing',     '2023-02-01', '2024-12-31'),
    ('IPTIF-PRJ-005', 'Assistive Robotics for Elderly',       'NIDHI-PRAYAS',      'Completed',   '2023-06-12', '2024-06-11'),
    ('IPTIF-PRJ-006', 'Edge AI Surveillance Platform',        'SISFS',             'Ongoing',     '2023-11-05', '2025-05-04'),
    ('IPTIF-PRJ-007', 'Renewable Microgrid Controller',       'MeitY TIH',         'Ongoing',     '2024-03-18', '2025-09-17'),
    ('IPTIF-PRJ-008', 'Blockchain Land Records',              'SISFS',             'On Hold',     '2024-07-22', '2025-07-21'),
    ('IPTIF-PRJ-009', 'Drone-based Disaster Mapping',         'TIDE 2.0',          'Ongoing',     '2025-01-09', '2026-01-08'),
    ('IPTIF-PRJ-010', 'Quantum-safe IoT Security',            'MeitY TIH',         'Ongoing',     '2025-08-14', '2026-08-13');

-- ----------------------------------------------------------------------------
-- iptif_program_table  (trend grouped by YEAR(COALESCE(start_end, date)))
-- ----------------------------------------------------------------------------
INSERT INTO public.iptif_program_table
    (id, program_name, type, association, start_end, date, targetted_audi, no_of_attendees, remarks)
VALUES
    (1,  'Deep Tech Ideation 2022',     'Workshop',    'IIT Palakkad',     '2022-03-08', '2022-03-10', 'Students',        90,  'Three-day ideation sprint'),
    (2,  'Investor Connect 2022',       'Seminar',     'TiE Kerala',       '2022-09-16', '2022-09-16', 'Entrepreneurs',   55,  'Angel investor networking'),
    (3,  'Hardware Hackathon 2023',     'Competition', 'Texas Instruments','2023-02-24', '2023-02-26', 'Students',       140,  'Embedded systems hackathon'),
    (4,  'Startup Legal Clinic 2023',   'Seminar',     'NLSIU',            '2023-07-13', '2023-07-13', 'Startups',        48,  'IP and incorporation guidance'),
    (5,  'Women Founders Meet 2023',    'Conference',  'WeHub',            '2023-11-20', '2023-11-21', 'Professionals',  115,  'Networking for women founders'),
    (6,  'Prototype to Product 2024',   'Workshop',    'AICTE',            '2024-04-05', '2024-04-07', 'Innovators',      85,  'Manufacturing scale-up clinic'),
    (7,  'Climate Tech Summit 2024',    'Conference',  'MeitY',            '2024-10-09', '2024-10-11', 'Industry',       200,  'Sustainability focused summit'),
    (8,  'Demo Day 2025',               'Showcase',    'IPTIF',            '2025-03-28', '2025-03-28', 'Investors',      175,  'Cohort pitch showcase'),
    (9,  'Grant Writing Lab 2025',      'Workshop',    'DST',              '2025-08-11', '2025-08-12', 'Researchers',     70,  'Funding proposal training');

-- ----------------------------------------------------------------------------
-- iptif_startup_table  (trend grouped by YEAR(incubated_date))
-- ----------------------------------------------------------------------------
INSERT INTO public.iptif_startup_table
    (id, startup_name, domain, startup_origin, incubated_date, status, revenue, number_of_jobs, remarks)
VALUES
    ('IPTIF-ST-001', 'NeuralFarm Analytics',   'AgriTech',   'Student',   '2022-02-11', 'Active',     5200000.00, 14, 'Crop intelligence platform'),
    ('IPTIF-ST-002', 'CareLoop Health',        'HealthTech', 'Faculty',   '2022-07-05', 'Active',     6800000.00, 19, 'Remote patient monitoring'),
    ('IPTIF-ST-003', 'VoltEdge Mobility',      'EV',         'External',  '2022-12-01', 'Active',     7900000.00, 22, 'EV charging infrastructure'),
    ('IPTIF-ST-004', 'AquaGrid Systems',       'CleanTech',  'Student',   '2023-03-17', 'Active',     4100000.00, 11, 'Smart water distribution'),
    ('IPTIF-ST-005', 'LexiFin Solutions',      'FinTech',    'Student',   '2023-08-09', 'Active',     5900000.00, 16, 'Regulatory compliance SaaS'),
    ('IPTIF-ST-006', 'ForgeBots Robotics',     'Robotics',   'Faculty',   '2023-12-21', 'Active',     8600000.00, 25, 'Industrial automation arms'),
    ('IPTIF-ST-007', 'TerraScan Geo',          'GeoSpatial', 'External',  '2024-04-14', 'Active',     3400000.00, 10, 'Satellite land analytics'),
    ('IPTIF-ST-008', 'MediVision AI',          'HealthTech', 'Student',   '2024-09-27', 'Active',    10200000.00, 30, 'AI radiology screening'),
    ('IPTIF-ST-009', 'SwiftCargo Network',     'LogiTech',   'External',  '2024-12-19', 'Incubating', 1800000.00,  7, 'Freight matching platform'),
    ('IPTIF-ST-010', 'NanoShield Coatings',    'DeepTech',   'Faculty',   '2025-05-06', 'Incubating', 2600000.00,  9, 'Protective nano materials'),
    ('IPTIF-ST-011', 'EduMentor Hub',          'EdTech',     'Student',   '2025-09-02', 'Active',     3900000.00, 12, 'Skill mentorship marketplace'),
    ('IPTIF-ST-012', 'GridSense Energy',       'CleanTech',  'External',  '2025-11-25', 'Incubating', 2300000.00,  8, 'Demand-response analytics');

-- ----------------------------------------------------------------------------
-- iptif_facilities_table  (revenue trend grouped by financial_year)
-- ----------------------------------------------------------------------------
INSERT INTO public.iptif_facilities_table
    (facility_id, facility_name, facility_type, revenue_made, availability_status, financial_year, remarks)
VALUES
    ('IPTIF-FAC-001', 'Prototyping Lab',          'Fabrication',   1850000.00, 'Available',   '2022-23', 'CNC and 3D printing bay'),
    ('IPTIF-FAC-002', 'Electronics Test Bench',   'Electronics',    920000.00, 'Available',   '2022-23', 'PCB and RF testing'),
    ('IPTIF-FAC-003', 'Co-working Incubation Hub','Workspace',     2400000.00, 'Available',   '2022-23', '60-seat startup workspace'),
    ('IPTIF-FAC-004', 'Wet Chemistry Lab',        'Laboratory',    1320000.00, 'Available',   '2023-24', 'Materials and bio testing'),
    ('IPTIF-FAC-005', 'Prototyping Lab',          'Fabrication',   2150000.00, 'Available',   '2023-24', 'Expanded fabrication slots'),
    ('IPTIF-FAC-006', 'Data Compute Cluster',     'Computing',     1780000.00, 'Available',   '2023-24', 'GPU cluster rentals'),
    ('IPTIF-FAC-007', 'Co-working Incubation Hub','Workspace',     2750000.00, 'Available',   '2024-25', 'Higher occupancy'),
    ('IPTIF-FAC-008', 'Drone Test Arena',         'Testing',       1100000.00, 'Maintenance', '2024-25', 'Outdoor UAV flight zone'),
    ('IPTIF-FAC-009', 'Electronics Test Bench',   'Electronics',   1240000.00, 'Available',   '2024-25', 'Upgraded instrumentation'),
    ('IPTIF-FAC-010', 'Data Compute Cluster',     'Computing',     2050000.00, 'Available',   '2024-25', 'Added GPU nodes');

COMMIT;
