import { useState, useEffect } from 'react';
import {
  fetchNptelSummary,
  fetchNptelTrend,
  fetchNptelList
} from '../services/outreachExtensionStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend, LabelList} from 'recharts';
import './Page.css';
import './AcademicSection.css';
import '../DesignSystem.css';
import DataUploadModal from './DataUploadModal';
import { useNavigate } from 'react-router-dom';
import { CustomTooltip } from '../utils/chartUtils';
import ExportMenu from './ExportMenu';

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value || 0);

function NptelSection({ user, isPublicView = false }) {
  const navigate = useNavigate();

  const uploadVersion = useUploadRefresh();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeUploadTable, setActiveUploadTable] = useState('');
  const token = localStorage.getItem('authToken');

  const [summary, setSummary] = useState({
    total_courses: 0,
    total_enrollments: 0
  });

  const [viewType, setViewType] = useState('courses_trend');
  const [trendData, setTrendData] = useState([]);
  const [listData, setListData] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const [sumData, trendRes, listRes] = await Promise.all([
          fetchNptelSummary(token),
          fetchNptelTrend(token),
          fetchNptelList(token)
        ]);
        setSummary(sumData);
        setTrendData(trendRes?.trend || []);
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
    return isPublicView ? (
      <p className="error-message">{error}</p>
    ) : (
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
      {!isPublicView && (
        <button className="page-back-btn" onClick={() => navigate('/outreach-extension')}>
          ← Back to Outreach Extension
        </button>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        {!isPublicView && <h1 style={{ margin: 0 }}>NPTEL – CCE (Centre for Continuing Education)</h1>}

        {!isPublicView && user && user.role_id === 3 && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              className="page-upload-btn"
              onClick={() => { setActiveUploadTable('nptel_courses'); setIsUploadModalOpen(true); }}
            >
              <span>📖</span> Upload NPTEL Courses
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ textDecoration: 'underline', color: '#000', margin: 0, fontSize: '20px' }}>
          NPTEL Summary
        </h2>
        <ExportMenu 
          elementId="nptel-summary-cards-container"
          data={[summary]}
          headers={['Total Courses Offered', 'Total Enrollments']}
          keys={['total_courses', 'total_enrollments']}
          filename="nptel_summary"
          title="NPTEL Summary"
        />
      </div>
      {/* Summary Cards - Modern Design */}
      <div id="nptel-summary-cards-container" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '24px',
        marginBottom: '40px'
      }}>
        {/* Total Courses Card */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '20px',
          padding: '28px',
          boxShadow: '0 15px 35px rgba(102, 126, 234, 0.3)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          cursor: 'pointer',
          ':hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 20px 40px rgba(102, 126, 234, 0.4)'
          }
        }}>
          {/* Decorative circles */}
          <div style={{
            position: 'absolute',
            top: '-30px',
            right: '-30px',
            width: '150px',
            height: '150px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-40px',
            left: '-40px',
            width: '180px',
            height: '180px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '50%'
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <span style={{
                fontSize: '32px',
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '10px',
                borderRadius: '12px'
              }}>📚</span>
              <h3 style={{
                margin: 0,
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '18px',
                fontWeight: '500'
              }}>Total Courses Offered</h3>
            </div>
            <div style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '8px',
              lineHeight: '1.2'
            }}>
              {formatNumber(summary.total_courses)}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                background: '#4ade80',
                borderRadius: '50%'
              }} />
              <span style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.8)'
              }}>
                Active NPTEL courses
              </span>
            </div>
          </div>
        </div>

        {/* Total Enrollments Card */}
        <div style={{
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          borderRadius: '20px',
          padding: '28px',
          boxShadow: '0 15px 35px rgba(240, 147, 251, 0.3)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          cursor: 'pointer',
          ':hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 20px 40px rgba(240, 147, 251, 0.4)'
          }
        }}>
          <div style={{
            position: 'absolute',
            top: '-30px',
            right: '-30px',
            width: '150px',
            height: '150px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-40px',
            left: '-40px',
            width: '180px',
            height: '180px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '50%'
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <span style={{
                fontSize: '32px',
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '10px',
                borderRadius: '12px'
              }}>👥</span>
              <h3 style={{
                margin: 0,
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '18px',
                fontWeight: '500'
              }}>Total Enrollments</h3>
            </div>
            <div style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '8px',
              lineHeight: '1.2'
            }}>
              {formatNumber(summary.total_enrollments)}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                background: '#4ade80',
                borderRadius: '50%'
              }} />
              <span style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.8)'
              }}>
                Student registrations
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* View Selection & Trend Chart */}
      <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0 }}>Trends & Analysis</h3>
          <ExportMenu 
            elementId="nptel-trend-chart-container"
            data={trendData}
            headers={['Year', 'Courses', 'Enrollments']}
            keys={['year', 'courses', 'enrollments']}
            filename={`nptel_${viewType}`}
            title={viewType === 'courses_trend' ? 'Courses Trend' : 'Enrollments Trend'}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '25px' }}>
          {[
            { id: 'courses_trend', label: 'Courses Trend', color: '#667eea' },
            { id: 'enrollments_trend', label: 'Enrollments Trend', color: '#f093fb' },
          ].map(type => (
            <label key={type.id} style={{
              display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 16px',
              backgroundColor: viewType === type.id ? type.color : 'white',
              color: viewType === type.id ? 'white' : '#333',
              borderRadius: '6px', border: `2px solid ${type.color}`, transition: 'all 0.2s ease'
            }}>
              <input
                type="radio" name="nptelViewType" value={type.id}
                checked={viewType === type.id} onChange={(e) => setViewType(e.target.value)}
                style={{ accentColor: type.color }}
              />
              <span style={{ fontWeight: viewType === type.id ? 'bold' : 'normal' }}>{type.label}</span>
            </label>
          ))}
        </div>

        <div id="nptel-trend-chart-container" style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          {trendData.length > 0 ? (
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ marginBottom: '20px', color: '#333' }}>
                {viewType === 'courses_trend' ? 'Courses Trend' : 'Enrollments Trend'}
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={trendData} margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="year" stroke="#666" padding={{ left: 30, right: 30 }} />
                  <YAxis stroke="#666" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="linear"
                    dataKey={viewType === 'courses_trend' ? 'courses' : 'enrollments'}
                    name={viewType === 'courses_trend' ? 'Courses' : 'Enrollments'}
                    stroke={viewType === 'courses_trend' ? '#667eea' : '#f093fb'}
                    strokeWidth={3}
                    dot={{ r: 6, fill: viewType === 'courses_trend' ? '#667eea' : '#f093fb', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 8 }}>
  <LabelList dataKey={viewType === 'courses_trend' ? 'courses' : 'enrollments'} position="top" style={{ fontSize: '10px', fontWeight: 600, fill: viewType === 'courses_trend' ? '#667eea' : '#f093fb' }} />
</Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '10px' }}>📈</span>
              No trend data available.
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: '0', color: '#333' }}>Course List Details</h3>
          <ExportMenu 
            elementId="nptel-course-list-container"
            data={listData}
            headers={['Course Name', 'Department', 'Faculty Name', 'Enrollments', 'Offering Year']}
            keys={['course_name', 'department', 'faculty_name', 'enrollments', 'offering_year']}
            filename="nptel_course_list"
            title="Course List Details"
          />
        </div>
        <div id="nptel-course-list-container" className="table-responsive" style={{ overflowX: 'auto' }}>
          <table className="grievance-table" style={{
            width: '100%',
            minWidth: '800px',
            borderCollapse: 'collapse',
            backgroundColor: '#fff',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid #e0e0e0'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#28a745', color: 'white' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Sr. No</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Course Name</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Department</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Faculty Name</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Enrollments</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Offering Year</th>
              </tr>
            </thead>
            <tbody>
              {listData.length > 0 ? (
                listData.map((row, idx) => (
                  <tr
                    key={row.id}
                    style={{
                      backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa',
                      borderBottom: '1px solid #e0e0e0'
                    }}
                  >
                    <td style={{ padding: '12px' }}>{idx + 1}</td>
                    <td style={{ padding: '12px', fontWeight: '500' }}>{row.course_name}</td>
                    <td style={{ padding: '12px' }}>{row.department}</td>
                    <td style={{ padding: '12px' }}>{row.faculty_name}</td>
                    <td style={{ padding: '12px' }}>{row.enrollments || '0'}</td>
                    <td style={{ padding: '12px' }}>{row.offering_year || 'N/A'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DataUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        tableName={activeUploadTable}
        token={token}
      />
    </>
  );

  // If public view, return content without wrappers
  if (isPublicView) {
    return content;
  }

  // If not public view, wrap in page-container and page-content
  return (
    <div className="page-container performance-render-auto">
      <div className="page-content">
        {content}
      </div>
    </div>
  );
}

export default NptelSection;