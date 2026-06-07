-- Seed: dummy PUBLISHED startups for the Startup Portfolio showcase.
-- Populates the new showcase columns on iptif_startup_table and techin_startup_table.
-- Idempotent — re-running refreshes the same rows (ON CONFLICT (id) DO UPDATE).
-- Run with: psql -h <host> -U <user> -d <db> -f Database_Schema/seed_startup_portfolio_dummy.sql
-- revenue is left NULL on purpose so the existing IPTIF/TechIN revenue analytics aren't skewed.
-- Two rows per table omit startup_logo to exercise the placeholder icon.

BEGIN;

-- ── IPTIF dummy startups (ids IPTIF-ST-D01 … D05) ────────────────────────────
INSERT INTO public.iptif_startup_table
  (id, startup_name, domain, startup_origin, incubated_date, status, number_of_jobs,
   startup_logo, startup_website_link, startup_founder_name, startup_founder_profile_line,
   startup_summary, startup_tagline, is_published)
VALUES
  ('IPTIF-ST-D01', 'AgroNova Solutions', 'AgriTech', 'IIT Palakkad', DATE '2021-02-11', 'Active', 24,
   'https://ui-avatars.com/api/?name=Agro+Nova&size=256&background=16a34a&color=fff&bold=true',
   'https://agronova.example.com', 'Ananya Krishnan', 'https://www.linkedin.com/in/ananya-krishnan',
   'AgroNova builds AI-driven soil and crop sensors that help smallholder farmers cut water use and boost yields. Its goal is to make precision agriculture affordable across rural India.',
   'Precision farming for every field', true),

  ('IPTIF-ST-D02', 'MediTrack Systems', 'HealthTech', 'IIT Palakkad', DATE '2022-09-05', 'Active', 18,
   'https://ui-avatars.com/api/?name=Medi+Track&size=256&background=0ea5e9&color=fff&bold=true',
   'https://meditrack.example.com', 'Rahul Menon', 'https://www.linkedin.com/in/rahul-menon',
   'MediTrack is a wearable + cloud platform for remote patient monitoring, alerting clinicians to early signs of deterioration. It targets tier-2 and tier-3 hospitals.',
   'Continuous care, anywhere', true),

  ('IPTIF-ST-D03', 'EduBridge Learning', 'EdTech', 'IIT Palakkad', DATE '2023-03-22', 'Active', 12,
   'https://ui-avatars.com/api/?name=Edu+Bridge&size=256&background=f59e0b&color=fff&bold=true',
   'https://edubridge.example.com', 'Sneha Pillai', 'https://www.linkedin.com/in/sneha-pillai',
   'EduBridge delivers vernacular STEM courseware to government schools, blending offline kits with an adaptive learning app to close the rural learning gap.',
   'Learning in your language', true),

  ('IPTIF-ST-D04', 'HydroPure Tech', 'WaterTech', 'IIT Palakkad', DATE '2022-12-01', 'Pilot', 9,
   NULL,
   'https://hydropure.example.com', 'Karthik Nair', 'https://www.linkedin.com/in/karthik-nair',
   'HydroPure''s low-cost membrane units turn contaminated groundwater into safe drinking water for off-grid communities, with IoT monitoring of filter health.',
   'Clean water, off the grid', true),

  ('IPTIF-ST-D05', 'FinFlow Analytics', 'FinTech', 'IIT Palakkad', DATE '2021-08-19', 'Active', 31,
   'https://ui-avatars.com/api/?name=Fin+Flow&size=256&background=7c3aed&color=fff&bold=true',
   'https://finflow.example.com', 'Meera Subramanian', 'https://www.linkedin.com/in/meera-subramanian',
   'FinFlow gives MSMEs real-time cash-flow forecasting and credit-readiness scoring by plugging into their accounting and banking data.',
   'Cash-flow clarity for small business', true)
ON CONFLICT (id) DO UPDATE SET
  startup_name = EXCLUDED.startup_name,
  domain = EXCLUDED.domain,
  startup_origin = EXCLUDED.startup_origin,
  incubated_date = EXCLUDED.incubated_date,
  status = EXCLUDED.status,
  number_of_jobs = EXCLUDED.number_of_jobs,
  startup_logo = EXCLUDED.startup_logo,
  startup_website_link = EXCLUDED.startup_website_link,
  startup_founder_name = EXCLUDED.startup_founder_name,
  startup_founder_profile_line = EXCLUDED.startup_founder_profile_line,
  startup_summary = EXCLUDED.startup_summary,
  startup_tagline = EXCLUDED.startup_tagline,
  is_published = EXCLUDED.is_published;

