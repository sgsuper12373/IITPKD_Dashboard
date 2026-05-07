import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis,
  Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell, LabelList
} from 'recharts';

import {
  fetchResearchFilterOptions, fetchPublicationSummary, fetchPublicationTrend,
  fetchPublicationDepartmentBreakdown, fetchPublicationTypeDistribution, fetchPublicationList
} from '../services/researchStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import DataUploadModal from './LazyDataUploadModal';
import './Page.css';
import './AcademicSection.css';
import './GrievanceSection.css';
import './ResearchSection.css';
import { useNavigate } from 'react-router-dom';
import ExportMenu from './ExportMenu';
import { CustomTooltip } from '../utils/chartUtils';

const TYPE_COLORS = ['#6366f1', '#22d3ee', '#f97316', '#a855f7', '#14b8a6', '#facc15'];
const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(Number(value) || 0);

function ResearchLibrarySection({ user, isPublicView = false }) {
  const navigate = useNavigate();
  const uploadVersion = useUploadRefresh();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [filterOptions, setFilterOptions] = useState({
    publication_departments: [],
    publication_years: [],
    publication_types: []
  });

  const [viewType, setViewType] = useState('trend');
  const [trendChartMode, setTrendChartMode] = useState('bar');

  const [filters, setFilters] = useState({
    department: 'All',
    publication_year: 'All',
    publication_type: 'All'
  });

  const [summary, setSummary] = useState({
    total: 0, by_type: {}, latest_year: null, journal_count: 0, conference_count: 0
  });


  const renderDepartmentTick = (props) => {
    const { x, y, payload } = props;
    const words = payload.value.split(' ');

    return (
      <text x={x} y={y + 10} textAnchor="end" fill="#666" fontSize={10}>
        {words.map((word, index) => (
          <tspan x={x} dy={index === 0 ? 0 : 12} key={index}>
            {word}
          </tspan>
        ))}
      </text>
    );
  };

  const [trendData, setTrendData] = useState([]);
  const [departmentBreakdown, setDepartmentBreakdown] = useState([]);
  const [typeDistribution, setTypeDistribution] = useState([]);
  const [publicationList, setPublicationList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('authToken');

  const isGuestUser = !user;
  const isReadOnlyView = isPublicView || isGuestUser;
  const canViewRestrictedSection = isPublicView && !isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 4;

  const serializedFilters = JSON.stringify(filters);
  useEffect(() => {
    let isMounted = true;
    const loadFilterOptions = async () => {
      try {
        const options = await fetchResearchFilterOptions(filters, token);
        if (!isMounted) return;
        const publication_departments = Array.isArray(options?.publication_departments) ? options.publication_departments : [];
        const publication_years = Array.isArray(options?.publication_years) ? [...options.publication_years].sort((a, b) => b - a) : [];
        const publication_types = Array.isArray(options?.publication_types) ? options.publication_types : [];
        setFilterOptions({ publication_departments, publication_years, publication_types });
        setError(null);

        // Auto-correct invalid selections
        const corrections = {};
        if (filters.department !== 'All' && filters.department && !publication_departments.includes(filters.department)) corrections.department = 'All';
        if (filters.publication_year !== 'All' && filters.publication_year && !publication_years.map(String).includes(String(filters.publication_year))) corrections.publication_year = 'All';
        if (filters.publication_type !== 'All' && filters.publication_type && !publication_types.includes(filters.publication_type)) corrections.publication_type = 'All';
        if (Object.keys(corrections).length > 0) setFilters(prev => ({ ...prev, ...corrections }));
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load filter options.');
      }
    };
    loadFilterOptions();
    return () => { isMounted = false; };
  }, [serializedFilters, token, uploadVersion]);

  useEffect(() => {
    const loadLibraryData = async () => {
      try {
        setLoading(true); setError(null);
        const [summaryResp, trendResp, deptResp, typeResp, listResp] = await Promise.all([
          fetchPublicationSummary(filters, token),
          fetchPublicationTrend(filters, token),
          fetchPublicationDepartmentBreakdown(filters, token),
          fetchPublicationTypeDistribution(filters, token),
          fetchPublicationList(filters, token)
        ]);
        setSummary({
          total: summaryResp?.total || 0, by_type: summaryResp?.by_type || {},
          latest_year: summaryResp?.latest_year || null,
          journal_count: summaryResp?.journal_count || 0,
          conference_count: summaryResp?.conference_count || 0
        });
        setTrendData(trendResp?.data || []);
        setDepartmentBreakdown(deptResp?.data || []);
        setTypeDistribution(typeResp?.data || []);
        setPublicationList(listResp?.data || []);
      } catch (err) {
        setError(err.message || 'Failed to load library analytics.');
      } finally {
        setLoading(false);
      }
    };
    loadLibraryData();
  }, [filters, token, uploadVersion]);

  const trendChartData = useMemo(() =>
    trendData.map((row) => ({ year: row.year, publications: Number(row.total) || 0 })),
    [trendData]);

  const formatDepartmentName = (name = '') => {
    return name
      .replace(/^(Department of\s+|Dept\. of\s+)/i, '') // remove prefixes
      .replace(/\band\b/gi, '&') // replace "and" with "&"
      .trim();
  };

  const departmentChartData = useMemo(() =>
    departmentBreakdown.map((row) => ({
      department: formatDepartmentName(row.department || 'Unspecified'),
      total: Number(row.total) || 0
    })),
    [departmentBreakdown]
  );

  const typePieData = useMemo(() =>
    typeDistribution.map((row) => ({ name: row.publication_type, value: Number(row.total) || 0 }))
      .sort((a, b) => b.value - a.value).slice(0, 5),
    [typeDistribution]);

  const participatingDepartments = useMemo(() =>
    departmentBreakdown.filter((row) => (row.total || 0) > 0).length,
    [departmentBreakdown]);

  const journalVsConference = useMemo(() =>
    `${formatNumber(summary.journal_count)} / ${formatNumber(summary.conference_count)}`,
    [summary.journal_count, summary.conference_count]);

  const handleFilterChange = (field, value) => setFilters((prev) => ({ ...prev, [field]: value }));
  const handleClearFilters = () => setFilters({ department: 'All', publication_year: 'All', publication_type: 'All' });

  // ── Reusable unified filter bar ──────────────────────────────────────────────
  const viewButtons = [
    { key: 'trend', label: '📈 Trend', color: '#6366f1' },
    { key: 'department', label: '🏢 Department', color: '#22c55e' },
    { key: 'type', label: '📊 Type', color: '#f97316' },
    { key: 'publicationsTable', label: '📋 Directory', color: '#a855f7' },
  ];

  const FilterBar = ({ showDept = true, showYear = true, showType = true }) => (
    <div style={{
      marginBottom: '20px',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '12px',
      border: '1px solid #e9ecef',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>

      {/* Header row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h4 style={{
          margin: 0,
          color: '#333',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          Dashboard Filters
        </h4>

        <button
          onClick={handleClearFilters}
          style={{
            padding: '6px 12px',
            backgroundColor: '#ef4444',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
        >
          Clear All Filters
        </button>
      </div>

      {/* 1. View Type selector FIRST (moved up) */}
      <div style={{
        marginBottom: '12px'
      }}>
        <label style={{
          fontSize: '12px',
          fontWeight: '600',
          color: '#555',
          marginBottom: '4px',
          display: 'block'
        }}>
          View Type
        </label>

        <div style={{
          display: 'flex',
          gap: '4px',
          background: '#e9ecef',
          padding: '4px',
          borderRadius: '8px'
        }}>
          {viewButtons.map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setViewType(key)}
              style={{
                flex: 1,
                padding: '6px 4px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s',
                backgroundColor: viewType === key ? color : 'transparent',
                color: viewType === key ? 'white' : '#475569',
                whiteSpace: 'nowrap'
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Actual filters AFTER view buttons */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        alignItems: 'end'
      }}>

        {/* Department */}
        {showDept && (
          <div>
            <label style={{
              fontSize: '12px',
              fontWeight: '600',
              color: '#555',
              marginBottom: '4px',
              display: 'block'
            }}>
              Department
            </label>

            <select
              value={filters.department}
              onChange={(e) => handleFilterChange('department', e.target.value)}
              style={{
                padding: '8px',
                fontSize: '13px',
                width: '100%',
                borderRadius: '6px',
                border: '1px solid #ddd',
                outline: 'none'
              }}
            >
              <option value="All">All Departments</option>
              {filterOptions.publication_departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        )}

        {/* Year */}
        {showYear && (
          <div>
            <label style={{
              fontSize: '12px',
              fontWeight: '600',
              color: '#555',
              marginBottom: '4px',
              display: 'block'
            }}>
              Publication Year
            </label>

            <select
              value={filters.publication_year}
              onChange={(e) => handleFilterChange('publication_year', e.target.value)}
              style={{
                padding: '8px',
                fontSize: '13px',
                width: '100%',
                borderRadius: '6px',
                border: '1px solid #ddd',
                outline: 'none'
              }}
            >
              <option value="All">All Years</option>
              {filterOptions.publication_years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        )}

        {/* Type */}
        {showType && (
          <div>
            <label style={{
              fontSize: '12px',
              fontWeight: '600',
              color: '#555',
              marginBottom: '4px',
              display: 'block'
            }}>
              Publication Type
            </label>

            <select
              value={filters.publication_type}
              onChange={(e) => handleFilterChange('publication_type', e.target.value)}
              style={{
                padding: '8px',
                fontSize: '13px',
                width: '100%',
                borderRadius: '6px',
                border: '1px solid #ddd',
                outline: 'none'
              }}
            >
              <option value="All">All Types</option>
              {filterOptions.publication_types.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        )}

      </div>
    </div>
  );
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className={isPublicView ? "" : "page-container"}>
      <div className={isPublicView ? "" : "page-content"}>

        {!isReadOnlyView && (
          <button
            className="page-back-btn"
            onClick={() => navigate('/research')}
          >
            ← Back to Research
          </button>
        )}

        {!isReadOnlyView && (
          <div className="section-header">
            <div className="section-header-left">
              <h1>Publications</h1>
            </div>

            {!isReadOnlyView && isAdmin && (
              <div className="section-header-actions">
                <button
                  className="page-upload-btn"
                  onClick={() => setIsUploadModalOpen(true)}
                >
                  📤 Upload Publications
                </button>
              </div>
            )}
          </div>
        )}

        {!isReadOnlyView && <h1>Library & Scholarly Outputs</h1>}

        {error && (
          <div style={{ padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {/* Summary Export */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '1rem' }}>
          <ExportMenu
            elementId="library-summary-cards-container"
            data={[{
              total: summary.total, journal_vs_conference: journalVsConference,
              participating_departments: participatingDepartments,
              type_distribution_length: typeDistribution.length
            }]}
            headers={['Total Publications', 'Journal/Conference', 'Departments', 'Types']}
            keys={['total', 'journal_vs_conference', 'participating_departments', 'type_distribution_length']}
            filename="library_summary"
            title="Library Summary"
          />
        </div>

        {/* Summary Cards */}
        <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<div id="library-summary-cards-container" style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '16px', marginBottom: '30px'
        }}>
          {[
            { gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', shadow: 'rgba(99,102,241,0.2)', icon: '📚', label: 'Total Publications', value: formatNumber(summary.total), sub: 'Scholarly outputs' },
            { gradient: 'linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)', shadow: 'rgba(34,211,238,0.2)', icon: '📊', label: 'Journal / Conference', value: journalVsConference, sub: 'Journals/Conferences' },
            { gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', shadow: 'rgba(249,115,22,0.2)', icon: '🏢', label: 'Departments', value: participatingDepartments, sub: 'Active departments' },
          ].map(({ gradient, shadow, icon, label, value, sub }) => (
            <div key={label} style={{ background: gradient, borderRadius: '14px', padding: '16px', boxShadow: `0 8px 16px ${shadow}`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '70px', height: '70px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '28px', background: 'rgba(255,255,255,0.2)', padding: '5px', borderRadius: '6px' }}>{icon}</span>
                  <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '21px', fontWeight: '500' }}>{label}</span>
                </div>
                <div style={{ fontSize: '38px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>{value}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '5px', height: '5px', background: '#4ade80', borderRadius: '50%' }} />
                  <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)' }}>{sub}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
)}</>

        {/* ── Publication Trend ─────────────────────────────────────────────── */}
        {viewType === 'trend' && (
          <section className="chart-section" style={{
            marginBottom: '30px', padding: '24px', backgroundColor: '#fff',
            borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0'
          }}>
            <FilterBar showDept showYear showType />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: '0 0 8px 0', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '24px' }}>
                  <span style={{ fontSize: '28px' }}>📈</span> Publication Trend
                </h2>
                <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>Year-wise publication count</p>
              </div>
              <ExportMenu
                elementId="library-trend-chart-container"
                data={trendChartData}
                headers={['Year', 'Publications']}
                keys={['year', 'publications']}
                filename="publication_trend"
                title="Publication Trend"
              />
            </div>

            {/* Bar / Trend toggle */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#f0f0f0', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
              {['bar', 'trend'].map((mode) => (
                <button key={mode} onClick={() => setTrendChartMode(mode)} style={{
                  padding: '6px 16px', fontSize: '13px', fontWeight: 600, borderRadius: '6px',
                  cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                  backgroundColor: trendChartMode === mode ? '#fff' : 'transparent',
                  color: trendChartMode === mode ? '#6366f1' : '#555',
                  boxShadow: trendChartMode === mode ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                }}>
                  {mode === 'bar' ? '📊 Bar' : '📈 Trend'}
                </button>
              ))}
            </div>

            <div id="library-trend-chart-container" style={{ position: 'relative', padding: '10px' }}>
              {!trendChartData.length && (
                <div style={{ textAlign: 'center', color: '#999', padding: '40px' }}>No information available for the selected filter</div>
              )}
              <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<ResponsiveContainer width="100%" height={300}>
                {trendChartMode === 'bar' ? (
                  <BarChart data={trendChartData} margin={{ top: 10, right: 20, left: 40, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="rect" wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="publications" name="Publications" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={28}>
                      <LabelList dataKey="publications" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: '#6366f1' }} />
                    </Bar>
                  </BarChart>
                ) : (
                  <LineChart data={trendChartData} margin={{ top: 10, right: 20, left: 40, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="plainline" wrapperStyle={{ fontSize: '11px' }} />
                    <Line type="linear" dataKey="publications" name="Publications" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }}>
                      <LabelList dataKey="publications" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: '#6366f1' }} />
                    </Line>
                  </LineChart>
                )}
              </ResponsiveContainer>
)}</>
            </div>
          </section>
        )}

        {/* ── Department-wise ───────────────────────────────────────────────── */}
        {viewType === 'department' && (
          <section className="chart-section" style={{
            marginBottom: '30px', padding: '24px', backgroundColor: '#fff',
            borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0'
          }}>
            <FilterBar showDept={false} showYear showType />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: '0 0 8px 0', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '24px' }}>
                  <span style={{ fontSize: '28px' }}>🏢</span> Department-wise Publications
                </h2>
                <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>Publications by department</p>
              </div>
              <ExportMenu
                elementId="library-dept-chart-container"
                data={departmentChartData}
                headers={['Department', 'Publications']}
                keys={['department', 'total']}
                filename="publication_department_breakdown"
                title="Department-wise Publications"
              />
            </div>

            <div id="library-dept-chart-container" style={{ position: 'relative', padding: '10px' }}>
              {!departmentChartData.length && (
                <div style={{ textAlign: 'center', color: '#999', padding: '40px' }}>No information available for the selected filter</div>
              )}
              <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<ResponsiveContainer width="100%" height={300}>
                <BarChart data={departmentChartData} margin={{ top: 10, right: 20, left: 40, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="department" tick={renderDepartmentTick} interval={0} height={80} />
                  <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Publications" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={20}>
                    <LabelList dataKey="total" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: '#22c55e' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
)}</>
            </div>
          </section>
        )}

        {/* ── Type Distribution ─────────────────────────────────────────────── */}
        {viewType === 'type' && (
          <section className="chart-section" style={{
            marginBottom: '30px', padding: '24px', backgroundColor: '#fff',
            borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0'
          }}>
            <FilterBar showDept showYear showType={false} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: '0 0 8px 0', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '24px' }}>
                  <span style={{ fontSize: '28px' }}>📊</span> Publication Types
                </h2>
                <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>Distribution by format</p>
              </div>
              <ExportMenu
                elementId="library-type-chart-container"
                data={typePieData}
                headers={['Type', 'Count']}
                keys={['name', 'value']}
                filename="publication_type_distribution"
                title="Publication Types Distribution"
              />
            </div>

            <div id="library-type-chart-container" style={{ position: 'relative', padding: '10px' }}>
              {!typePieData.length && (
                <div style={{ textAlign: 'center', color: '#999', padding: '40px' }}>No information available for the selected filter</div>
              )}
              <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={typePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {typePieData.map((e, i) => <Cell key={e.name} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
)}</>
            </div>
          </section>
        )}

        {/* ── Publications Directory ────────────────────────────────────────── */}
        {viewType === 'publicationsTable' && (
          <section className="chart-section" style={{
            marginBottom: '30px', padding: '24px', backgroundColor: '#fff',
            borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0'
          }}>
            <FilterBar showDept showYear showType />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div>
                <h2 style={{ margin: '0 0 8px 0', color: '#1a1a1a', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>📋</span> Publications Directory
                </h2>
                <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>{publicationList.length} publications found</p>
              </div>
              <ExportMenu
                elementId="library-publications-table-container"
                data={publicationList}
                headers={['Title', 'Faculty', 'Department', 'Type', 'Year', 'Journal']}
                keys={['publication_title', 'faculty_name', 'department', 'publication_type', 'publication_year', 'journal_name']}
                filename="publications_directory"
                title="Publications Directory"
              />
            </div>

            <div id="library-publications-table-container" className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto', borderRadius: '12px', border: '1px solid #eee' }}>
              <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#a855f7', color: 'white' }}>
                  <tr>
                    {['Title', 'Faculty', 'Dept', 'Type', 'Year', 'Journal'].map(h => (
                      <th key={h} style={{ padding: '12px 10px', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid rgba(0,0,0,0.1)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {publicationList.length > 0 ? publicationList.map((p, i) => (
                    <tr key={p.publication_id} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #eee' }}>{p.publication_title}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #eee' }}>{p.faculty_name}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #eee' }}>{p.department}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #eee' }}>{p.publication_type}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #eee' }}>{p.publication_year}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #eee' }}>{p.journal_name}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                        No information available for the selected filter
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
)}</>
            </div>
          </section>
        )}

      </div>

      <DataUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        tableName="research_publications"
        token={token}
      />
    </div>
  );
}

export default ResearchLibrarySection;