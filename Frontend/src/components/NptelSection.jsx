import { useState, useEffect } from 'react';
import {
  fetchNptelSummary,
  fetchNptelList
} from '../services/outreachExtensionStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LabelList
} from 'recharts';
import './Page.css';
import './AcademicSection.css';
import './NptelSection.css';
import DataUploadModal from './LazyDataUploadModal';
import { useNavigate } from 'react-router-dom';
import CustomTooltip from './CustomTooltip';
import ExportMenu from './ExportMenu';
import ChartExpandModal from './ChartExpandModal';

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value || 0);

function NptelSection({ user, isPublicView = false }) {
  const navigate = useNavigate();
  const uploadVersion = useUploadRefresh();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeUploadTable, setActiveUploadTable] = useState('');
  const token = localStorage.getItem('authToken');

  const isGuestUser = !user;
  const isReadOnlyView = isPublicView || isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 16;

  const [summary, setSummary] = useState({
    total_courses: 0,
    total_enrollments: 0,
    yearly_stats: []
  });
  const [listData, setListData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedChart, setExpandedChart] = useState(null);

  const [chartIsMobile, setChartIsMobile] = useState(window.innerWidth <= 640);
  useEffect(() => {
    const handle = () => setChartIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [sumRes, listRes] = await Promise.all([
          fetchNptelSummary(token),
          fetchNptelList(token)
        ]);
        setSummary(sumRes || { total_courses: 0, total_enrollments: 0, yearly_stats: [] });
        setListData(listRes?.courses || []);
      } catch (err) {
        setError(err.message || 'Failed to load NPTEL data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [token, uploadVersion]);

  if (error) {
    return (
      <div className="page-container">
        <div className="page-content">
          <h1>NPTEL &#8211; CCE</h1>
          <p className="error-message">{error}</p>
        </div>
      </div>
    );
  }

  const content = (
    <>
      {!isReadOnlyView && (
        <button className="page-back-btn" onClick={() => navigate('/outreach-extension')}>
          &#8592; Back to Outreach Extension
        </button>
      )}

      <div className="nptel-header">
        <h1 className="nptel-header-h1">CCE Statistics</h1>
        {!isReadOnlyView && isAdmin && (
          <button
            className="page-upload-btn"
            onClick={() => { setActiveUploadTable('nptel_courses'); setIsUploadModalOpen(true); }}
          >
            <span>&#128214;</span> Upload NPTEL Data
          </button>
        )}
      </div>

      <ChartExpandModal
        isOpen={!!expandedChart}
        onClose={() => setExpandedChart(null)}
        title={expandedChart?.title}
      >
        {expandedChart?.content}
      </ChartExpandModal>

      <div id="nptel-summary-cards-container" className="nptel-cards">
        <div className="nptel-card nptel-card--purple">
          <div className="nptel-card-header">
            <span className="nptel-card-icon">&#128218;</span>
            <h3 className="nptel-card-h3">Total Courses Offered</h3>
          </div>
          <div className="nptel-card-value">{formatNumber(summary.total_courses)}</div>
        </div>
        <div className="nptel-card nptel-card--pink">
          <div className="nptel-card-header">
            <span className="nptel-card-icon">&#128101;</span>
            <h3 className="nptel-card-h3">Total Enrollments</h3>
          </div>
          <div className="nptel-card-value">{formatNumber(summary.total_enrollments)}</div>
        </div>
      </div>

      <div className="nptel-panel nptel-panel--mb">
        <div className="nptel-panel-header">
          <h3 className="nptel-panel-h3">Enrollment &amp; Certification Trends</h3>
          <ExportMenu
            elementId="nptel-chart-container"
            data={summary.yearly_stats}
            headers={['Year', 'Enrollments', 'Certifications']}
            keys={['stat_year', 'enrollment_count', 'certification_count']}
            filename="nptel_trends"
            title="NPTEL Enrollment Trends"
          />
        </div>

        <div id="nptel-chart-container">
          {summary.yearly_stats && summary.yearly_stats.length > 0 ? (
            <div
              className="clickable-chart"
              onClick={() => setExpandedChart({
                title: "NPTEL Trends",
                content: (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartIsMobile ? summary.yearly_stats.slice(-3) : summary.yearly_stats} margin={{ top: 40, right: 30, left: 40, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="stat_year" stroke="#666" tick={{ fill: '#666', fontSize: 13, fontWeight: 600 }} />
                      <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 13, fontWeight: 600 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} />
                      <Bar dataKey="enrollment_count" name="Enrollments" fill="#667eea" radius={[6, 6, 0, 0]}>
                        <LabelList dataKey="enrollment_count" position="top" style={{ fontSize: '11px', fontWeight: 700, fill: '#667eea' }} />
                      </Bar>
                      <Bar dataKey="certification_count" name="Certifications" fill="#22c55e" radius={[6, 6, 0, 0]}>
                        <LabelList dataKey="certification_count" position="top" style={{ fontSize: '11px', fontWeight: 700, fill: '#22c55e' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )
              })}
            >
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartIsMobile ? summary.yearly_stats.slice(-3) : summary.yearly_stats} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="stat_year" stroke="#666" tick={{ fill: '#666', fontSize: 12 }} />
                  <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="enrollment_count" fill="#667eea" name="Enrollments" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="enrollment_count" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: '#667eea' }} />
                  </Bar>
                  <Bar dataKey="certification_count" fill="#22c55e" name="Certifications" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="certification_count" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: '#22c55e' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="nptel-chart-empty">No trend data available</div>
          )}
        </div>
      </div>

      <div className="nptel-panel">
        <div className="nptel-panel-header">
          <h3 className="nptel-panel-h3">Course Directory</h3>
          <ExportMenu
            elementId="nptel-courses-list-container"
            data={listData}
            headers={['Year', 'Course Name', 'Department', 'Faculty', 'Enrollment']}
            keys={['course_year', 'course_name', 'department_name', 'faculty_coordinator', 'student_enrollment']}
            filename="nptel_course_directory"
            title="NPTEL Course Directory"
          />
        </div>

        {chartIsMobile ? (
          <div className="nptel-mobile-list">
            {listData.length === 0 ? (
              <div className="nptel-mobile-empty">No courses found</div>
            ) : (
              listData.map((course) => (
                <div key={course.course_id} className="nptel-mobile-card">
                  <div className="nptel-mobile-top">
                    <span className="nptel-mobile-year">FY {course.course_year}</span>
                    <span className="nptel-mobile-dept">{course.department_name}</span>
                  </div>
                  <h4 className="nptel-mobile-h4">{course.course_name}</h4>
                  <div className="nptel-mobile-details">
                    <div><strong>Faculty:</strong> {course.faculty_coordinator || '—'}</div>
                    <div><strong>Enrollment:</strong> {course.student_enrollment || '0'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div id="nptel-courses-list-container" className="table-responsive">
            <table className="nptel-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Course Name</th>
                  <th>Department</th>
                  <th>Faculty</th>
                  <th>Enrollment</th>
                </tr>
              </thead>
              <tbody>
                {listData.length === 0 ? (
                  <tr><td colSpan="5" className="nptel-td-empty">No records found</td></tr>
                ) : (
                  listData.map((course, index) => (
                    <tr key={course.course_id} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                      <td className="nptel-td-year">{course.course_year}</td>
                      <td className="nptel-td-name">{course.course_name}</td>
                      <td className="nptel-td-text">{course.department_name}</td>
                      <td className="nptel-td-text">{course.faculty_coordinator || '—'}</td>
                      <td className="nptel-td-bold">{course.student_enrollment}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DataUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        tableName={activeUploadTable}
        token={token}
      />
    </>
  );

  return (
    <div className={isPublicView ? "" : "page-container performance-render-auto"}>
      <div className={isPublicView ? "" : "page-content"}>
        {loading ? (
          <div className="loading-container"><div className="loading-spinner" /></div>
        ) : content}
      </div>
    </div>
  );
}

export default NptelSection;
