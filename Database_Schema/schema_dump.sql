--
-- PostgreSQL database dump
--

\restrict Hy7sSOSecbwTjjnsRIhj7Mf6Jo0DdjcO51XhOTmAFcgLRIaVeIFgpH9ikZ2FLps

-- Dumped from database version 18.4 (Ubuntu 18.4-1.pgdg24.04+1)
-- Dumped by pg_dump version 18.4 (Ubuntu 18.4-1.pgdg24.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: academic_program_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.academic_program_type AS ENUM (
    'UG',
    'PG',
    'Certificate',
    'Interdisciplinary'
);


--
-- Name: alumni_outcome_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.alumni_outcome_type AS ENUM (
    'HigherStudies',
    'Corporate',
    'Entrepreneurship',
    'Other'
);


--
-- Name: batch_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.batch_type AS ENUM (
    'Jan',
    'Jul'
);


--
-- Name: category_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.category_type AS ENUM (
    'Gen',
    'EWS',
    'OBC',
    'SC',
    'ST'
);


--
-- Name: course_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.course_status AS ENUM (
    'Active',
    'Inactive'
);


--
-- Name: emp_gender; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.emp_gender AS ENUM (
    'Male',
    'Female',
    'Other',
    'Transgender'
);


--
-- Name: emp_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.emp_status AS ENUM (
    'Active',
    'Relieved',
    'Transferred'
);


--
-- Name: event_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.event_type AS ENUM (
    'Workshop',
    'Seminar',
    'Industrial Talk',
    'Networking Event',
    'Industry Visit',
    'Panel Discussion',
    'Conference',
    'Training Program',
    'Hackathon',
    'Other'
);


--
-- Name: faculty_engagement_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.faculty_engagement_type AS ENUM (
    'Adjunct',
    'Honorary',
    'Visiting',
    'FacultyFellow',
    'PoP'
);


--
-- Name: gender_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.gender_type AS ENUM (
    'Male',
    'Female',
    'Transgender'
);


--
-- Name: innovation_project_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.innovation_project_type AS ENUM (
    'Funded',
    'Mentored'
);


--
-- Name: lien_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lien_type AS ENUM (
    'Yes',
    'No',
    'NA'
);


--
-- Name: nature_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.nature_type AS ENUM (
    'Regular',
    'Contract',
    'Temporary',
    'Visiting',
    'Adhoc',
    'Probation'
);


--
-- Name: patent_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.patent_status_type AS ENUM (
    'Filed',
    'Granted',
    'Published'
);


--
-- Name: program_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.program_type AS ENUM (
    'BTech',
    'MTech',
    'MSc',
    'MS',
    'PhD'
);


--
-- Name: project_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.project_status_type AS ENUM (
    'Ongoing',
    'Completed'
);


--
-- Name: publication_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.publication_category AS ENUM (
    'Journal',
    'Conference',
    'Book Chapter',
    'Monograph'
);


--
-- Name: research_patent_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.research_patent_status AS ENUM (
    'Filed',
    'Granted',
    'Published'
);


--
-- Name: research_project_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.research_project_status AS ENUM (
    'Ongoing',
    'Completed'
);


--
-- Name: research_project_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.research_project_type AS ENUM (
    'Funded',
    'Consultancy'
);


--
-- Name: role_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.role_status AS ENUM (
    'Active',
    'Relieved'
);


--
-- Name: startup_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.startup_status_type AS ENUM (
    'Active',
    'Graduated',
    'Inactive'
);


--
-- Name: status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.status_type AS ENUM (
    'Graduated',
    'Ongoing',
    'Slowpace'
);


--
-- Name: user_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_status AS ENUM (
    'pending_verification',
    'active',
    'deactivated'
);


--
-- Name: set_last_updated(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_last_updated() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Skip the timestamp bump if nothing actually changed (UPDATE only)
    IF TG_OP = 'UPDATE' AND NEW IS NOT DISTINCT FROM OLD THEN
        RETURN NEW;
    END IF;
    NEW.last_updated = now();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alumni; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alumni (
    sl_no integer NOT NULL,
    roll_number character varying(50),
    year_of_admission integer,
    year_of_graduation integer,
    course_type character varying(100),
    course_name character varying(150),
    department character varying(150),
    current_job text,
    country_of_settlement character varying(100),
    place_of_settlement_state character varying(150),
    alumni_contribution text,
    gender character varying(10),
    name character varying(150),
    sector character varying(50),
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: courses_table; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses_table (
    course_code character varying(50) NOT NULL,
    course_name character varying(200),
    credit_l_t_p_c character varying(50),
    course_category character varying(200),
    proposing_faculty_name character varying(500),
    faculty_affiliation character varying(50),
    target_programme character varying(200),
    target_discipline character varying(50),
    prerequisite character varying(500),
    date_of_proposal date,
    proposal_type text,
    bac_number integer,
    senate_number character varying(50) NOT NULL,
    course_proposal_pdf character varying(255),
    is_industry_course character varying(10),
    industry_partner character varying(100),
    industry_coordinator_name character varying(200),
    course_status_currentay character varying(100),
    course_status_history text,
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: department; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.department (
    deptcode character varying(20) NOT NULL,
    deptname character varying(100) NOT NULL,
    coursesoffered text,
    faculty text,
    courselist text,
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id character varying(150) NOT NULL,
    empid character varying(50),
    empname character varying(150),
    designation character varying(100),
    phonenumber character varying(20),
    bloodgroup character varying(10),
    dob date,
    initial_doj date,
    doj date,
    dor date,
    gender character varying(10),
    email character varying(150),
    personalmail character varying(150),
    marital_status character varying(20),
    address text,
    paylevel character varying(20),
    group_name character varying(50),
    ltchometown character varying(150),
    employmentnature character varying(100),
    appointmentmode character varying(100),
    basicpay numeric(10,2),
    department character varying(150),
    emp_type character varying(50),
    pwd character varying(255),
    notificationnumber character varying(100),
    notificationdate date,
    empstatus character varying(50),
    prior_industry_exp_in_months integer,
    prior_research_exp_in_months integer,
    prior_teaching_exp_in_months integer,
    total_teaching_exp_in_months integer,
    original_category character varying(10),
    appointed_category character varying(10),
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ewd_yearwise; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ewd_yearwise (
    ewd_year integer NOT NULL,
    annual_electricity_consumption bigint NOT NULL,
    per_capita_electricity_consumption numeric(10,2) NOT NULL,
    per_capita_water_consumption numeric(10,2) NOT NULL,
    per_capita_recycled_water numeric(10,2) NOT NULL,
    green_coverage numeric(10,2) NOT NULL,
    last_updated timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT check_non_negativity CHECK (((annual_electricity_consumption >= 0) AND (per_capita_electricity_consumption >= (0)::numeric) AND (per_capita_water_consumption >= (0)::numeric) AND (per_capita_recycled_water >= (0)::numeric) AND (green_coverage >= (0)::numeric)))
);


--
-- Name: externship_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.externship_info (
    externid integer NOT NULL,
    employeeid character varying(20),
    empname character varying(50) NOT NULL,
    department character varying(50) NOT NULL,
    industry_name character varying(50) NOT NULL,
    startdate date NOT NULL,
    enddate date NOT NULL,
    duration integer GENERATED ALWAYS AS ((enddate - startdate)) STORED,
    type character varying(50) NOT NULL,
    remarks text,
    createddate timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    modifieddate timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: externship_info_externid_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.externship_info_externid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: externship_info_externid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.externship_info_externid_seq OWNED BY public.externship_info.externid;


--
-- Name: faculty_engagement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faculty_engagement (
    engagement_code character varying(40) NOT NULL,
    faculty_name character varying(150),
    engagement_type character varying(50) NOT NULL,
    department character varying(100) NOT NULL,
    startdate date,
    enddate date,
    duration_months integer,
    year integer NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fc_bg_type character varying(20),
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: iar_mous; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.iar_mous (
    id text NOT NULL,
    partner_name character varying(255),
    framework character varying(50),
    country character varying(100),
    collaboration_nature character varying(255),
    date_signed date,
    validity_end date,
    remarks character varying(50),
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: icc_yearwise; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.icc_yearwise (
    complaints_year character varying(10) NOT NULL,
    total_complaints integer NOT NULL,
    complaints_resolved integer NOT NULL,
    complaints_pending integer NOT NULL,
    last_updated timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT check_pending_non_negative CHECK ((complaints_pending >= 0)),
    CONSTRAINT check_resolved_non_negative CHECK ((complaints_resolved >= 0)),
    CONSTRAINT check_total_equals_sum CHECK ((total_complaints = (complaints_pending + complaints_resolved))),
    CONSTRAINT check_total_non_negative CHECK ((total_complaints >= 0))
);


--
-- Name: icsr_consultancy_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.icsr_consultancy_projects (
    project_id integer CONSTRAINT icsr_sponsered_projects_project_id_not_null NOT NULL,
    project_title character varying(300),
    principal_investigator character varying(150) CONSTRAINT icsr_sponsered_projects_principal_investigator_not_null NOT NULL,
    department character varying(150) CONSTRAINT icsr_sponsered_projects_department_not_null NOT NULL,
    funding_agency character varying(150),
    client_organization character varying(150),
    amount_sanctioned numeric(15,2),
    start_date date,
    end_date date,
    status character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: icsr_csr; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.icsr_csr (
    csr_id integer NOT NULL,
    csr_organisation character varying(200) NOT NULL,
    year integer,
    type_of_company character varying(100),
    type_of_support character varying(100),
    amount_given numeric(15,2),
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: icsr_sponsered_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.icsr_sponsered_projects (
    project_id integer CONSTRAINT icsr_sponsered_projects_project_id_not_null1 NOT NULL,
    project_title character varying(300),
    principal_investigator character varying(150),
    principal_investigator_department character varying(150),
    co_principal_investigator1 character varying(150),
    co_principal_investigator1_department character varying(150),
    co_principal_investigator2 character varying(150),
    co_principal_investigator2_department character varying(150),
    funding_agency character varying(150),
    client_organization character varying(150),
    amount_sanctioned numeric(15,2),
    start_date date,
    end_date date,
    status character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: igrs_yearwise; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.igrs_yearwise (
    grievance_year character varying(10) NOT NULL,
    total_grievances_filed integer NOT NULL,
    grievances_resolved integer NOT NULL,
    grievances_pending integer NOT NULL,
    last_updated timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT check_pending_non_negative CHECK ((grievances_pending >= 0)),
    CONSTRAINT check_resolved_non_negative CHECK ((grievances_resolved >= 0)),
    CONSTRAINT check_total_equals_sum CHECK ((total_grievances_filed = (grievances_resolved + grievances_pending))),
    CONSTRAINT check_total_non_negative CHECK ((total_grievances_filed >= 0))
);


--
-- Name: industry_conclave; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industry_conclave (
    conclave_id integer NOT NULL,
    start_date date,
    end_date date,
    theme text,
    focus_area text,
    number_of_com integer,
    sessions_held integer,
    key_speakers text,
    event_photos_url text,
    brochure_url text,
    description text,
    created_at timestamp without time zone,
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: industry_conclave_conclave_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.industry_conclave_conclave_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: industry_conclave_conclave_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.industry_conclave_conclave_id_seq OWNED BY public.industry_conclave.conclave_id;


--
-- Name: industry_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industry_events (
    project_id integer NOT NULL,
    event_name character varying(200) NOT NULL,
    date_of_event date,
    event_type character varying(100),
    target_audience character varying(150),
    hosted_by character varying(150),
    funding_by character varying(100),
    amount numeric(12,2),
    year integer,
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: innovation_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.innovation_projects (
    project_id integer NOT NULL,
    project_title character varying(250) NOT NULL,
    project_type public.innovation_project_type NOT NULL,
    sector character varying(100),
    year_started integer NOT NULL,
    status character varying(50) DEFAULT 'Ongoing'::character varying,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: innovation_projects_project_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.innovation_projects_project_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: innovation_projects_project_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.innovation_projects_project_id_seq OWNED BY public.innovation_projects.project_id;


--
-- Name: iptif_facilities_table; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.iptif_facilities_table (
    facility_id character varying(300) NOT NULL,
    facility_name character varying(200) NOT NULL,
    facility_type character varying(100),
    revenue_made numeric(12,2),
    availability_status character varying(50),
    financial_year character varying(10),
    remarks text,
    last_updated timestamp with time zone DEFAULT now() NOT NULL,
    display_title character varying(300),
    facility_summary text,
    image_url text,
    availing_guidance text,
    more_info_link text
);


--
-- Name: iptif_program_table; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.iptif_program_table (
    id integer NOT NULL,
    program_name character varying(255) NOT NULL,
    type character varying(100),
    association character varying(255),
    start_end date,
    date date,
    targetted_audi character varying(150),
    no_of_attendees integer,
    remarks text,
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: iptif_projects_table; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.iptif_projects_table (
    project_id character varying(300) NOT NULL,
    project_name character varying(255) NOT NULL,
    scheme character varying(150),
    status character varying(50),
    start_date date,
    end_date date,
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: iptif_startup_table; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.iptif_startup_table (
    id character varying(300) NOT NULL,
    startup_name character varying(200) NOT NULL,
    domain character varying(150),
    startup_origin character varying(100),
    incubated_date date,
    status character varying(50),
    revenue numeric(15,2),
    number_of_jobs integer,
    remarks text,
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: mou_partner_logos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mou_partner_logos (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    logo_url text,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: mou_partner_logos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mou_partner_logos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mou_partner_logos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mou_partner_logos_id_seq OWNED BY public.mou_partner_logos.id;


--
-- Name: nirf_ranking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nirf_ranking (
    ranking_id integer NOT NULL,
    year integer NOT NULL,
    tlr_score numeric(5,2),
    rpc_score numeric(5,2),
    go_score numeric(5,2),
    oi_score numeric(5,2),
    pr_score numeric(5,2),
    rank integer,
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: nirf_ranking_ranking_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nirf_ranking_ranking_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nirf_ranking_ranking_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nirf_ranking_ranking_id_seq OWNED BY public.nirf_ranking.ranking_id;


--
-- Name: nptel_courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nptel_courses (
    id integer NOT NULL,
    employee_id character varying(50),
    faculty_name character varying(255),
    department character varying(255),
    course_name character varying(255),
    enrollments integer,
    offering_year date,
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: nptel_courses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nptel_courses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nptel_courses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nptel_courses_id_seq OWNED BY public.nptel_courses.id;


--
-- Name: open_house; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.open_house (
    event_id integer NOT NULL,
    event_year integer NOT NULL,
    event_date date NOT NULL,
    theme character varying(300),
    target_audience character varying(200),
    departments_participated text,
    num_departments integer DEFAULT 0,
    total_visitors integer DEFAULT 0,
    key_highlights text,
    photos_url text,
    poster_url character varying(500),
    brochure_url character varying(500),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_updated timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT open_house_num_departments_check CHECK ((num_departments >= 0)),
    CONSTRAINT open_house_total_visitors_check CHECK ((total_visitors >= 0))
);


--
-- Name: open_house_event_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.open_house_event_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: open_house_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.open_house_event_id_seq OWNED BY public.open_house.event_id;


--
-- Name: outreach; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outreach (
    id text NOT NULL,
    academic_year character varying(9),
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now(),
    program_name character varying(255) NOT NULL,
    program_type character varying(100),
    engagement_type character varying(50),
    association text,
    start_date date,
    end_date date,
    targeted_audience text,
    num_attendees integer,
    num_schools integer,
    num_colleges integer,
    geographic_reach text,
    remarks text,
    sq_stipend_provided boolean,
    sq_travel_allowance boolean,
    sq_num_lab_sessions integer,
    sq_districts_covered text,
    pmc_target_class character varying(20),
    pmc_mathematician_led text,
    pmc_num_sessions integer,
    pbd_lecture_topic text,
    pbd_speaker_name character varying(255),
    pbd_speaker_affiliation text,
    iv_visiting_institution character varying(255),
    iv_visiting_institution_type character varying(50),
    iv_num_groups integer,
    nss_activity_type character varying(100),
    nss_volunteer_count integer,
    nss_community_reached text,
    extra_data jsonb,
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: outreach_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.outreach_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: outreach_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.outreach_id_seq OWNED BY public.outreach.id;


--
-- Name: placement_companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.placement_companies (
    company_id integer NOT NULL,
    placement_year character varying(20) NOT NULL,
    company_name character varying(150) NOT NULL,
    sector character varying(100),
    offers integer DEFAULT 0 NOT NULL,
    hires integer DEFAULT 0 NOT NULL,
    is_top_recruiter boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_updated timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT placement_company_non_negative CHECK (((offers >= 0) AND (hires >= 0)))
);


--
-- Name: placement_companies_company_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.placement_companies_company_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: placement_companies_company_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.placement_companies_company_id_seq OWNED BY public.placement_companies.company_id;


--
-- Name: placement_packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.placement_packages (
    placement_year character varying(10) NOT NULL,
    program character varying(255) NOT NULL,
    highest_package numeric(10,2),
    lowest_package numeric(10,2),
    average_package numeric(10,2),
    last_updated timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT placement_packages_check CHECK ((((highest_package IS NULL) OR (highest_package >= (0)::numeric)) AND ((lowest_package IS NULL) OR (lowest_package >= (0)::numeric)) AND ((average_package IS NULL) OR (average_package >= (0)::numeric)) AND ((highest_package IS NULL) OR (lowest_package IS NULL) OR (highest_package >= lowest_package)) AND ((average_package IS NULL) OR (lowest_package IS NULL) OR (highest_package IS NULL) OR ((average_package >= lowest_package) AND (average_package <= highest_package)))))
);


--
-- Name: placement_summary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.placement_summary (
    placement_year character varying(20) NOT NULL,
    program character varying(20) NOT NULL,
    gender public.gender_type NOT NULL,
    registered integer NOT NULL,
    placed integer NOT NULL,
    branch character varying(50) NOT NULL,
    last_updated timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT placement_summary_check CHECK ((placed <= registered)),
    CONSTRAINT placement_summary_placed_check CHECK ((placed >= 0)),
    CONSTRAINT placement_summary_registered_check CHECK ((registered >= 0))
);


--
-- Name: research_mous; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_mous (
    mou_id integer NOT NULL,
    partner_name character varying(200) NOT NULL,
    collaboration_nature text,
    date_signed date NOT NULL,
    validity_end date,
    remarks text,
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: research_mous_mou_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.research_mous_mou_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: research_mous_mou_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.research_mous_mou_id_seq OWNED BY public.research_mous.mou_id;


--
-- Name: research_patents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_patents (
    patent_id integer NOT NULL,
    patent_title character varying(250) NOT NULL,
    patent_status public.patent_status_type NOT NULL,
    filing_date date,
    grant_date date,
    remarks text,
    inventor1 character varying(200),
    inventor1_category character varying(200),
    inventor2 character varying(200),
    inventor2_category character varying(200),
    inventor3 character varying(200),
    inventor3_category character varying(200),
    inventor4 character varying(200),
    inventor4_category character varying(200),
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: research_patents_patent_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.research_patents_patent_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: research_patents_patent_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.research_patents_patent_id_seq OWNED BY public.research_patents.patent_id;


--
-- Name: research_publications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_publications (
    publication_title character varying(500) NOT NULL,
    journal_name character varying(500),
    department character varying(100),
    faculty_name character varying(150),
    publication_year integer NOT NULL,
    publication_type character varying(300) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id character varying(32) NOT NULL,
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: student_table; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_table (
    roll_no_admission integer,
    roll_no_current integer NOT NULL,
    name_of_student character varying(100),
    programme_admission character varying(50),
    programme_current character varying(50),
    admission_year character varying(10),
    admission_cycle character varying(20),
    admission_batch integer,
    date_of_joining date,
    date_of_validity date,
    department_admission character varying(100),
    department_current character varying(100),
    stream_admission character varying(50),
    stream_current character varying(50),
    current_semester integer,
    gender character varying(20),
    original_category character varying(20),
    admission_category character varying(20),
    hosteller_day_scholar character varying(20),
    date_of_birth date,
    residential_address character varying(1000),
    nationality character varying(50),
    state character varying(50),
    pwd_status character varying(5),
    disability_type character varying(100),
    blood_group character varying(10),
    apaar_id character varying(20),
    qualifying_exam character varying(100),
    qualifying_exam_score numeric(10,5),
    student_contact_no character varying(50),
    institute_email character varying(50),
    personal_email character varying(50),
    parent_name character varying(50),
    parent_contact_no character varying(50),
    parent_email character varying(50),
    faculty_advisor character varying(300),
    institute_scholarship character varying(200),
    nsp_scholarship_recipient character varying(50),
    preparatory character varying(50),
    branch_change character varying(10),
    branch_change_remarks text,
    slowpaced character varying(10),
    upgraded character varying(10),
    date_of_upgradation date,
    idc_current character varying(10),
    number_of_total_idcs integer,
    idc_history character varying(200),
    break_type character varying(50),
    break_from_date character varying(100),
    break_to_date character varying(100),
    break_history character varying(500),
    student_status character varying(30),
    student_status_date date,
    student_status_remarks character varying(200),
    fellowship_status_admission character varying(50),
    fellowship_status_current character varying(50),
    dc_chairperson character varying(500),
    dc_members character varying(1000),
    thesis_submission_date date,
    viva_voice_date date,
    aadhar_number character varying(20),
    preparatory_ay character varying(10),
    withdrawn_terminated character varying(20),
    date_of_withdrawal_termination date,
    ay_of_withdrawal_termination character varying(10),
    reason_for_withdrawal_termination text,
    academic_program_type character varying(15),
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: techin_program_table; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.techin_program_table (
    id integer NOT NULL,
    program_name character varying(255) NOT NULL,
    type character varying(100),
    association character varying(255),
    start_end date,
    event_date date,
    targetted_audience character varying(150),
    no_of_attendess integer,
    remarks text,
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: techin_skill_development_program; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.techin_skill_development_program (
    id integer NOT NULL,
    program_name character varying(255) NOT NULL,
    category character varying(200),
    association character varying(255),
    start_end date,
    event_date date,
    targetted_audience character varying(150),
    no_of_attendess integer,
    remarks text,
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: techin_startup_table; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.techin_startup_table (
    id integer NOT NULL,
    startup_name character varying(200) NOT NULL,
    domain character varying(150),
    startup_origin character varying(100),
    incubated_date date,
    status character varying(50),
    revenue numeric(15,2),
    number_of_jobs integer,
    remarks text,
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: uba_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.uba_events (
    id integer NOT NULL,
    year text,
    program_name text,
    program_type text,
    association text,
    start_date date,
    end_date date,
    targeted_audience text,
    num_attendees integer,
    num_schools integer,
    num_colleges integer,
    geographic_reach text,
    remarks text,
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: uba_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.uba_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: uba_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.uba_events_id_seq OWNED BY public.uba_events.id;


--
-- Name: uba_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.uba_projects (
    project_id integer NOT NULL,
    project_title character varying(250) NOT NULL,
    coordinator_name character varying(150) NOT NULL,
    intervention_description text,
    project_status character varying(50) DEFAULT 'Ongoing'::character varying,
    start_date date,
    end_date date,
    collaboration_partners text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: uba_projects_project_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.uba_projects_project_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: uba_projects_project_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.uba_projects_project_id_seq OWNED BY public.uba_projects.project_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    username character varying(50),
    password_hash character varying(128) NOT NULL,
    display_name character varying(100),
    status public.user_status DEFAULT 'pending_verification'::public.user_status NOT NULL,
    last_login_at timestamp with time zone,
    failed_login_attempts smallint DEFAULT 0 NOT NULL,
    role_id integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: v_faculty_engagement_standardized; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_faculty_engagement_standardized AS
 SELECT engagement_code,
    faculty_name,
    engagement_type,
    department,
    startdate,
    enddate,
    duration_months,
    year,
    remarks,
    created_at,
    fc_bg_type,
        CASE
            WHEN ((engagement_type)::text ~~* '%Adjunct%'::text) THEN 'Adjunct'::text
            WHEN ((engagement_type)::text ~~* '%Honorary%'::text) THEN 'Honorary'::text
            WHEN ((engagement_type)::text ~~* '%Visiting%'::text) THEN 'Visiting'::text
            WHEN (((engagement_type)::text ~~* '%Faculty Fellow%'::text) OR ((engagement_type)::text ~~* '%FacultyFellow%'::text)) THEN 'FacultyFellow'::text
            WHEN (((engagement_type)::text ~~* '%PoP%'::text) OR ((engagement_type)::text ~~* '%Professor of Practice%'::text) OR ((engagement_type)::text ~~* '%Practice%'::text)) THEN 'PoP'::text
            ELSE 'Other'::text
        END AS std_type,
        CASE
            WHEN ((enddate IS NULL) OR (enddate > CURRENT_DATE)) THEN 'Active'::text
            ELSE 'Inactive'::text
        END AS current_status
   FROM public.faculty_engagement;


--
-- Name: externship_info externid; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.externship_info ALTER COLUMN externid SET DEFAULT nextval('public.externship_info_externid_seq'::regclass);


--
-- Name: industry_conclave conclave_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_conclave ALTER COLUMN conclave_id SET DEFAULT nextval('public.industry_conclave_conclave_id_seq'::regclass);


--
-- Name: innovation_projects project_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.innovation_projects ALTER COLUMN project_id SET DEFAULT nextval('public.innovation_projects_project_id_seq'::regclass);


--
-- Name: mou_partner_logos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mou_partner_logos ALTER COLUMN id SET DEFAULT nextval('public.mou_partner_logos_id_seq'::regclass);


--
-- Name: nirf_ranking ranking_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nirf_ranking ALTER COLUMN ranking_id SET DEFAULT nextval('public.nirf_ranking_ranking_id_seq'::regclass);


--
-- Name: nptel_courses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nptel_courses ALTER COLUMN id SET DEFAULT nextval('public.nptel_courses_id_seq'::regclass);


--
-- Name: open_house event_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.open_house ALTER COLUMN event_id SET DEFAULT nextval('public.open_house_event_id_seq'::regclass);


--
-- Name: placement_companies company_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_companies ALTER COLUMN company_id SET DEFAULT nextval('public.placement_companies_company_id_seq'::regclass);


--
-- Name: research_mous mou_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_mous ALTER COLUMN mou_id SET DEFAULT nextval('public.research_mous_mou_id_seq'::regclass);


--
-- Name: research_patents patent_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_patents ALTER COLUMN patent_id SET DEFAULT nextval('public.research_patents_patent_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: uba_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uba_events ALTER COLUMN id SET DEFAULT nextval('public.uba_events_id_seq'::regclass);


--
-- Name: uba_projects project_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uba_projects ALTER COLUMN project_id SET DEFAULT nextval('public.uba_projects_project_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: alumni alumni_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni
    ADD CONSTRAINT alumni_pkey PRIMARY KEY (sl_no);


--
-- Name: courses_table courses_table_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses_table
    ADD CONSTRAINT courses_table_pkey PRIMARY KEY (course_code, senate_number);


--
-- Name: department department_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department
    ADD CONSTRAINT department_pkey PRIMARY KEY (deptcode);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: ewd_yearwise ewd_yearwise_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ewd_yearwise
    ADD CONSTRAINT ewd_yearwise_pkey PRIMARY KEY (ewd_year);


--
-- Name: externship_info externship_info_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.externship_info
    ADD CONSTRAINT externship_info_pkey PRIMARY KEY (externid);


--
-- Name: faculty_engagement faculty_engagement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faculty_engagement
    ADD CONSTRAINT faculty_engagement_pkey PRIMARY KEY (engagement_code);


--
-- Name: iar_mous iar_mous_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iar_mous
    ADD CONSTRAINT iar_mous_pkey PRIMARY KEY (id);


--
-- Name: icc_yearwise icc_yearwise_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.icc_yearwise
    ADD CONSTRAINT icc_yearwise_pkey PRIMARY KEY (complaints_year);


--
-- Name: icsr_consultancy_projects icsr_consultancy_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.icsr_consultancy_projects
    ADD CONSTRAINT icsr_consultancy_projects_pkey PRIMARY KEY (project_id);


--
-- Name: icsr_csr icsr_csr_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.icsr_csr
    ADD CONSTRAINT icsr_csr_pkey PRIMARY KEY (csr_id);


--
-- Name: icsr_sponsered_projects icsr_sponsered_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.icsr_sponsered_projects
    ADD CONSTRAINT icsr_sponsered_projects_pkey PRIMARY KEY (project_id);


--
-- Name: igrs_yearwise igrs_yearwise_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.igrs_yearwise
    ADD CONSTRAINT igrs_yearwise_pkey PRIMARY KEY (grievance_year);


--
-- Name: industry_conclave industry_conclave_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_conclave
    ADD CONSTRAINT industry_conclave_pkey PRIMARY KEY (conclave_id);


--
-- Name: industry_events industry_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_events
    ADD CONSTRAINT industry_events_pkey PRIMARY KEY (project_id);


--
-- Name: innovation_projects innovation_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.innovation_projects
    ADD CONSTRAINT innovation_projects_pkey PRIMARY KEY (project_id);


--
-- Name: innovation_projects innovation_projects_project_title_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.innovation_projects
    ADD CONSTRAINT innovation_projects_project_title_key UNIQUE (project_title);


--
-- Name: iptif_facilities_table iptif_facilities_table_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iptif_facilities_table
    ADD CONSTRAINT iptif_facilities_table_pkey PRIMARY KEY (facility_id);


--
-- Name: iptif_program_table iptif_program_table_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iptif_program_table
    ADD CONSTRAINT iptif_program_table_pkey PRIMARY KEY (id);


--
-- Name: iptif_projects_table iptif_projects_table_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iptif_projects_table
    ADD CONSTRAINT iptif_projects_table_pkey PRIMARY KEY (project_id);


--
-- Name: iptif_startup_table iptif_startup_table_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iptif_startup_table
    ADD CONSTRAINT iptif_startup_table_pkey PRIMARY KEY (id);


--
-- Name: mou_partner_logos mou_partner_logos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mou_partner_logos
    ADD CONSTRAINT mou_partner_logos_pkey PRIMARY KEY (id);


--
-- Name: nirf_ranking nirf_ranking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nirf_ranking
    ADD CONSTRAINT nirf_ranking_pkey PRIMARY KEY (ranking_id);


--
-- Name: nirf_ranking nirf_ranking_year_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nirf_ranking
    ADD CONSTRAINT nirf_ranking_year_key UNIQUE (year);


--
-- Name: nptel_courses nptel_courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nptel_courses
    ADD CONSTRAINT nptel_courses_pkey PRIMARY KEY (id);


--
-- Name: open_house open_house_event_year_event_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.open_house
    ADD CONSTRAINT open_house_event_year_event_date_key UNIQUE (event_year, event_date);


--
-- Name: open_house open_house_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.open_house
    ADD CONSTRAINT open_house_pkey PRIMARY KEY (event_id);


--
-- Name: outreach outreach_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outreach
    ADD CONSTRAINT outreach_pkey PRIMARY KEY (id);


--
-- Name: placement_companies placement_companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_companies
    ADD CONSTRAINT placement_companies_pkey PRIMARY KEY (company_id);


--
-- Name: placement_packages placement_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_packages
    ADD CONSTRAINT placement_packages_pkey PRIMARY KEY (placement_year, program);


--
-- Name: placement_summary placement_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_summary
    ADD CONSTRAINT placement_summary_pkey PRIMARY KEY (placement_year, program, gender, branch);


--
-- Name: research_mous research_mous_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_mous
    ADD CONSTRAINT research_mous_pkey PRIMARY KEY (mou_id);


--
-- Name: research_patents research_patents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_patents
    ADD CONSTRAINT research_patents_pkey PRIMARY KEY (patent_id);


--
-- Name: research_publications research_publications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_publications
    ADD CONSTRAINT research_publications_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: student_table student_table_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_table
    ADD CONSTRAINT student_table_pkey PRIMARY KEY (roll_no_current);


--
-- Name: techin_program_table techin_program_table_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.techin_program_table
    ADD CONSTRAINT techin_program_table_pkey PRIMARY KEY (id);


--
-- Name: techin_skill_development_program techin_skill_development_program_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.techin_skill_development_program
    ADD CONSTRAINT techin_skill_development_program_pkey PRIMARY KEY (id);


--
-- Name: techin_startup_table techin_startup_table_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.techin_startup_table
    ADD CONSTRAINT techin_startup_table_pkey PRIMARY KEY (id);


--
-- Name: uba_events uba_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uba_events
    ADD CONSTRAINT uba_events_pkey PRIMARY KEY (id);


--
-- Name: uba_projects uba_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uba_projects
    ADD CONSTRAINT uba_projects_pkey PRIMARY KEY (project_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_alumni_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alumni_last_updated ON public.alumni USING btree (last_updated);


--
-- Name: idx_courses_table_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_table_last_updated ON public.courses_table USING btree (last_updated);


--
-- Name: idx_department_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_department_last_updated ON public.department USING btree (last_updated);


--
-- Name: idx_employees_appointed_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_appointed_category ON public.employees USING btree (appointed_category);


--
-- Name: idx_employees_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_department ON public.employees USING btree (department);


--
-- Name: idx_employees_designation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_designation ON public.employees USING btree (designation);


--
-- Name: idx_employees_doj; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_doj ON public.employees USING btree (doj);


--
-- Name: idx_employees_emp_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_emp_type ON public.employees USING btree (emp_type);


--
-- Name: idx_employees_empstatus; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_empstatus ON public.employees USING btree (empstatus);


--
-- Name: idx_employees_gender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_gender ON public.employees USING btree (gender);


--
-- Name: idx_employees_group_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_group_name ON public.employees USING btree (group_name);


--
-- Name: idx_employees_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_last_updated ON public.employees USING btree (last_updated);


--
-- Name: idx_ewd_yearwise_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ewd_yearwise_last_updated ON public.ewd_yearwise USING btree (last_updated);


--
-- Name: idx_externship_info_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_externship_info_last_updated ON public.externship_info USING btree (last_updated);


--
-- Name: idx_faculty_engagement_dept; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_faculty_engagement_dept ON public.faculty_engagement USING btree (department);


--
-- Name: idx_faculty_engagement_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_faculty_engagement_last_updated ON public.faculty_engagement USING btree (last_updated);


--
-- Name: idx_faculty_engagement_startdate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_faculty_engagement_startdate ON public.faculty_engagement USING btree (startdate);


--
-- Name: idx_faculty_engagement_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_faculty_engagement_year ON public.faculty_engagement USING btree (year);


--
-- Name: idx_iar_mous_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iar_mous_last_updated ON public.iar_mous USING btree (last_updated);


--
-- Name: idx_icc_yearwise_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_icc_yearwise_last_updated ON public.icc_yearwise USING btree (last_updated);


--
-- Name: idx_icsr_consultancy_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_icsr_consultancy_department ON public.icsr_consultancy_projects USING btree (department);


--
-- Name: idx_icsr_consultancy_projects_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_icsr_consultancy_projects_last_updated ON public.icsr_consultancy_projects USING btree (last_updated);


--
-- Name: idx_icsr_consultancy_start_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_icsr_consultancy_start_date ON public.icsr_consultancy_projects USING btree (start_date);


--
-- Name: idx_icsr_csr_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_icsr_csr_last_updated ON public.icsr_csr USING btree (last_updated);


--
-- Name: idx_icsr_sponsered_projects_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_icsr_sponsered_projects_last_updated ON public.icsr_sponsered_projects USING btree (last_updated);


--
-- Name: idx_icsr_sponsored_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_icsr_sponsored_department ON public.icsr_sponsered_projects USING btree (principal_investigator_department);


--
-- Name: idx_icsr_sponsored_start_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_icsr_sponsored_start_date ON public.icsr_sponsered_projects USING btree (start_date);


--
-- Name: idx_igrs_yearwise_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_igrs_yearwise_last_updated ON public.igrs_yearwise USING btree (last_updated);


--
-- Name: idx_industry_conclave_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_conclave_last_updated ON public.industry_conclave USING btree (last_updated);


--
-- Name: idx_industry_events_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_events_last_updated ON public.industry_events USING btree (last_updated);


--
-- Name: idx_innovation_projects_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_innovation_projects_last_updated ON public.innovation_projects USING btree (last_updated);


--
-- Name: idx_innovation_projects_sector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_innovation_projects_sector ON public.innovation_projects USING btree (sector);


--
-- Name: idx_innovation_projects_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_innovation_projects_year ON public.innovation_projects USING btree (year_started);


--
-- Name: idx_iptif_facilities_table_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iptif_facilities_table_last_updated ON public.iptif_facilities_table USING btree (last_updated);


--
-- Name: idx_iptif_program_table_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iptif_program_table_last_updated ON public.iptif_program_table USING btree (last_updated);


--
-- Name: idx_iptif_projects_table_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iptif_projects_table_last_updated ON public.iptif_projects_table USING btree (last_updated);


--
-- Name: idx_iptif_startup_table_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iptif_startup_table_last_updated ON public.iptif_startup_table USING btree (last_updated);


--
-- Name: idx_mou_partner_logos_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mou_partner_logos_last_updated ON public.mou_partner_logos USING btree (last_updated);


--
-- Name: idx_nirf_ranking_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nirf_ranking_last_updated ON public.nirf_ranking USING btree (last_updated);


--
-- Name: idx_nptel_courses_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nptel_courses_last_updated ON public.nptel_courses USING btree (last_updated);


--
-- Name: idx_open_house_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_open_house_date ON public.open_house USING btree (event_date);


--
-- Name: idx_open_house_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_open_house_last_updated ON public.open_house USING btree (last_updated);


--
-- Name: idx_open_house_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_open_house_year ON public.open_house USING btree (event_year);


--
-- Name: idx_outreach_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outreach_last_updated ON public.outreach USING btree (last_updated);


--
-- Name: idx_placement_companies_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_placement_companies_last_updated ON public.placement_companies USING btree (last_updated);


--
-- Name: idx_placement_companies_sector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_placement_companies_sector ON public.placement_companies USING btree (sector);


--
-- Name: idx_placement_companies_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_placement_companies_year ON public.placement_companies USING btree (placement_year);


--
-- Name: idx_placement_packages_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_placement_packages_last_updated ON public.placement_packages USING btree (last_updated);


--
-- Name: idx_placement_packages_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_placement_packages_year ON public.placement_packages USING btree (placement_year);


--
-- Name: idx_placement_summary_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_placement_summary_branch ON public.placement_summary USING btree (branch);


--
-- Name: idx_placement_summary_gender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_placement_summary_gender ON public.placement_summary USING btree (gender);


--
-- Name: idx_placement_summary_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_placement_summary_last_updated ON public.placement_summary USING btree (last_updated);


--
-- Name: idx_placement_summary_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_placement_summary_program ON public.placement_summary USING btree (program);


--
-- Name: idx_placement_summary_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_placement_summary_year ON public.placement_summary USING btree (placement_year);


--
-- Name: idx_research_mous_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_mous_last_updated ON public.research_mous USING btree (last_updated);


--
-- Name: idx_research_patents_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_patents_last_updated ON public.research_patents USING btree (last_updated);


--
-- Name: idx_research_publications_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_publications_last_updated ON public.research_publications USING btree (last_updated);


--
-- Name: idx_roles_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roles_last_updated ON public.roles USING btree (last_updated);


--
-- Name: idx_student_admission_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_admission_year ON public.student_table USING btree (admission_year);


--
-- Name: idx_student_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_batch ON public.student_table USING btree (admission_batch);


--
-- Name: idx_student_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_category ON public.student_table USING btree (original_category);


--
-- Name: idx_student_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_department ON public.student_table USING btree (department_current);


--
-- Name: idx_student_gender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_gender ON public.student_table USING btree (gender);


--
-- Name: idx_student_program_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_program_type ON public.student_table USING btree (academic_program_type);


--
-- Name: idx_student_programme; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_programme ON public.student_table USING btree (programme_current);


--
-- Name: idx_student_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_state ON public.student_table USING btree (state);


--
-- Name: idx_student_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_status ON public.student_table USING btree (student_status);


--
-- Name: idx_student_stream; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_stream ON public.student_table USING btree (stream_current);


--
-- Name: idx_student_table_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_table_last_updated ON public.student_table USING btree (last_updated);


--
-- Name: idx_techin_program_table_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_techin_program_table_last_updated ON public.techin_program_table USING btree (last_updated);


--
-- Name: idx_techin_skill_development_program_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_techin_skill_development_program_last_updated ON public.techin_skill_development_program USING btree (last_updated);


--
-- Name: idx_techin_startup_table_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_techin_startup_table_last_updated ON public.techin_startup_table USING btree (last_updated);


--
-- Name: idx_uba_events_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_uba_events_last_updated ON public.uba_events USING btree (last_updated);


--
-- Name: idx_uba_projects_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_uba_projects_last_updated ON public.uba_projects USING btree (last_updated);


--
-- Name: idx_uba_projects_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_uba_projects_status ON public.uba_projects USING btree (project_status);


--
-- Name: idx_users_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_last_updated ON public.users USING btree (last_updated);


--
-- Name: alumni trg_alumni_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_alumni_last_updated BEFORE INSERT OR UPDATE ON public.alumni FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: courses_table trg_courses_table_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_courses_table_last_updated BEFORE INSERT OR UPDATE ON public.courses_table FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: department trg_department_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_department_last_updated BEFORE INSERT OR UPDATE ON public.department FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: employees trg_employees_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_employees_last_updated BEFORE INSERT OR UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: ewd_yearwise trg_ewd_yearwise_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ewd_yearwise_last_updated BEFORE INSERT OR UPDATE ON public.ewd_yearwise FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: externship_info trg_externship_info_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_externship_info_last_updated BEFORE INSERT OR UPDATE ON public.externship_info FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: faculty_engagement trg_faculty_engagement_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_faculty_engagement_last_updated BEFORE INSERT OR UPDATE ON public.faculty_engagement FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: iar_mous trg_iar_mous_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_iar_mous_last_updated BEFORE INSERT OR UPDATE ON public.iar_mous FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: icc_yearwise trg_icc_yearwise_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_icc_yearwise_last_updated BEFORE INSERT OR UPDATE ON public.icc_yearwise FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: icsr_consultancy_projects trg_icsr_consultancy_projects_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_icsr_consultancy_projects_last_updated BEFORE INSERT OR UPDATE ON public.icsr_consultancy_projects FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: icsr_csr trg_icsr_csr_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_icsr_csr_last_updated BEFORE INSERT OR UPDATE ON public.icsr_csr FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: icsr_sponsered_projects trg_icsr_sponsered_projects_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_icsr_sponsered_projects_last_updated BEFORE INSERT OR UPDATE ON public.icsr_sponsered_projects FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: igrs_yearwise trg_igrs_yearwise_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_igrs_yearwise_last_updated BEFORE INSERT OR UPDATE ON public.igrs_yearwise FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: industry_conclave trg_industry_conclave_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_industry_conclave_last_updated BEFORE INSERT OR UPDATE ON public.industry_conclave FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: industry_events trg_industry_events_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_industry_events_last_updated BEFORE INSERT OR UPDATE ON public.industry_events FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: innovation_projects trg_innovation_projects_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_innovation_projects_last_updated BEFORE INSERT OR UPDATE ON public.innovation_projects FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: iptif_facilities_table trg_iptif_facilities_table_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_iptif_facilities_table_last_updated BEFORE INSERT OR UPDATE ON public.iptif_facilities_table FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: iptif_program_table trg_iptif_program_table_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_iptif_program_table_last_updated BEFORE INSERT OR UPDATE ON public.iptif_program_table FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: iptif_projects_table trg_iptif_projects_table_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_iptif_projects_table_last_updated BEFORE INSERT OR UPDATE ON public.iptif_projects_table FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: iptif_startup_table trg_iptif_startup_table_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_iptif_startup_table_last_updated BEFORE INSERT OR UPDATE ON public.iptif_startup_table FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: mou_partner_logos trg_mou_partner_logos_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mou_partner_logos_last_updated BEFORE INSERT OR UPDATE ON public.mou_partner_logos FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: nirf_ranking trg_nirf_ranking_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_nirf_ranking_last_updated BEFORE INSERT OR UPDATE ON public.nirf_ranking FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: nptel_courses trg_nptel_courses_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_nptel_courses_last_updated BEFORE INSERT OR UPDATE ON public.nptel_courses FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: open_house trg_open_house_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_open_house_last_updated BEFORE INSERT OR UPDATE ON public.open_house FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: outreach trg_outreach_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_outreach_last_updated BEFORE INSERT OR UPDATE ON public.outreach FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: placement_companies trg_placement_companies_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_placement_companies_last_updated BEFORE INSERT OR UPDATE ON public.placement_companies FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: placement_packages trg_placement_packages_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_placement_packages_last_updated BEFORE INSERT OR UPDATE ON public.placement_packages FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: placement_summary trg_placement_summary_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_placement_summary_last_updated BEFORE INSERT OR UPDATE ON public.placement_summary FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: research_mous trg_research_mous_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_research_mous_last_updated BEFORE INSERT OR UPDATE ON public.research_mous FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: research_patents trg_research_patents_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_research_patents_last_updated BEFORE INSERT OR UPDATE ON public.research_patents FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: research_publications trg_research_publications_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_research_publications_last_updated BEFORE INSERT OR UPDATE ON public.research_publications FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: roles trg_roles_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_roles_last_updated BEFORE INSERT OR UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: student_table trg_student_table_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_student_table_last_updated BEFORE INSERT OR UPDATE ON public.student_table FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: techin_program_table trg_techin_program_table_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_techin_program_table_last_updated BEFORE INSERT OR UPDATE ON public.techin_program_table FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: techin_skill_development_program trg_techin_skill_development_program_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_techin_skill_development_program_last_updated BEFORE INSERT OR UPDATE ON public.techin_skill_development_program FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: techin_startup_table trg_techin_startup_table_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_techin_startup_table_last_updated BEFORE INSERT OR UPDATE ON public.techin_startup_table FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: uba_events trg_uba_events_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_uba_events_last_updated BEFORE INSERT OR UPDATE ON public.uba_events FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: uba_projects trg_uba_projects_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_uba_projects_last_updated BEFORE INSERT OR UPDATE ON public.uba_projects FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: users trg_users_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_users_last_updated BEFORE INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: users fk_role; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_role FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET DEFAULT;


--
-- PostgreSQL database dump complete
--

\unrestrict Hy7sSOSecbwTjjnsRIhj7Mf6Jo0DdjcO51XhOTmAFcgLRIaVeIFgpH9ikZ2FLps

