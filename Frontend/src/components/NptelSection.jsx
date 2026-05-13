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
  const isAdmin = user?.role_id === 3 || user?.role_id === 4;

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
          <h1>NPTEL – CCE</h1>
          <p className="error-message">{error}</p>
        </div>
      </div>
    );
  }

  const content = (
    <>
      {!isReadOnlyView && (
        <button className="page-back-btn" onClick={() => navigate('/outreach-extension')}>
          ← Back to Outreach Extension
        </button>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '15px' }}>
        <h1 style={{ margin: 0 }}>CCE Statistics</h1>
        {!isReadOnlyView && isAdmin && (
          <button
            className="page-upload-btn"
            onClick={() => { setActiveUploadTable('nptel_courses'); setIsUploadModalOpen(true); }}
          >
            <span>📖</span> Upload NPTEL Data
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

      <div id="nptel-summary-cards-container" className="grid-2" style={{ gap: '24px', marginBottom: '40px' }}>
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '20px', padding: '28px', color: 'white', boxShadow: '0 10px 20px rgba(102, 126, 234, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '32px', background: 'rgba(255, 255, 255, 0.2)', padding: '10px', borderRadius: '12px' }}>📚</span>
            <h3 style={{ margin: 0, opacity: 0.9 }}>Total Courses Offered</h3>
          </div>
          <div style={{ fontSize: '48px', fontWeight: 'bold' }}>{formatNumber(summary.total_courses)}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderRadius: '20px', padding: '28px', color: 'white', boxShadow: '0 10px 20px rgba(240, 147, 251, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '32px', background: 'rgba(255, 255, 255, 0.2)', padding: '10px', borderRadius: '12px' }}>👥</span>
            <h3 style={{ margin: 0, opacity: 0.9 }}>Total Enrollments</h3>
          </div>
          <div style={{ fontSize: '48px', fontWeight: 'bold' }}>{formatNumber(summary.total_enrollments)}</div>
        </div>
      </div>

      <div style={{ marginBottom: '40px', padding: '24px', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e0e0e0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0 }}>Enrollment & Certification Trends</h3>
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
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No trend data available</div>
          )}
        </div>
      </div>

      <div style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e0e0e0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
          <h3 style={{ margin: 0 }}>Course Directory</h3>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {listData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No courses found</div>
            ) : (
              listData.map((course) => (
                <div key={course.course_id} style={{
                  backgroundColor: '#fff',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid #e0e0e0',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '700', color: '#667eea', fontSize: '14px' }}>FY {course.course_year}</span>
                    <span style={{ backgroundColor: '#f3f4f6', color: '#374151', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>{course.department_name}</span>
                  </div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#111', lineHeight: '1.4' }}>{course.course_name}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#666' }}>
                    <div><strong>Faculty:</strong> {course.faculty_coordinator || '—'}</div>
                    <div><strong>Enrollment:</strong> {course.student_enrollment || '0'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div id="nptel-courses-list-container" className="table-responsive" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontSize: '14px', fontWeight: '600' }}>Year</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontSize: '14px', fontWeight: '600' }}>Course Name</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontSize: '14px', fontWeight: '600' }}>Department</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontSize: '14px', fontWeight: '600' }}>Faculty</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontSize: '14px', fontWeight: '600' }}>Enrollment</th>
                </tr>
              </thead>
              <tbody>
                {listData.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No records found</td></tr>
                ) : (
                  listData.map((course, index) => (
                    <tr key={course.course_id} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #e0e0e0' }}>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#667eea', fontWeight: '600' }}>{course.course_year}</td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#333', fontWeight: '500' }}>{course.course_name}</td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#555' }}>{course.department_name}</td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#555' }}>{course.faculty_coordinator || '—'}</td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#333', fontWeight: '500' }}>{course.student_enrollment}</td>
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