import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis,
  Tooltip, Legend, BarChart, Bar, LabelList
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
import './ResearchLibrarySection.css';
import { useNavigate } from 'react-router-dom';
import ExportMenu from './ExportMenu';
import CustomTooltip from './CustomTooltip';
import LastUpdated from './LastUpdated';
import ShareButton from './ShareButton';

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
          <tspan x={x} dy={index === 0 ? 0 : 12} key={index}>{word}</tspan>
        ))}
      </text>
    );
  };

  const [trendData, setTrendData] = useState([]);
  const [departmentBreakdown, setDepartmentBreakdown] = useState([]);
  const [typeDistribution, setTypeDistribution] = useState([]);
  const [publicationList, setPublicationList] = useState([]);
  const [_loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('authToken');

  const isGuestUser = !user;
  const isReadOnlyView = isPublicView || isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 10;

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
  }, [serializedFilters, filters, filters.department, filters.publication_year, filters.publication_type, token, uploadVersion]);

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
  }, [filters, filters.department, filters.publication_year, filters.publication_type, token, uploadVersion]);

  const trendChartData = useMemo(() =>
    trendData.map((row) => ({ year: row.year, publications: Number(row.total) || 0 })),
    [trendData]);

  const formatDepartmentName = (name = '') => {
    return name
      .replace(/^(Department of\s+|Dept\. of\s+)/i, '')
      .replace(/\band\b/gi, '&')
      .trim();
  };

  const departmentChartData = useMemo(() =>
    departmentBreakdown.map((row) => ({
      department: formatDepartmentName(row.department || 'Unspecified'),
      total: Number(row.total) || 0
    })),
    [departmentBreakdown]);

  const participatingDepartments = useMemo(() =>
    departmentBreakdown.filter((row) => (row.total || 0) > 0).length,
    [departmentBreakdown]);

  const journalVsConference = useMemo(() =>
    `${formatNumber(summary.journal_count)} / ${formatNumber(summary.conference_count)}`,
    [summary.journal_count, summary.conference_count]);

  const handleFilterChange = (field, value) => setFilters((prev) => ({ ...prev, [field]: value }));
  const handleClearFilters = () => setFilters({ department: 'All', publication_year: 'All', publication_type: 'All' });

  const viewButtons = [
    { key: 'trend', label: '📈 Trend', color: '#6366f1' },
    { key: 'department', label: '🏚 Department', color: '#22c55e' },
    { key: 'publicationsTable', label: '📋 Directory', color: '#a855f7' },
  ];

  const FilterBar = ({ showDept = true, showYear = true, showType = true }) => (
    <div className="rls-filter-bar">
      <div className="filter-panel-header">
        <h4 className="rls-filter-h4">Dashboard Filters</h4>
        <button className="rls-clear-btn" onClick={handleClearFilters}>
          Clear All Filters
        </button>
      </div>

      <div className="rls-view-type-wrapper">
        <label className="rls-view-type-label">View Type</label>
        <div className="view-type-bar">
          {viewButtons.map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setViewType(key)}
              className="view-type-btn"
              style={{
                backgroundColor: viewType === key ? color : 'transparent',
                color: viewType === key ? 'white' : '#475569',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="rls-filter-grid">
        {showDept && (
          <div>
            <label className="rls-filter-label">Department</label>
            <select
              className="rls-filter-select"
              value={filters.department}
              onChange={(e) => handleFilterChange('department', e.target.value)}
            >
              <option value="All">All Departments</option>
              {filterOptions.publication_departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        )}

        {showYear && (
          <div>
            <label className="rls-filter-label">Publication Year</label>
            <select
              className="rls-filter-select"
              value={filters.publication_year}
              onChange={(e) => handleFilterChange('publication_year', e.target.value)}
            >
              <option value="All">All Years</option>
              {filterOptions.publication_years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        )}

        {showType && (
          <div>
            <label className="rls-filter-label">Publication Type</label>
            <select
              className="rls-filter-select"
              value={filters.publication_type}
              onChange={(e) => handleFilterChange('publication_type', e.target.value)}
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

  return (
    <div className={isPublicView ? "" : "page-container"}>
      <div className={isPublicView ? "" : "page-content"}>

        {!isReadOnlyView && (
          <button className="page-back-btn" onClick={() => navigate('/research')}>
            &#8592; Back to Research
          </button>
        )}

        {!isReadOnlyView && (
          <div className="section-header">
            <div className="section-header-left">
              <h1>Publications</h1>
            </div>

            {!isReadOnlyView && isAdmin && (
              <div className="section-header-actions">
                <button className="page-upload-btn" onClick={() => setIsUploadModalOpen(true)}>
                  &#128228; Upload Publications
                </button>
              </div>
            )}
          </div>
        )}

        {!isReadOnlyView && <h1>Library &amp; Scholarly Outputs</h1>}

        {error && <div className="error-message">{error}</div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LastUpdated tables={['research_publications']} />
          <ShareButton />
        </div>

        <div className="rls-export-row">
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

        <div id="library-summary-cards-container" className="stat-card-grid">
          {[
            { gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', shadow: 'rgba(99,102,241,0.2)', icon: '📚', label: 'Total Publications', value: formatNumber(summary.total), sub: 'Scholarly outputs' },
            { gradient: 'linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)', shadow: 'rgba(34,211,238,0.2)', icon: '📊', label: 'Journal / Conference', value: journalVsConference, sub: 'Journals/Conferences' },
            { gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', shadow: 'rgba(249,115,22,0.2)', icon: '🏚', label: 'Departments', value: participatingDepartments, sub: 'Active departments' },
          ].map(({ gradient, shadow, icon, label, value, sub }) => (
            <div
              key={label}
              className="rls-summary-card"
              style={{ background: gradient, boxShadow: `0 8px 16px ${shadow}` }}
            >
              <div className="rls-card-decor" />
              <div className="rls-card-body">
                <div className="rls-card-header">
                  <span className="rls-card-icon">{icon}</span>
                  <span className="stat-card-label">{label}</span>
                </div>
                <div className="stat-card-value rls-card-value">{value}</div>
                <div className="rls-card-status">
                  <span className="rls-card-dot" />
                  <span className="rls-card-sub">{sub}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {viewType === 'trend' && (
          <section className="rls-chart-section">
            <FilterBar showDept showYear showType />

            <div className="rls-chart-header-row">
              <div>
                <h2 className="rls-chart-h2">
                  <span className="rls-chart-icon">&#128200;</span> Publication Trend
                </h2>
                <p className="rls-chart-desc">Year-wise publication count</p>
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

            <div className="rls-mode-toggle">
              {['bar', 'trend'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setTrendChartMode(mode)}
                  className={`rls-mode-btn${trendChartMode === mode ? ' rls-mode-btn--active' : ''}`}
                >
                  {mode === 'bar' ? '📊 Bar' : '📈 Trend'}
                </button>
              ))}
            </div>

            <div id="library-trend-chart-container" className="rls-chart-container">
              {!trendChartData.length && (
                <div className="rls-no-data">No information available for the selected filter</div>
              )}
              <ResponsiveContainer width="100%" height={300}>
                {trendChartMode === 'bar' ? (
                  <BarChart data={trendChartData} margin={{ top: 26, right: 20, left: 40, bottom: 30 }}>
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
                  <LineChart data={trendChartData} margin={{ top: 26, right: 20, left: 40, bottom: 30 }}>
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
            </div>
          </section>
        )}

        {viewType === 'department' && (
          <section className="rls-chart-section">
            <FilterBar showDept={false} showYear showType />

            <div className="rls-chart-header-row">
              <div>
                <h2 className="rls-chart-h2">
                  <span className="rls-chart-icon">&#127962;</span> Department-wise Publications
                </h2>
                <p className="rls-chart-desc">Publications by department</p>
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

            <div id="library-dept-chart-container" className="rls-chart-container">
              {!departmentChartData.length && (
                <div className="rls-no-data">No information available for the selected filter</div>
              )}
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={departmentChartData} margin={{ top: 26, right: 20, left: 40, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="department" tick={renderDepartmentTick} interval={0} height={80} />
                  <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Publications" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={20}>
                    <LabelList dataKey="total" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: '#22c55e' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {viewType === 'publicationsTable' && (
          <section className="rls-chart-section">
            <FilterBar showDept showYear showType />

            <div className="rls-chart-header-row">
              <div>
                <h2 className="rls-chart-h2">
                  <span className="rls-chart-icon">&#128203;</span> Publications Directory
                </h2>
                <p className="rls-chart-desc">{publicationList.length} publications found</p>
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

            <div id="library-publications-table-container" className="rls-table-wrapper">
              <table className="rls-table">
                <thead>
                  <tr>
                    {['Title', 'Faculty', 'Dept', 'Type', 'Year', 'Journal'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {publicationList.length > 0 ? publicationList.map((p, i) => (
                    <tr key={p.publication_id} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td>{p.publication_title}</td>
                      <td>{p.faculty_name}</td>
                      <td>{p.department}</td>
                      <td>{p.publication_type}</td>
                      <td>{p.publication_year}</td>
                      <td>{p.journal_name}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="rls-table-empty-td">
                        No information available for the selected filter
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <div className="rls-cta-banner">
          <div className="rls-cta-left">
            <div>
              <h3 className="rls-cta-h3">Explore More about IIT Palakkad Library</h3>
              <p className="rls-cta-p">Explore the information hub of IIT Palakkad, where knowledge meets curiosity and innovation begins.</p>
            </div>
          </div>
          <a
            href="https://lib.iitpkd.ac.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="rls-cta-link"
          >
            Visit lib.iitpkd.ac.in &#8594;
          </a>
        </div>

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
