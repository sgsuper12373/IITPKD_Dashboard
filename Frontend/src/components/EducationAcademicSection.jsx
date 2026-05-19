import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  fetchCourseCounts,
  fetchCourses
} from '../services/academicModuleStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';

import './Page.css';
import './AcademicSection.css';
import './GrievanceSection.css';
import './EducationAcademicSection.css';
import DataUploadModal from './LazyDataUploadModal';
import ExportMenu from './ExportMenu';

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value || 0);

function CourseTable({ courses, headerColor }) {
  if (!courses.length) {
    return (
      <div className="eas-table-empty">
        <span className="eas-table-empty-icon">&#128218;</span>
        <p className="eas-table-empty-p">No courses found.</p>
      </div>
    );
  }
  return (
    <div className="eas-table-wrap">
      <table className="grievance-table eas-table">
        <thead>
          <tr style={{ backgroundColor: headerColor }}>
            {['Course Name', 'Category', 'Programme', 'Industry Partner', 'Coordinator', 'Status'].map(col => (
              <th key={col} style={{ backgroundColor: headerColor }}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {courses.map((course, index) => (
            <tr key={course.course_id || index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa' }}>
              <td className="eas-td-name">{course.course_name}</td>
              <td>
                <span className="eas-cat-badge">{course.course_category}</span>
              </td>
              <td>{course.target_programme || '—'}</td>
              <td>{course.industry_partner || '—'}</td>
              <td>{course.industry_coordinator_name || '—'}</td>
              <td>
                <span className={`eas-status ${course.status === 'Active' ? 'eas-status--active' : 'eas-status--inactive'}`}>
                  {course.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EducationAcademicSection({ user, isPublicView = false }) {
  const uploadVersion = useUploadRefresh();
  const navigate = useNavigate();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeUploadTable, setActiveUploadTable] = useState('');

  const token = localStorage.getItem('authToken');

  const isGuestUser = !user;
  const isReadOnlyView = isPublicView || isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 4;

  const [courseCounts, setCourseCounts] = useState({
    total_all: 0, active_all: 0, inactive_all: 0,
    total_industry: 0, active_industry: 0, inactive_industry: 0
  });

  const [viewMode, setViewMode] = useState('all');
  const [allCourses, setAllCourses] = useState([]);
  const [industryCourses, setIndustryCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCourseCounts(token)
      .then(data => { if (data) setCourseCounts(data); })
      .catch(err => console.error('Failed to load course counts', err));
  }, [token, uploadVersion]);

  useEffect(() => {
    if (viewMode !== 'all') return;
    setLoading(true);
    setError(null);
    fetchCourses({ course_type: 'all', active_only: true }, '', 1, 1000, token)
      .then(resp => setAllCourses(resp?.data || []))
      .catch(err => setError(err.message || 'Failed to load courses'))
      .finally(() => setLoading(false));
  }, [token, viewMode, uploadVersion]);

  useEffect(() => {
    if (viewMode !== 'industry') return;
    setLoading(true);
    setError(null);
    fetchCourses({ course_type: 'industry', active_only: true }, '', 1, 1000, token)
      .then(resp => setIndustryCourses(resp?.data || []))
      .catch(err => setError(err.message || 'Failed to load industry courses'))
      .finally(() => setLoading(false));
  }, [token, viewMode, uploadVersion]);

  return (
    <div className={isPublicView ? '' : 'page-container'}>
      <div className={isPublicView ? '' : 'page-content'}>
        {!isReadOnlyView && (
          <button className="page-back-btn" onClick={() => navigate('/education')}>
            &#8592; Back to Education
          </button>
        )}
        {!isReadOnlyView && (
          <div className="page-header-row">
            <div className="page-header-left">
              <h1>Academic Section</h1>
            </div>
            {isAdmin && (
              <div className="page-header-actions">
                <button className="page-upload-btn" onClick={() => { setActiveUploadTable('courses_table'); setIsUploadModalOpen(true); }}>
                  <span>&#128228;</span> Upload Course Data
                </button>
              </div>
            )}
          </div>
        )}

        {error && <div className="eas-error">{error}</div>}

        <div className="eas-export-row">
          <ExportMenu
            elementId="education-academic-summary-cards-container"
            data={[courseCounts]}
            headers={['Active Courses', 'Industry Linked Courses']}
            keys={['active_all', 'active_industry']}
            filename="education_academic_summary"
            title="Education Academic Summary"
          />
        </div>

        <div id="education-academic-summary-cards-container" className="eas-cards">
          <div className="eas-card eas-card--indigo" onClick={() => setViewMode('all')}>
            <div className="eas-card-decor" />
            <div className="eas-card-inner">
              <div className="eas-card-header">
                <span className="eas-card-icon">&#128202;</span>
                <span className="eas-card-label">Active Courses</span>
              </div>
              <div className="eas-card-value">{formatNumber(courseCounts.active_all)}</div>
              <div className="eas-card-sub">Courses running in current AY &middot; Click to browse &#8594;</div>
            </div>
          </div>

          <div className="eas-card eas-card--orange" onClick={() => setViewMode('industry')}>
            <div className="eas-card-decor" />
            <div className="eas-card-inner">
              <div className="eas-card-header">
                <span className="eas-card-icon">&#127981;</span>
                <span className="eas-card-label">Active Industry Linked Courses</span>
              </div>
              <div className="eas-card-value">{formatNumber(courseCounts.active_industry)}</div>
              <div className="eas-card-sub">Courses running in current AY &middot; Click to browse &#8594;</div>
            </div>
          </div>
        </div>

        <div className="eas-content-area">
          {loading && (
            <div className="eas-loading-overlay">
              <div className="loading-spinner" />
            </div>
          )}

          <div className="eas-content-wrap" style={{ opacity: loading ? 0.6 : 1 }}>
            <div className="eas-toolbar">
              <div>
                <h3 className="eas-table-h3">
                  {viewMode === 'all' ? 'Active Courses Repository' : 'Industry Linked Courses'}
                </h3>
                <p className="eas-table-sub">
                  {viewMode === 'all'
                    ? `${allCourses.length} courses currently running`
                    : `${industryCourses.length} courses collaborating with industry partners`}
                </p>
              </div>
              <ExportMenu
                elementId="education-academic-courses-table"
                data={viewMode === 'all' ? allCourses : industryCourses}
                headers={['Course Name', 'Category', 'Programme', 'Industry Partner', 'Coordinator', 'Status']}
                keys={['course_name', 'course_category', 'target_programme', 'industry_partner', 'industry_coordinator_name', 'status']}
                filename={viewMode === 'all' ? "active_courses_repository" : "industry_linked_courses"}
                title={viewMode === 'all' ? "Active Courses Repository" : "Industry Linked Courses"}
                exportType="table"
              />
            </div>

            <div id="education-academic-courses-table">
              <CourseTable
                courses={viewMode === 'all' ? allCourses : industryCourses}
                headerColor={viewMode === 'all' ? '#6366f1' : '#f97316'}
              />
            </div>
          </div>
        </div>
      </div>

      <DataUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        tableName={activeUploadTable}
        token={token}
      />
    </div>
  );
}

export default EducationAcademicSection;