-- ── TechIN dummy startups (ids 101 … 105) ────────────────────────────────────
INSERT INTO public.techin_startup_table
  (id, startup_name, domain, startup_origin, incubated_date, status, number_of_jobs,
   startup_logo, startup_website_link, startup_founder_name, startup_founder_profile_line,
   startup_summary, startup_tagline, is_published)
VALUES
  (101, 'Quantum Leap Robotics', 'Robotics', 'IIT Palakkad', DATE '2021-03-15', 'Active', 40,
   'https://ui-avatars.com/api/?name=Quantum+Leap&size=256&background=4f46e5&color=fff&bold=true',
   'https://quantumleap.example.com', 'Vikram Iyer', 'https://www.linkedin.com/in/vikram-iyer',
   'Quantum Leap builds autonomous mobile robots for warehouse logistics, cutting fulfilment times with on-device navigation that needs no fixed infrastructure.',
   'Robots that move your warehouse', true),

  (102, 'BioSynth Labs', 'BioTech', 'IIT Palakkad', DATE '2022-07-09', 'Active', 22,
   'https://ui-avatars.com/api/?name=Bio+Synth&size=256&background=059669&color=fff&bold=true',
   'https://biosynth.example.com', 'Priya Raghavan', 'https://www.linkedin.com/in/priya-raghavan',
   'BioSynth engineers microbial strains that produce industrial enzymes sustainably, replacing petrochemical processes for textile and food manufacturers.',
   'Enzymes, grown not refined', true),

  (103, 'AeroVision Drones', 'Aerospace', 'IIT Palakkad', DATE '2020-11-20', 'Scaling', 35,
   'https://ui-avatars.com/api/?name=Aero+Vision&size=256&background=dc2626&color=fff&bold=true',
   'https://aerovision.example.com', 'Arjun Pratap', 'https://www.linkedin.com/in/arjun-pratap',
   'AeroVision''s survey drones and analytics stack map infrastructure, mines, and farmland at centimetre accuracy, turning aerial imagery into actionable reports.',
   'See the world from above', true),

  (104, 'NanoCharge Energy', 'CleanTech', 'IIT Palakkad', DATE '2023-01-30', 'Pilot', 14,
   NULL,
   'https://nanocharge.example.com', 'Divya Ramesh', 'https://www.linkedin.com/in/divya-ramesh',
   'NanoCharge develops fast-charging sodium-ion battery packs for two-wheelers and grid storage, designed for India''s heat and cost constraints.',
   'Charge faster, last longer', true),

  (105, 'CodeWeave AI', 'AI/ML', 'IIT Palakkad', DATE '2022-05-18', 'Active', 27,
   'https://ui-avatars.com/api/?name=Code+Weave&size=256&background=0f766e&color=fff&bold=true',
   'https://codeweave.example.com', 'Nikhil Varma', 'https://www.linkedin.com/in/nikhil-varma',
   'CodeWeave offers an on-prem code-review copilot for regulated industries, catching bugs and security issues without sending source code to the cloud.',
   'Your private AI pair-programmer', true)
ON CONFLICT (id) DO UPDATE SET
  startup_name = EXCLUDED.startup_name,
  domain = EXCLUDED.domain,
  startup_origin = EXCLUDED.startup_origin,
  incubated_date = EXCLUDED.incubated_date,
  status = EXCLUDED.status,
  number_of_jobs = EXCLUDED.number_of_jobs,
  startup_logo = EXCLUDED.startup_logo,
  startup_website_link = EXCLUDED.startup_website_link,
  startup_founder_name = EXCLUDED.startup_founder_name,
  startup_founder_profile_line = EXCLUDED.startup_founder_profile_line,
  startup_summary = EXCLUDED.startup_summary,
  startup_tagline = EXCLUDED.startup_tagline,
  is_published = EXCLUDED.is_published;

COMMIT;
