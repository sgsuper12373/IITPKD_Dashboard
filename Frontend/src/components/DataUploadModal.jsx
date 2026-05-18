import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import cachedAxios from '../utils/cachedAxios';
import './DataUploadModal.css';

/**
 * Reusable modal for bulk-uploading CSV data to a specific database table.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Visibilitiy toggle.
 * @param {function} props.onClose - Callback to close the modal.
 * @param {string} props.tableName - The backend database table to update.
 * @param {string} props.token - JWT Auth token.
 * @param {function} props.onUploadSuccess - Callback to refresh parent component data.
 */
function DataUploadModal({ isOpen, onClose, tableName, token, onUploadSuccess }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [failingRow, setFailingRow] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setSelectedFile(null);
            setPreviewData(null);
            setMessage(null);
            setUploadSuccess(false);
            setIsLoading(false);
            setFailingRow(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleClose = () => {
        const wasSuccess = uploadSuccess;
        setSelectedFile(null);
        setPreviewData(null);
        setMessage(null);
        setUploadSuccess(false);
        setIsLoading(false);
        setFailingRow(null);
        onClose();

        if (wasSuccess) {
            cachedAxios.clearAll(); // invalidate all cached API responses after data upload
            window.dispatchEvent(new CustomEvent('iitpkd:upload-success', { detail: { tableName } }));
            if (onUploadSuccess) {
                onUploadSuccess();
            }
        }
    };

    const parseCSVPreview = (csvText) => {
        try {
            const lines = csvText.trim().split('\n');
            if (lines.length === 0) return;

            const header = lines[0].split(',');
            const rows = lines.slice(1, 51)
                .filter(line => line)
                .map(line => line.split(','));

            setPreviewData({ header, rows });
        } catch (e) {
            console.error("Failed to parse CSV preview:", e);
            setPreviewData(null);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setSelectedFile(file);
        setMessage(null);
        setUploadSuccess(false);
        setFailingRow(null);

        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                parseCSVPreview(event.target.result);
            };
            reader.readAsText(file);
        } else {
            setPreviewData(null);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !token) return;

        setIsLoading(true);
        setMessage(null);

        const formData = new FormData();
        formData.append('table_name', tableName);
        formData.append('csv_file', selectedFile);

        try {
            const response = await axios.post(
                `${import.meta.env.VITE_API_BASE_URL}/api/upload-csv`,
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            const successMsg = response.data.message || `Successfully updated table ${tableName}`;
            setMessage({ type: 'success', text: successMsg });
            setUploadSuccess(true);
            
            // Note: window.dispatchEvent and onUploadSuccess() are now handled
            // inside handleClose() so the parent components don't immediately refresh data,
            // unmount/re-render the modal, and cause the success message to instantly "flash".
            
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message || 'An error occurred during upload.';
            const errorDetails = error.response?.data?.details;
            const rowNumber = error.response?.data?.row_number ?? null;

            let finalMessage = errorMsg;
            if (errorDetails) finalMessage += ` — ${errorDetails}`;

            setMessage({ type: 'error', text: finalMessage });
            setFailingRow(rowNumber);
            setUploadSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };

    // Template Data for various tables
    const getTemplateData = (table) => {
        switch (table) {
            case 'alumni':
                return {
                    headers: ["sl_no", "roll_number", "year_of_admission", "year_of_graduation", "course_type", "course_name", "department", "current_job", "country_of_settlement", "place_of_settlement_state", "alumni_contribution"],
                    sample: ["1", "Sample roll_number", "1", "1", "Sample course_type", "Sample course_name", "Sample department", "Sample current_job", "Sample country_of_settlement", "Sample place_of_settlement_state", "Sample alumni_contribution"]
                };
            case 'courses_table':
                return {
                    headers: ["course_code", "course_name", "credit_l_t_p_c", "course_category", "proposing_faculty_name", "faculty_affiliation", "target_programme", "target_discipline", "prerequisite", "date_of_proposal", "proposal_type", "bac_number", "senate_number", "course_proposal_pdf", "is_industry_course", "industry_partner", "industry_coordinator_name", "course_status_currentay", "course_status_history"],
                    sample: ["Sample course_code", "Sample course_name", "Sample credit_l_t_p_c", "Sample course_category", "Sample proposing_faculty_name", "Sample faculty_affiliation", "Sample target_programme", "Sample target_discipline", "Sample prerequisite", "2023-01-01", "Sample proposal_type", "1", "1", "Sample course_proposal_pdf", "Sample is_industry_course", "Sample industry_partner", "Sample industry_coordinator_name", "Sample course_status_currentay", "Sample course_status_history"]
                };
            case 'employees':
                return {
                    headers: ["empid", "empname", "designation", "phonenumber", "bloodgroup", "dob", "initial_doj", "doj", "dor", "gender", "email", "personalmail", "marital_status", "address", "paylevel", "group_name", "ltchometown", "employmentnature", "appointmentmode", "basicpay", "department", "emp_type", "pwd", "notificationnumber", "notificationdate", "empstatus", "prior_industry_exp_in_months", "prior_research_exp_in_months", "prior_teaching_exp_in_months", "total_teaching_exp_in_months", "original_category", "appointed_category"],
                    sample: ["IITPKD1234", "John Doe", "Assistant Professor Gr. I", "9876543210", "O+", "1990-01-15", "2017-11-01", "2022-03-25", "2055-01-31", "Male", "john@iitpkd.ac.in", "john@gmail.com", "Married", "123 Main St, City", "F13A1", "group_name", "Hometown", "Regular", "Direct Recruitment", "101500", "Computer Science and Engineering", "Teaching", "No", "IITPKD/R/F/01/2022", "2022-01-10", "Active", "", "", "", "", "GEN", "OBC"]
                };
            case 'ewd_yearwise':
                return {
                    headers: ["ewd_year", "annual_electricity_consumption", "per_capita_electricity_consumption", "per_capita_water_consumption", "per_capita_recycled_water", "green_coverage"],
                    sample: ["1", "1", "100.5", "100.5", "100.5", "100.5"]
                };
            case 'externship_info':
                return {
                    headers: ["employeeid", "empname", "department", "industry_name", "startdate", "enddate", "type", "remarks", "createddate", "modifieddate"],
                    sample: ["Sample employeeid", "Sample empname", "Sample department", "Sample industry_name", "2023-01-01", "2023-01-01", "Sample type", "Sample remarks", "2023-01-01", "2023-01-01"]
                };
            case 'faculty_engagement':
                return {
                    headers: ["engagement_code", "faculty_name", "engagement_type", "department", "startdate", "enddate", "duration_months", "year", "remarks", "fc_bg_type"],
                    sample: ["Sample engagement_code", "Sample faculty_name", "Sample engagement_type", "Sample department", "2023-01-01", "2023-01-01", "1", "1", "Sample remarks", "Academia"]
                };
            case 'icc_yearwise':
                return {
                    headers: ["complaints_year", "total_complaints", "complaints_resolved", "complaints_pending"],
                    sample: ["1", "1", "1", "1"]
                };
            case 'igrs_yearwise':
                return {
                    headers: ["grievance_year", "total_grievances_filed", "grievances_resolved", "grievances_pending"],
                    sample: ["1", "1", "1", "1"]
                };
            case 'industry_conclave':
                return {
                    headers: ["start_date", "end_date", "theme", "focus_area", "number_of_com", "sessions_held", "key_speakers", "event_photos_url", "brochure_url", "description", "created_at"],
                    sample: ["2023-01-01", "2023-01-01", "Sample theme", "Sample focus_area", "1", "1", "Sample key_speakers", "Sample event_photos_url", "Sample brochure_url", "Sample description", "2023-01-01"]
                };
            case 'nirf_ranking':
                return {
                    headers: ["year", "tlr_score", "rpc_score", "go_score", "oi_score", "pr_score", "rank"],
                    sample: ["2024", "100.5", "100.5", "100.5", "100.5", "100.5", "1"]
                };
            case 'open_house':
                return {
                    headers: ["event_year", "event_date", "theme", "target_audience", "departments_participated", "num_departments", "total_visitors", "key_highlights", "photos_url", "poster_url", "brochure_url", "created_at"],
                    sample: ["1", "2023-01-01", "Sample theme", "Sample target_audience", "Sample departments_participated", "1", "1", "Sample key_highlights", "Sample photos_url", "Sample poster_url", "Sample brochure_url", "2023-01-01"]
                };
            case 'placement_companies':
                return {
                    headers: ["placement_year", "company_name", "sector", "offers", "hires", "is_top_recruiter", "created_at"],
                    sample: ["1", "Sample company_name", "Sample sector", "1", "1", "TRUE", "2023-01-01"]
                };
            case 'placement_packages':
                return {
                    headers: ["placement_year", "program", "highest_package", "lowest_package", "average_package"],
                    sample: ["1", "Sample program", "100.5", "100.5", "100.5"]
                };
            case 'placement_summary':
                return {
                    headers: ["placement_year", "program", "gender", "registered", "placed"],
                    sample: ["1", "Sample program", "Sample gender", "1", "1"]
                };
            case 'research_mous':
                return {
                    headers: ["partner_name", "collaboration_nature", "date_signed", "validity_end", "remarks"],
                    sample: ["Sample partner_name", "Sample collaboration_nature", "2023-01-01", "2023-01-01", "Sample remarks"]
                };
            case 'research_patents':
                return {
                    headers: ["patent_title", "patent_status", "filing_date", "grant_date", "remarks", "inventor1", "inventor1_category", "inventor2", "inventor2_category", "inventor3", "inventor3_category", "inventor4", "inventor4_category"],
                    sample: ["Sample patent_title", "Sample patent_status", "2023-01-01", "2023-01-01", "Sample remarks", "Sample inventor1", "Sample inventor1_category", "Sample inventor2", "Sample inventor2_category", "Sample inventor3", "Sample inventor3_category", "Sample inventor4", "Sample inventor4_category"]
                };
            case 'research_publications':
                return {
                    headers: ["publication_title", "journal_name", "department", "faculty_name", "publication_year", "publication_type"],
                    sample: ["Sample Title", "Sample Journal", "Computer Science and Engineering", "Dr. Sample Name", "2024", "Journal Article"]
                };
            case 'student_table':
                return {
                    headers: ["roll_no_admission", "roll_no_current", "name_of_student", "programme_admission", "programme_current", "admission_year", "admission_cycle", "admission_batch", "date_of_joining", "date_of_validity", "department_admission", "department_current", "stream_admission", "stream_current", "current_semester", "gender", "original_category", "admission_category", "hosteller_day_scholar", "date_of_birth", "residential_address", "nationality", "state", "pwd_status", "disability_type", "blood_group", "apaar_id", "qualifying_exam", "qualifying_exam_score", "student_contact_no", "institute_email", "personal_email", "parent_name", "parent_contact_no", "parent_email", "faculty_advisor", "institute_scholarship", "nsp_scholarship_recipient", "preparatory", "branch_change", "branch_change_remarks", "slowpaced", "upgraded", "date_of_upgradation", "idc_current", "number_of_total_idcs", "idc_history", "break_type", "break_from_date", "break_to_date", "break_history", "student_status", "student_status_date", "student_status_remarks", "fellowship_status_admission", "fellowship_status_current", "dc_chairperson", "dc_members", "thesis_submission_date", "viva_voice_date", "academic_program_type"],
                    sample: ["1", "1", "Sample name_of_student", "Sample programme_admission", "Sample programme_current", "1", "Sample admission_cycle", "1", "2023-01-01", "2023-01-01", "Sample department_admission", "Sample department_current", "Sample stream_admission", "Sample stream_current", "1", "Sample gender", "Sample original_category", "Sample admission_category", "Sample hosteller_day_scholar", "2023-01-01", "Sample residential_address", "Sample nationality", "Sample state", "Sample pwd_status", "Sample disability_type", "Sample blood_group", "Sample apaar_id", "Sample qualifying_exam", "1", "1", "Sample institute_email", "Sample personal_email", "Sample parent_name", "1", "Sample parent_email", "Sample faculty_advisor", "Sample institute_scholarship", "Sample nsp_scholarship_recipient", "Sample preparatory", "Sample branch_change", "Sample branch_change_remarks", "Sample slowpaced", "Sample upgraded", "2023-01-01", "Sample idc_current", "1", "Sample idc_history", "Sample break_type", "2023-01-01", "2023-01-01", "Sample break_history", "Sample student_status", "2023-01-01", "Sample student_status_remarks", "Sample fellowship_status_admission", "Sample fellowship_status_current", "Sample dc_chairperson", "Sample dc_members", "2023-01-01", "2023-01-01", "UG"]
                };
            case 'uba_events':
                return {
                    headers: ["year", "program_name", "program_type", "association", "start_date", "end_date", "targeted_audience", "num_attendees", "num_schools", "num_colleges", "geographic_reach", "remarks"],
                    sample: ["2024 - 2025", "Sample Program Name", "Visit", "Sample Association", "2024-06-01", "2024-06-01", "Students", "50", "2", "0", "Palakkad", "Sample remarks"]
                };
            case 'uba_projects':
                return {
                    headers: ["project_title", "coordinator_name", "intervention_description", "project_status", "start_date", "end_date", "collaboration_partners", "created_at"],
                    sample: ["Sample project_title", "Sample coordinator_name", "Sample intervention_description", "Sample project_status", "2023-01-01", "2023-01-01", "Sample collaboration_partners", "2023-01-01"]
                };
            case 'icsr_sponsered_projects':
                return {
                    headers: ["project_id", "project_title", "principal_investigator", "principal_investigator_department", "co_principal_investigator1", "co_principal_investigator1_department", "co_principal_investigator2", "co_principal_investigator2_department", "funding_agency", "client_organization", "amount_sanctioned", "start_date", "end_date", "status", "created_at"],
                    sample: ["1", "Sample project_title", "Sample principal_investigator", "Sample principal_investigator_department", "Sample co_principal_investigator1", "Sample co_principal_investigator1_department", "Sample co_principal_investigator2", "Sample co_principal_investigator2_department", "Sample funding_agency", "Sample client_organization", "100.5", "2023-01-01", "2023-01-01", "Sample status", "2023-01-01"]
                };
            case 'icsr_consultancy_projects':
                return {
                    headers: ["project_id", "project_title", "principal_investigator", "department", "funding_agency", "client_organization", "amount_sanctioned", "start_date", "end_date", "status", "created_at"],
                    sample: ["1", "Sample project_title", "Sample principal_investigator", "Sample department", "Sample funding_agency", "Sample client_organization", "100.5", "2023-01-01", "2023-01-01", "Sample status", "2023-01-01"]
                };
            case 'icsr_csr':
                return {
                    headers: ["csr_id", "csr_organisation", "year", "type_of_company", "type_of_support", "amount_given"],
                    sample: ["1", "Sample csr_organisation", "1", "Sample type_of_company", "Sample type_of_support", "100.5"]
                };
            case 'innovation_projects':
                return {
                    headers: ["project_title", "project_type", "sector", "year_started", "status", "description", "created_at"],
                    sample: ["Sample project_title", "Sample project_type", "Sample sector", "1", "Sample status", "Sample description", "2023-01-01"]
                };
            case 'iptif_startup_table':
                return {
                    headers: ["id", "startup_name", "domain", "startup_origin", "incubated_date", "status", "revenue", "number_of_jobs", "remarks"],
                    sample: ["1", "Sample startup_name", "Sample domain", "Sample startup_origin", "2023-01-01", "Sample status", "100.5", "1", "Sample remarks"]
                };
            case 'iptif_program_table':
                return {
                    headers: ["id", "program_name", "type", "association", "start_end", "date", "targetted_audi", "no_of_attendees", "remarks"],
                    sample: ["1", "Sample program_name", "Sample type", "Sample association", "2023-01-01", "2023-01-01", "Sample targetted_audi", "1", "Sample remarks"]
                };
            case 'iptif_projects_table':
                return {
                    headers: ["project_id", "project_name", "scheme", "status", "start_date"],
                    sample: ["1", "Sample project_name", "Sample scheme", "Sample status", "2023-01-01"]
                };
            case 'iptif_facilities_table':
                return {
                    headers: ["facility_id", "facility_name", "facility_type", "revenue_made", "availability_status", "financial_year"],
                    sample: ["1", "Sample facility_name", "Sample facility_type", "100.5", "Sample availability_status", "1"]
                };
            case 'techin_startup_table':
                return {
                    headers: ["id", "startup_name", "domain", "startup_origin", "incubated_date", "status", "revenue", "number_of_jobs", "remarks"],
                    sample: ["1", "Sample startup_name", "Sample domain", "Sample startup_origin", "2023-01-01", "Sample status", "100.5", "1", "Sample remarks"]
                };
            case 'techin_program_table':
                return {
                    headers: ["id", "program_name", "type", "association", "start_end", "event_date", "targetted_audience", "no_of_attendess", "remarks"],
                    sample: ["1", "Sample program_name", "Sample type", "Sample association", "2023-01-01", "2023-01-01", "Sample targetted_audience", "1", "Sample remarks"]
                };
            case 'techin_skill_development_program':
                return {
                    headers: ["id", "program_name", "category", "association", "start_end", "event_date", "targetted_audience", "no_of_attendess", "remarks"],
                    sample: ["1", "Sample program_name", "Sample category", "Sample association", "2023-01-01", "2023-01-01", "Sample targetted_audience", "1", "Sample remarks"]
                };
            case 'industry_events':
                return {
                    headers: ["project_id", "event_name", "date_of_event", "event_type", "target_audience", "hosted_by", "funding_by", "amount", "year"],
                    sample: ["1", "Sample event_name", "2023-01-01", "Sample event_type", "Sample target_audience", "Sample hosted_by", "Sample funding_by", "100.5", "1"]
                };
            case 'outreach':
                return {
                    headers: ["academic_year", "created_by", "created_at", "program_name", "program_type", "engagement_type", "association", "start_date", "end_date", "targeted_audience", "num_attendees", "num_schools", "num_colleges", "geographic_reach", "remarks", "sq_stipend_provided", "sq_travel_allowance", "sq_num_lab_sessions", "sq_districts_covered", "pmc_target_class", "pmc_mathematician_led", "pmc_num_sessions", "pbd_lecture_topic", "pbd_speaker_name", "pbd_speaker_affiliation", "iv_visiting_institution", "iv_visiting_institution_type", "iv_num_groups", "nss_activity_type", "nss_volunteer_count", "nss_community_reached", "extra_data"],
                    sample: ["Sample academic_year", "Sample created_by", "2023-01-01", "Sample program_name", "Sample program_type", "Sample engagement_type", "Sample association", "2023-01-01", "2023-01-01", "Sample targeted_audience", "1", "1", "1", "Sample geographic_reach", "Sample remarks", "TRUE", "TRUE", "1", "Sample sq_districts_covered", "Sample pmc_target_class", "TRUE", "1", "Sample pbd_lecture_topic", "Sample pbd_speaker_name", "Sample pbd_speaker_affiliation", "Sample iv_visiting_institution", "Sample iv_visiting_institution_type", "1", "Sample nss_activity_type", "1", "Sample nss_community_reached", "Sample extra_data"]
                };
            // ── Outreach: per-program templates (program_name injected by backend) ──
            case 'outreach_science_quest':
                return {
                    headers: ["academic_year", "created_by", "program_type", "engagement_type", "association", "start_date", "end_date", "targeted_audience", "num_attendees", "num_schools", "num_colleges", "geographic_reach", "remarks", "sq_stipend_provided", "sq_travel_allowance", "sq_num_lab_sessions", "sq_districts_covered"],
                    sample:  ["2024-2025", "John Doe", "Camp", "Student", "Sample association", "2024-06-01", "2024-06-05", "School Students", "120", "5", "0", "Palakkad, Thrissur", "Sample remarks", "TRUE", "TRUE", "6", "Palakkad, Malappuram"]
                };
            case 'outreach_math_circle':
                return {
                    headers: ["academic_year", "created_by", "program_type", "engagement_type", "association", "start_date", "end_date", "targeted_audience", "num_attendees", "num_schools", "num_colleges", "geographic_reach", "remarks", "pmc_target_class", "pmc_mathematician_led", "pmc_num_sessions"],
                    sample:  ["2024-2025", "John Doe", "Workshop", "Student", "Sample association", "2024-07-10", "2024-07-10", "Class 8-10 Students", "60", "3", "0", "Palakkad", "Sample remarks", "Class 8-9", "Jasine, Jayasree, Krithika", "4"]
                };
            case 'outreach_pale_blue_dot':
                return {
                    headers: ["academic_year", "created_by", "program_type", "engagement_type", "association", "start_date", "end_date", "targeted_audience", "num_attendees", "num_schools", "num_colleges", "geographic_reach", "remarks", "pbd_lecture_topic", "pbd_speaker_name", "pbd_speaker_affiliation"],
                    sample:  ["2024-2025", "John Doe", "Public Lecture", "Social", "Sample association", "2024-08-15", "2024-08-15", "General Public", "200", "0", "2", "Kerala", "Sample remarks", "Life in the Universe", "Dr. Sample Name", "IISc Bangalore"]
                };
            case 'outreach_institute_visits':
                return {
                    headers: ["academic_year", "created_by", "program_type", "engagement_type", "association", "start_date", "end_date", "targeted_audience", "num_attendees", "num_schools", "num_colleges", "geographic_reach", "remarks", "iv_visiting_institution", "iv_visiting_institution_type", "iv_num_groups"],
                    sample:  ["2024-2025", "John Doe", "Visit", "Student", "Sample association", "2024-09-20", "2024-09-20", "School Students", "80", "1", "0", "Palakkad", "Sample remarks", "Sample School Name", "School", "2"]
                };
            case 'outreach_nss_activities':
                return {
                    headers: ["academic_year", "created_by", "program_type", "engagement_type", "association", "start_date", "end_date", "targeted_audience", "num_attendees", "num_schools", "num_colleges", "geographic_reach", "remarks", "nss_activity_type", "nss_volunteer_count", "nss_community_reached"],
                    sample:  ["2024-2025", "John Doe", "Activity", "Social", "Sample association", "2024-10-02", "2024-10-02", "Local Community", "50", "0", "0", "Palakkad", "Sample remarks", "Blood Donation Camp", "30", "Kalmandapam Village"]
                };
            case 'department':
                return {
                    headers: ["deptcode", "deptname", "coursesoffered", "faculty", "courselist"],
                    sample: ["Sample deptcode", "Sample deptname", "Sample coursesoffered", "Sample faculty", "Sample courselist"]
                };
            default:
                return { headers: [], sample: [] };
        }
    };

    const handleDownloadTemplate = () => {
        const { headers, sample } = getTemplateData(tableName);
        if (headers.length === 0) return;

        const csvContent = [
            headers.join(','),
            sample.join(',')
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${tableName}_template.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const templateInfo = getTemplateData(tableName);

    const modalContent = (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Upload Data: {tableName}</h2>
                    <button className="close-btn" onClick={handleClose}>&times;</button>
                </div>

                <div className="modal-body">
                    {!uploadSuccess ? (
                        <>
                            <div className="warning-box">
                                <span className="warning-icon">⚠️</span>
                                <div>
                                    <strong>Warning:</strong> You are directly modifying the database.
                                    Ensure the CSV format matches the table schema exactly.

                                    <div style={{ marginTop: '0.5rem' }}>
                                        <button
                                            className="download-template-btn"
                                            onClick={handleDownloadTemplate}
                                            style={{
                                                backgroundColor: 'transparent',
                                                border: '1px solid #f59e0b',
                                                color: '#f59e0b',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            Download CSV Template
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="required-format-section" style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#ccc' }}>
                                <strong>Required Column Headers:</strong>
                                <div style={{
                                    backgroundColor: '#2d3748',
                                    padding: '0.5rem',
                                    borderRadius: '4px',
                                    marginTop: '0.25rem',
                                    fontFamily: 'monospace',
                                    overflowX: 'auto',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {templateInfo.headers.join(', ')}
                                </div>
                            </div>

                            <div className="file-input-container">
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    disabled={isLoading}
                                />
                            </div>

                            {previewData && (
                                <div className="preview-section">
                                    <h4>CSV Preview (First {previewData.rows.length} Rows)</h4>
                                    <div style={{ maxHeight: '200px', overflowY: 'auto', overflowX: 'auto' }}>
                                    <table className="preview-table">
                                        <thead>
                                            <tr>
                                                {previewData.header.map((head, i) => <th key={i}>{head}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewData.rows.map((row, i) => {
                                                // i is 0-based; failingRow is 1-based data row number
                                                const isFailingRow = failingRow !== null && failingRow === i + 1;
                                                return (
                                                    <tr key={i} style={isFailingRow ? {
                                                        backgroundColor: 'rgba(220, 53, 69, 0.25)',
                                                        outline: '2px solid #dc3545'
                                                    } : {}}>
                                                        {row.map((cell, j) => <td key={j}>{cell}</td>)}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    </div>
                                </div>
                            )}

                            {message && (
                                <div className={`status-message ${message.type}`}>
                                    {message.type === 'error' && failingRow && (
                                        <div style={{ fontWeight: 'bold', marginBottom: '0.3rem' }}>
                                            Problem at CSV row {failingRow}
                                            {failingRow <= 50
                                                ? ' (highlighted in preview above)'
                                                : ' (beyond preview range — check your CSV directly)'}
                                        </div>
                                    )}
                                    {message.text}
                                </div>
                            )}

                            <div className="upload-actions">
                                <button className="cancel-btn" onClick={handleClose} disabled={isLoading}>
                                    Cancel
                                </button>
                                <button
                                    className="upload-btn"
                                    onClick={handleUpload}
                                    disabled={!selectedFile || isLoading}
                                >
                                    {isLoading ? 'Uploading...' : 'Confirm Upload'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="success-view" style={{ textAlign: 'center', padding: '2rem 0' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                            <h3 style={{ color: '#2ecc71', marginBottom: '1rem' }}>Upload Successful!</h3>
                            <p style={{ marginBottom: '2rem', color: '#555' }}>
                                {message?.text || `Successfully updated table ${tableName}`}
                            </p>
                            <p style={{ fontSize: '0.9rem', color: '#888', marginBottom: '2rem' }}>
                                Click OK to close this window.
                            </p>
                            <button
                                onClick={handleClose}
                                style={{
                                    padding: '10px 30px',
                                    backgroundColor: '#2ecc71',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    fontSize: '1rem',
                                    fontWeight: 'bold'
                                }}
                            >
                                OK
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

export default DataUploadModal;
