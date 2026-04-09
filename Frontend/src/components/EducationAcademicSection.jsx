import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import {
  fetchSummary,
  fetchCategoryBreakdown,
  fetchProgrammeBreakdown,
  fetchCourses
} from '../services/academicModuleStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';

import './Page.css';
import './AcademicSection.css';
import './GrievanceSection.css';
import DataUploadModal from './DataUploadModal';

const PROGRAM_COLORS = ['#6366f1', '#22d3ee', '#f97316', '#a855f7', '#14b8a6', '#f59e0b'];

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value || 0);

function EducationAcademicSection({ user, isPublicView = false }) {
  const uploadVersion = useUploadRefresh();
  const navigate = useNavigate();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeUploadTable, setActiveUploadTable] = useState('');

  // View type selection with radio buttons
  const [viewType, setViewType] = useState('categoryBreakdown'); // 'categoryBreakdown' | 'programmeBreakdown' | 'courseCatalogue'

  const [summary, setSummary] = useState({
    total_courses: 0,
    distinct_categories: 0,
    distinct_programmes: 0,
    distinct_disciplines: 0,
    active_courses: 0,
    inactive_courses: 0
  });
  const [courseTrend, setCourseTrend] = useState([]);
  const [programmeBreakdown, setProgrammeBreakdown] = useState([]);
  const [courseList, setCourseList] = useState([]);

  const [loading, setLoading] = useState({
    category: false,
    programme: false,
    catalogue: false
  });
  const [error, setError] = useState(null);

  const token = localStorage.getItem('authToken');

  // Fetch summary + category breakdown data
  useEffect(() => {
    const loadSummaryData = async () => {
      if (!token) return;
      try {
        setLoading(prev => ({ ...prev, category: true }));
        setError(null);
        const [summaryResp, trendResp] = await Promise.all([
          fetchSummary({}, token),
          fetchCategoryBreakdown({}, token)
        ]);
        setSummary(summaryResp?.data || summary);
        setCourseTrend(trendResp?.data || []);
      } catch (err) {
        console.error('Failed to load category data:', err);
        setError(err.message || 'Failed to load category analytics.');
      } finally {
        setLoading(prev => ({ ...prev, category: false }));
      }
    };
    if (viewType === 'categoryBreakdown') loadSummaryData();
  }, [token, viewType, uploadVersion]);

  // Fetch programme breakdown data
  useEffect(() => {
    const loadProgrammeData = async () => {
      if (!token) return;
      try {
        setLoading(prev => ({ ...prev, programme: true }));
        setError(null);
        const progBreakdownResp = await fetchProgrammeBreakdown({}, token);
        setProgrammeBreakdown(progBreakdownResp?.data || []);
      } catch (err) {
        console.error('Failed to load programme data:', err);
        setError(err.message || 'Failed to load programme analytics.');
      } finally {
        setLoading(prev => ({ ...prev, programme: false }));
      }
    };
    if (viewType === 'programmeBreakdown') loadProgrammeData();
  }, [token, viewType, uploadVersion]);

  // Fetch course catalogue data
  useEffect(() => {
    const loadCatalogueData = async () => {
      if (!token) return;
      try {
        setLoading(prev => ({ ...prev, catalogue: true }));
        setError(null);
        const courseResp = await fetchCourses({}, '', 1, 1000, token);
        setCourseList(courseResp?.data || []);
      } catch (err) {
        console.error('Failed to load course catalogue:', err);
        setError(err.message || 'Failed to load course catalogue.');
      } finally {
        setLoading(prev => ({ ...prev, catalogue: false }));
      }
    };
    if (viewType === 'courseCatalogue') loadCatalogueData();
  }, [token, viewType, uploadVersion]);

  const courseTrendChartData = useMemo(() => {
    if (!courseTrend.length) return [];
    return courseTrend.map((row) => ({
      name: row.category,
      value: row.count || 0
    }));
  }, [courseTrend]);

  const programmeBreakdownChartData = useMemo(() => {
    if (!programmeBreakdown.length) return [];
    return programmeBreakdown.map((row) => ({
      name: row.programme,
      value: row.count || 0
    }));
  }, [programmeBreakdown]);

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#fff',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#333' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: '0', color: entry.color }}>
              {entry.name}: {formatNumber(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Get loading state for current view
  const isLoading = () => {
    switch (viewType) {
      case 'categoryBreakdown': return loading.category;
      case 'programmeBreakdown': return loading.programme;
      case 'courseCatalogue': return loading.catalogue;
      default: return false;
    }
  };

  // Radio button configurations
  const radioButtons = [
    { id: 'categoryBreakdown', label: 'Category Breakdown', color: '#6366f1' },
    { id: 'programmeBreakdown', label: 'Programme Breakdown', color: '#f97316' },
    { id: 'courseCatalogue', label: 'Course Catalogue', color: '#22d3ee' }
  ];

  return (
    <div className={isPublicView ? "" : "page-container"}>
      <div className={isPublicView ? "" : "page-content"}>
        {!isPublicView && (
          <>
            <button className="page-back-btn" onClick={() => navigate('/education')}>
              ← Back to Education
            </button>
            <div className="page-header-row">
              <div className="page-header-left">
                <h1>Academic Section · Industry Collaboration Courses</h1>
              </div>
              {user && user.role_id === 3 && (
                <div className="page-header-actions">
                  <button className="page-upload-btn" onClick={() => { setActiveUploadTable('courses_table'); setIsUploadModalOpen(true); }}>
                    <span>📤</span> Upload Course Data
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {error && <div className="error-message" style={{
          padding: '10px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>{error}</div>}

        {/* Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '20px',
          marginBottom: '40px'
        }}>
          {/* Industry-linked Courses Card */}
          <div style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 10px 20px rgba(99, 102, 241, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '80px',
              height: '80px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%'
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '20px', background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '8px' }}>📚</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: '500' }}>Industry Courses</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                {formatNumber(summary.total_courses)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Active courses</span>
              </div>
            </div>
          </div>

          {/* Categories Card */}
          <div style={{
            background: 'linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 10px 20px rgba(34, 211, 238, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '80px',
              height: '80px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%'
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '20px', background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '8px' }}>🏢</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: '500' }}>Categories</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                {formatNumber(summary.distinct_categories)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Participating</span>
              </div>
            </div>
          </div>

          {/* Programmes Card */}
          <div style={{
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 10px 20px rgba(249, 115, 22, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '80px',
              height: '80px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%'
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '20px', background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '8px' }}>🎓</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: '500' }}>Programmes</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                {formatNumber(summary.distinct_programmes)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Identified</span>
              </div>
            </div>
          </div>

          {/* Active Courses Card */}
          <div style={{
            background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 10px 20px rgba(168, 85, 247, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '80px',
              height: '80px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%'
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '20px', background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '8px' }}>📊</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: '500' }}>Active</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                {formatNumber(summary.active_courses)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>In Delivery</span>
              </div>
            </div>
          </div>

          {/* Inactive Courses Card */}
          <div style={{
            background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 10px 20px rgba(20, 184, 166, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '80px',
              height: '80px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%'
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '20px', background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '8px' }}>👥</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: '500' }}>Inactive</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                {formatNumber(summary.inactive_courses)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', background: '#f87171', borderRadius: '50%' }} />
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Completed/Paused</span>
              </div>
            </div>
          </div>
        </div>

        {/* Styled Radio Buttons - Transparent Background */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '15px',
          marginBottom: '30px',
          flexWrap: 'wrap'
        }}>
          {radioButtons.map((btn) => (
            <label
              key={btn.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '10px 20px',
                backgroundColor: viewType === btn.id ? btn.color : 'transparent',
                color: viewType === btn.id ? 'white' : '#666',
                borderRadius: '40px',
                transition: 'all 0.3s ease',
                border: `2px solid ${viewType === btn.id ? btn.color : '#e0e0e0'}`,
                boxShadow: viewType === btn.id ? `0 4px 12px ${btn.color}40` : 'none'
              }}
            >
              <input
                type="radio"
                name="viewType"
                value={btn.id}
                checked={viewType === btn.id}
                onChange={(e) => setViewType(e.target.value)}
                style={{
                  accentColor: btn.color,
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer'
                }}
              />
              <span style={{
                fontWeight: viewType === btn.id ? '600' : '500',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ fontSize: '16px' }}>{btn.icon}</span>
                {btn.label}
              </span>
            </label>
          ))}
        </div>

        {isLoading() ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading data...</p>
          </div>
        ) : (
          <>
            {/* Category Breakdown View */}
            {viewType === 'categoryBreakdown' && (
              <div className="chart-section" style={{ marginTop: '0' }}>
                <div className="chart-header">
                  <h2>Industry Course Categories</h2>
                  <p className="chart-description">
                    Distribution of industry-linked courses across different categories.
                  </p>
                </div>

                {!courseTrendChartData.length ? (
                  <div className="no-data" style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📊</span>
                    <p style={{ color: '#666', fontSize: '16px' }}>No category data available for the selected filters.</p>
                  </div>
                ) : (
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={400}>
                      <PieChart>
                        <Pie
                          data={courseTrendChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={140}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {courseTrendChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PROGRAM_COLORS[index % PROGRAM_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [value, 'Courses']}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Chart Statistics */}
                    {/* <div style={{
                      marginTop: '20px',
                      padding: '15px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      border: '1px solid #e0e0e0',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '15px'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#6366f1', fontWeight: 'bold', fontSize: '24px' }}>
                          {courseTrendChartData.reduce((sum, item) => sum + item.value, 0)}
                        </div>
                        <div style={{ color: '#666', fontSize: '12px' }}>Total Courses</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#22d3ee', fontWeight: 'bold', fontSize: '24px' }}>
                          {courseTrendChartData.length}
                        </div>
                        <div style={{ color: '#666', fontSize: '12px' }}>Categories</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#f97316', fontWeight: 'bold', fontSize: '24px' }}>
                          {courseTrendChartData.length > 0
                            ? courseTrendChartData.reduce((prev, current) => (prev.value > current.value) ? prev : current).name
                            : 'N/A'}
                        </div>
                        <div style={{ color: '#666', fontSize: '12px' }}>Dominant Category</div>
                      </div>
                    </div> */}
                  </div>
                )}
              </div>
            )}

            {/* Programme Breakdown View */}
            {viewType === 'programmeBreakdown' && (
              <div className="chart-section" style={{ marginTop: '0' }}>
                <div className="chart-header">
                  <h2>Industry Courses by Programme</h2>
                  <p className="chart-description">
                    Distribution of industry-linked courses across different academic programmes.
                  </p>
                </div>

                {!programmeBreakdownChartData.length ? (
                  <div className="no-data" style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>🎓</span>
                    <p style={{ color: '#666', fontSize: '16px' }}>No programme data available for the selected filters.</p>
                  </div>
                ) : (
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={programmeBreakdownChartData} margin={{ top: 20, right: 30, left: 40, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis
                          dataKey="name"
                          stroke="#666"
                          tick={{ fill: '#666', fontSize: 10 }}
                          interval={0}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis
                          stroke="#666"
                          tick={{ fill: '#666', fontSize: 12 }}
                          allowDecimals={false}
                        />
                        <Tooltip
                          formatter={(value) => [value, 'Courses']}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                        />
                        <Bar
                          dataKey="value"
                          name="Courses"
                          fill="#f97316"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Chart Statistics */}
                    <div style={{
                      marginTop: '20px',
                      padding: '15px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      border: '1px solid #e0e0e0',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '15px'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#6366f1', fontWeight: 'bold', fontSize: '24px' }}>
                          {programmeBreakdownChartData.reduce((sum, item) => sum + item.value, 0)}
                        </div>
                        <div style={{ color: '#666', fontSize: '12px' }}>Total Courses</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#f97316', fontWeight: 'bold', fontSize: '24px' }}>
                          {programmeBreakdownChartData.length}
                        </div>
                        <div style={{ color: '#666', fontSize: '12px' }}>Programmes</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#22d3ee', fontWeight: 'bold', fontSize: '24px' }}>
                          {programmeBreakdownChartData.length > 0
                            ? Math.max(...programmeBreakdownChartData.map(d => d.value))
                            : 0}
                        </div>
                        <div style={{ color: '#666', fontSize: '12px' }}>Max in Single Prog</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Course Catalogue View */}
            {viewType === 'courseCatalogue' && (
              <div className="chart-section" style={{ marginTop: '0' }}>
                <div className="chart-header">
                  <h2>Industry Collaboration Course Catalogue</h2>
                  <p className="chart-description">
                    Complete registry of courses collaborating with industry partners.
                  </p>
                </div>

                {!courseList.length ? (
                  <div className="no-data" style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📚</span>
                    <p style={{ color: '#666', fontSize: '16px' }}>No industry courses found for the selected filters.</p>
                  </div>
                ) : (
                  <div>
                    {/* Fixed height scrollable table */}
                    <div style={{
                      maxHeight: '500px',
                      overflowY: 'auto',
                      overflowX: 'auto',
                      border: '1px solid #e0e0e0',
                      borderRadius: '12px',
                      backgroundColor: '#fff',
                      position: 'relative'
                    }}>
                      <table className="grievance-table" style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        backgroundColor: '#fff',
                        minWidth: '800px'
                      }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                          <tr style={{ backgroundColor: '#22d3ee', color: 'white' }}>
                            <th style={{ padding: '14px 12px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: '#22d3ee', zIndex: 11 }}>Course Name</th>
                            <th style={{ padding: '14px 12px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: '#22d3ee', zIndex: 11 }}>Category</th>
                            <th style={{ padding: '14px 12px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: '#22d3ee', zIndex: 11 }}>Programme</th>
                            <th style={{ padding: '14px 12px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: '#22d3ee', zIndex: 11 }}>Industry Partner</th>
                            <th style={{ padding: '14px 12px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: '#22d3ee', zIndex: 11 }}>Coordinator</th>
                            <th style={{ padding: '14px 12px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: '#22d3ee', zIndex: 11 }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {courseList.map((course, index) => (
                            <tr
                              key={course.course_id}
                              style={{
                                backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                                borderBottom: '1px solid #e0e0e0'
                              }}
                            >
                              <td style={{ padding: '12px', fontWeight: '500' }}>{course.course_name}</td>
                              <td style={{ padding: '12px' }}>
                                <span style={{
                                  backgroundColor: '#e0e7ff',
                                  color: '#4f46e5',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '500'
                                }}>
                                  {course.course_category}
                                </span>
                              </td>
                              <td style={{ padding: '12px' }}>{course.target_programme}</td>
                              <td style={{ padding: '12px' }}>{course.industry_partner || '—'}</td>
                              <td style={{ padding: '12px' }}>{course.industry_coordinator_name || '—'}</td>
                              <td style={{ padding: '12px' }}>
                                <span style={{
                                  backgroundColor: course.status === 'Active' ? '#dcfce7' : '#fee2e2',
                                  color: course.status === 'Active' ? '#166534' : '#991b1b',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
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

                    {/* Table Statistics */}
                    <div style={{
                      marginTop: '20px',
                      padding: '15px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      border: '1px solid #e0e0e0',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '15px'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#22d3ee', fontWeight: 'bold', fontSize: '24px' }}>
                          {courseList.length}
                        </div>
                        <div style={{ color: '#666', fontSize: '12px' }}>Total Courses</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#6366f1', fontWeight: 'bold', fontSize: '24px' }}>
                          {new Set(courseList.map(c => c.course_category)).size}
                        </div>
                        <div style={{ color: '#666', fontSize: '12px' }}>Categories</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#f97316', fontWeight: 'bold', fontSize: '24px' }}>
                          {courseList.filter(c => c.status === 'Active').length}
                        </div>
                        <div style={{ color: '#666', fontSize: '12px' }}>Active Courses</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
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