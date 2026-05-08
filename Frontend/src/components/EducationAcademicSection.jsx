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
import DataUploadModal from './LazyDataUploadModal';
import ExportMenu from './ExportMenu';

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value || 0);

function CourseTable({ courses, headerColor, user }) {
  if (!courses.length) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📚</span>
        <p style={{ color: '#666', fontSize: '16px' }}>No courses found.</p>
      </div>
    );
  }
  return (
    <div style={{
      maxHeight: '520px',
      overflowY: 'auto',
      overflowX: 'auto',
      border: '1px solid #e0e0e0',
      borderRadius: '12px',
      backgroundColor: '#fff',
      position: 'relative'
    }}>
      <table className="grievance-table" style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', minWidth: '800px' }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
          <tr style={{ backgroundColor: headerColor, color: 'white' }}>
            {['Course Name', 'Category', 'Programme', 'Industry Partner', 'Coordinator', 'Status'].map(col => (
              <th key={col} style={{ padding: '14px 12px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: headerColor, fontSize: '13px' }}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {courses.map((course, index) => (
            <tr key={course.course_id || index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #e0e0e0' }}>
              <td style={{ padding: '12px', fontWeight: '500', fontSize: '13px' }}>{course.course_name}</td>
              <td style={{ padding: '12px', fontSize: '13px' }}>
                <span style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500' }}>
                  {course.course_category}
                </span>
              </td>
              <td style={{ padding: '12px', fontSize: '13px' }}>{course.target_programme || '—'}</td>
              <td style={{ padding: '12px', fontSize: '13px' }}>{course.industry_partner || '—'}</td>
              <td style={{ padding: '12px', fontSize: '13px' }}>{course.industry_coordinator_name || '—'}</td>
              <td style={{ padding: '12px', fontSize: '13px' }}>
                <span style={{
                  backgroundColor: course.status === 'Active' ? '#dcfce7' : '#fee2e2',
                  color: course.status === 'Active' ? '#166534' : '#991b1b',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
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

  // Summary counts from /course-counts
  const [courseCounts, setCourseCounts] = useState({
    total_all: 0, active_all: 0, inactive_all: 0,
    total_industry: 0, active_industry: 0, inactive_industry: 0
  });

  // View mode: 'all' = Courses Repository, 'industry' = Industry Linked Courses
  const [viewMode, setViewMode] = useState('all');

  // Course data
  const [allCourses, setAllCourses] = useState([]);
  const [industryCourses, setIndustryCourses] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load summary counts on mount
  useEffect(() => {
    fetchCourseCounts(token)
      .then(data => { if (data) setCourseCounts(data); })
      .catch(err => console.error('Failed to load course counts', err));
  }, [token, uploadVersion]);

  // Load all courses for "Courses Repository"
  useEffect(() => {
    if (viewMode !== 'all') return;
    setLoading(true);
    setError(null);
    fetchCourses({ course_type: 'all', active_only: true }, '', 1, 1000, token)
      .then(resp => setAllCourses(resp?.data || []))
      .catch(err => setError(err.message || 'Failed to load courses'))
      .finally(() => setLoading(false));
  }, [token, viewMode, uploadVersion]);

  // Load industry courses for "Industry Linked Courses"
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
            ← Back to Education
          </button>
        )}
        {!isReadOnlyView && (
          <div className="page-header-row">
            <div className="page-header-left">
              <h1>Academic Section</h1>
            </div>
            {!isReadOnlyView && isAdmin && (
              <div className="page-header-actions">
                <button className="page-upload-btn" onClick={() => { setActiveUploadTable('courses_table'); setIsUploadModalOpen(true); }}>
                  <span>📤</span> Upload Course Data
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{ padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '10px' }}>
          <ExportMenu
            elementId="education-academic-summary-cards-container"
            data={[courseCounts]}
            headers={['Active Courses', 'Industry Linked Courses']}
            keys={['active_all', 'active_industry']}
            filename="education_academic_summary"
            title="Education Academic Summary"
          />
        </div>
        {/* Summary Cards — 2 primary cards */}
        <div id="education-academic-summary-cards-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '36px' }}>
          {/* Active Courses */}
          <div
            onClick={() => setViewMode('all')}
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              borderRadius: '20px', padding: '28px',
              boxShadow: '0 10px 20px rgba(99,102,241,0.25)',
              color: 'white', position: 'relative', overflow: 'hidden',
              cursor: 'pointer', transition: 'transform 0.2s'
            }}
          >
            <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <span style={{ fontSize: '28px', background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '12px' }}>📊</span>
                <span style={{ fontSize: '14px', opacity: 0.9, fontWeight: '500' }}>Active Courses</span>
              </div>
              <div style={{ fontSize: '52px', fontWeight: 'bold', marginBottom: '6px' }}>{formatNumber(courseCounts.active_all)}</div>
              <div style={{ fontSize: '12px', opacity: 0.7 }}>Courses running in current AY · Click to browse →</div>
            </div>
          </div>

          {/* Industry Linked Courses */}
          <div
            onClick={() => setViewMode('industry')}
            style={{
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              borderRadius: '20px', padding: '28px',
              boxShadow: '0 10px 20px rgba(249,115,22,0.25)',
              color: 'white', position: 'relative', overflow: 'hidden',
              cursor: 'pointer', transition: 'transform 0.2s'
            }}
          >
            <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <span style={{ fontSize: '28px', background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '12px' }}>🏭</span>
                <span style={{ fontSize: '14px', opacity: 0.9, fontWeight: '500' }}>Active Industry Linked Courses</span>
              </div>
              <div style={{ fontSize: '52px', fontWeight: 'bold', marginBottom: '6px' }}>{formatNumber(courseCounts.active_industry)}</div>
              <div style={{ fontSize: '12px', opacity: 0.7 }}>Courses running in current AY · Click to browse →</div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', position: 'relative', minHeight: '500px' }}>

          {loading && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.6)', zIndex: 20, display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '16px' }}>
              <div className="loading-spinner" />
            </div>
          )}

          <div style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', color: '#333', transition: 'color 0.3s' }}>
                  {viewMode === 'all' ? 'Active Courses Repository' : 'Industry Linked Courses'}
                </h3>
                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
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
                user={user}
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
    </div >
  );
}

export default EducationAcademicSection;
