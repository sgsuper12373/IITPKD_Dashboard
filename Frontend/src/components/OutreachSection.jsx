import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { fetchOutreachList } from '../services/outreachExtensionStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import DataUploadModal from './LazyDataUploadModal';
import ExportMenu from './ExportMenu';
import './Page.css';
import './OutreachMinimal.css';

// ─── Field definitions ───────────────────────────────────────────────────────

const COMMON_FIELDS = [
  { key: 'id', label: 'ID' },
  { key: 'academic_year', label: 'Academic Year' },
  { key: 'program_name', label: 'Program Name' },
  { key: 'program_type', label: 'Program Type' },
  { key: 'engagement_type', label: 'Engagement Type' },
  { key: 'association', label: 'Association' },
  { key: 'start_date', label: 'Start Date' },
  { key: 'end_date', label: 'End Date' },
  { key: 'targeted_audience', label: 'Targeted Audience' },
  { key: 'num_attendees', label: 'No. of Attendees' },
  { key: 'num_schools', label: 'No. of Schools' },
  { key: 'num_colleges', label: 'No. of Colleges' },
  { key: 'geographic_reach', label: 'Geographic Reach' },
  { key: 'remarks', label: 'Remarks' },
  { key: 'created_by', label: 'Created By' },
  { key: 'created_at', label: 'Created At' },
];

const NSS_FIELDS = [
  { key: 'nss_activity_type', label: 'NSS Activity Type' },
  { key: 'nss_volunteer_count', label: 'NSS Volunteer Count' },
  { key: 'nss_community_reached', label: 'NSS Community Reached' },
];

const PROGRAM_CONFIGS = [
  {
    key: 'science_quest',
    tableKey: 'outreach_science_quest',
    title: 'Science Quest',
    icon: '🔬',
    description: 'Science outreach and laboratory programmes for school students',
    match: (name) => name?.toLowerCase().includes('science quest'),
    specificFields: [
      { key: 'sq_stipend_provided', label: 'Stipend Provided' },
      { key: 'sq_travel_allowance', label: 'Travel Allowance' },
      { key: 'sq_num_lab_sessions', label: 'No. of Lab Sessions' },
      { key: 'sq_districts_covered', label: 'Districts Covered' },
    ],
  },
  {
    key: 'palakkad_math_circle',
    tableKey: 'outreach_math_circle',
    title: 'Palakkad Math Circle',
    icon: '📐',
    description: 'Mathematics enrichment sessions for school students',
    match: (name) =>
      name?.toLowerCase().includes('math circle') ||
      name?.toLowerCase().includes('palakkad math'),
    specificFields: [
      { key: 'pmc_target_class', label: 'Target Class' },
      { key: 'pmc_mathematician_led', label: 'Mathematicians' },
      { key: 'pmc_num_sessions', label: 'No. of Sessions' },
    ],
  },
  {
    key: 'pale_blue_dot',
    tableKey: 'outreach_pale_blue_dot',
    title: 'Pale Blue Dot',
    icon: '🌍',
    description: 'Astronomy and space science public lecture series',
    match: (name) => name?.toLowerCase().includes('pale blue dot'),
    specificFields: [
      { key: 'pbd_lecture_topic', label: 'Lecture Topic' },
      { key: 'pbd_speaker_name', label: 'Speaker Name' },
      { key: 'pbd_speaker_affiliation', label: 'Speaker Affiliation' },
    ],
  },
  {
    key: 'institute_visits',
    tableKey: 'outreach_institute_visits',
    title: 'Institute Visits',
    icon: '🏛️',
    description: 'Organised visits by institutions to the IIT Palakkad campus',
    match: (name) => name?.toLowerCase().includes('institute visit'),
    specificFields: [
      { key: 'iv_visiting_institution', label: 'Visiting Institution' },
      { key: 'iv_visiting_institution_type', label: 'Institution Type' },
      { key: 'iv_num_groups', label: 'No. of Groups' },
    ],
  },
  {
    key: 'nss_activities',
    tableKey: 'outreach_nss_activities',
    title: 'NSS Activities',
    icon: '🤝',
    description: 'National Service Scheme community service initiatives',
    match: (name) => name?.toLowerCase().includes('nss'),
    specificFields: NSS_FIELDS,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isNonNull(value) {
  return value !== null && value !== undefined && value !== '' && value !== 'null';
}

function formatValue(value) {
  if (!isNonNull(value)) return null;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  // Detect ISO date strings
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const d = new Date(value);
    if (!isNaN(d))
      return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  return String(value);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FieldRow({ label, value }) {
  const formatted = formatValue(value);
  if (!isNonNull(formatted)) return null;
  return (
    <div style={{
      display: 'flex',
      gap: '0.75rem',
      padding: '0.45rem 0',
      borderBottom: '1px solid rgba(0,0,0,0.04)',
      alignItems: 'flex-start',
    }}>
      <span style={{
        minWidth: '180px',
        fontSize: '0.78rem',
        color: '#6e6e73',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        paddingTop: '1px',
        flexShrink: 0,
      }}>
        {label}
      </span>
      <span style={{ fontSize: '0.9rem', color: '#1d1d1f', lineHeight: '1.5' }}>
        {formatted}
      </span>
    </div>
  );
}

function SectionHeading({ children }) {
  return (
    <div style={{
      fontSize: '0.72rem',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.09em',
      color: '#f7a600',
      marginBottom: '0.6rem',
      marginTop: '1.4rem',
    }}>
      {children}
    </div>
  );
}

function ExtraDataSection({ data }) {
  if (!data || typeof data !== 'object') return null;
  const entries = Object.entries(data).filter(([, v]) => isNonNull(v));
  if (entries.length === 0) return null;
  return (
    <>
      <SectionHeading>Additional Data</SectionHeading>
      {entries.map(([key, val]) => (
        <FieldRow key={key} label={key.replace(/_/g, ' ')} value={val} />
      ))}
    </>
  );
}

function GridRecordCard({ record, slNo, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#f5f5f7',
        border: '1px solid rgba(0,0,0,0.05)',
        borderRadius: '16px',
        boxShadow: '0 8px 8px rgba(0,0,0,0.8)',
        padding: '1.5rem',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        height: '100%',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-6px)';
        e.currentTarget.style.background = '#ffffff';
        e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.8)';
        e.currentTarget.style.borderColor = 'rgba(64, 61, 248, 0.73)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.background = '#f5f5f7';
        e.currentTarget.style.boxShadow = '0 8px 8px rgba(0,0,0,0.8)';
        e.currentTarget.style.borderColor = 'rgba(0,0,0,0.05)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'rgba(247,166,0,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.85rem', fontWeight: '700', color: '#f7a600',
        }}>
          {slNo}
        </div>
        <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: '500', background: '#f5f5f7', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>
          {record.academic_year || 'N/A'}
        </span>
      </div>

      <div style={{ flexGrow: 1 }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: '600', color: '#1d1d1f', margin: '0 0 0.5rem 0', lineHeight: '1.3' }}>
          {record.program_name || 'Outreach Record'}
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#6e6e73', margin: 0, lineHeight: '1.4' }}>
          {[record.engagement_type, record.program_type].filter(Boolean).join(' · ')}
        </p>
      </div>

      {(record.start_date || record.end_date) && (
        <div style={{ fontSize: '0.85rem', color: '#555', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1rem' }}>📅</span>
          {record.start_date ? new Date(record.start_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
          {record.end_date && record.start_date !== record.end_date && ` - ${new Date(record.end_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`}
        </div>
      )}
    </div>
  );
}

function RecordExpandedView({ record, programConfig, onBack }) {
  const hasSpecificData = programConfig.specificFields.some(({ key }) => isNonNull(record[key]));
  const hasNssData =
    programConfig.key !== 'nss_activities' &&
    NSS_FIELDS.some(({ key }) => isNonNull(record[key]));

  return (
    <div style={{
      background: '#fff',
      borderRadius: '20px',
      border: '1px solid rgba(0,0,0,0.08)',
      overflow: 'hidden',
      boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
      animation: 'cardFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      <div style={{
        padding: '1.2rem 2rem',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        background: '#fafafa',
        gap: '1.5rem'
      }}>
        <button onClick={onBack} style={{
          background: '#fff', border: '1px solid #e0e0e0', borderRadius: '100px',
          padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.9rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          fontWeight: '500', color: '#1d1d1f', transition: 'all 0.2s',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f0f0f0'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
        >
          <span style={{ fontSize: '1.1rem' }}>←</span> Back
        </button>
        <div>
          <h2 style={{ margin: '0 0 0.2rem 0', fontSize: '1.3rem', color: '#1d1d1f' }}>
            {record.program_name || 'Record Details'}
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#6e6e73' }}>
            {record.academic_year} · {record.engagement_type}
          </p>
        </div>
      </div>

      <div style={{ padding: '2rem' }}>
        <SectionHeading>General Information</SectionHeading>
        {COMMON_FIELDS.map(({ key, label }) => (
          <FieldRow key={key} label={label} value={record[key]} />
        ))}

        {hasSpecificData && (
          <>
            <SectionHeading>{programConfig.title} Details</SectionHeading>
            {programConfig.specificFields.map(({ key, label }) => (
              <FieldRow key={key} label={label} value={record[key]} />
            ))}
          </>
        )}

        {hasNssData && (
          <>
            <SectionHeading>NSS Activities</SectionHeading>
            {NSS_FIELDS.map(({ key, label }) => (
              <FieldRow key={key} label={label} value={record[key]} />
            ))}
          </>
        )}

        <ExtraDataSection data={record.extra_data} />
      </div>
    </div>
  );
}

function ProgramDetailView({ programConfig, records, user, token, loading }) {
  const matching = records.filter((r) => programConfig.match(r.program_name));
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // If a new program is selected from outside, reset selectedRecord
  useEffect(() => {
    setSelectedRecord(null);
  }, [programConfig]);

  return (
    <div className="outreach-expanded-view">
      <div className="outreach-expanded-container">
        {/* Top bar */}
        <div className="outreach-top-bar">
          <div className="outreach-icon-header">{programConfig.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="outreach-overview-text">{programConfig.title}</p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#6e6e73', marginTop: '0.1rem' }}>
              {programConfig.description}
            </p>
          </div>
          <span style={{
            background: 'rgba(247,166,0,0.1)',
            color: '#f7a600',
            padding: '0.35rem 0.9rem',
            borderRadius: '100px',
            fontSize: '0.78rem',
            fontWeight: '600',
            flexShrink: 0,
            marginRight: '12px'
          }}>
            {matching.length} {matching.length === 1 ? 'record' : 'records'}
          </span>
          <ExportMenu
            elementId="outreach-program-records-container"
            data={matching}
            headers={['Year', 'Program Name', 'Type', 'Audience', 'Attendees']}
            keys={['academic_year', 'program_name', 'program_type', 'targeted_audience', 'num_attendees']}
            filename={`outreach_${programConfig.key}_list`}
            title={`${programConfig.title} Records`}
          />
          {user?.role_id >= 2 && (
            <button
              className="page-upload-btn"
              style={{ flexShrink: 0 }}
              onClick={() => setIsUploadOpen(true)}
            >
              📤 Upload Data
            </button>
          )}
        </div>

        {/* Records */}
        <div style={{ padding: '1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6e6e73' }}>
              <p style={{ margin: 0 }}>Loading records...</p>
            </div>
          ) : matching.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6e6e73' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
              <p style={{ margin: 0 }}>No records found for <strong>{programConfig.title}</strong>.</p>
              {user?.role_id >= 2 && (
                <p style={{ marginTop: '0.4rem', fontSize: '0.85rem' }}>
                  Use the <strong>Upload Data</strong> button above to add records.
                </p>
              )}
            </div>
          ) : selectedRecord ? (
            <RecordExpandedView
              record={selectedRecord}
              programConfig={programConfig}
              onBack={() => setSelectedRecord(null)}
            />
          ) : (
            <div style={{
              /*display: 'grid',*/
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1.5rem'
            }}>
              <div id="outreach-program-records-container" style={{
                display: 'grid',
                gridTemplateColumns: 'inherit',
                gap: 'inherit',
                width: '100%'
              }}>
                {matching.map((record, idx) => (
                  <GridRecordCard
                    key={record.id ?? idx}
                    record={record}
                    slNo={idx + 1}
                    onClick={() => setSelectedRecord(record)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <DataUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        tableName={programConfig.tableKey}
        token={token}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function OutreachSection({ user, isPublicView = false, programKey = null }) {
  const navigate = useNavigate();
  const uploadVersion = useUploadRefresh();
  const token = localStorage.getItem('authToken');

  const isGuestUser = !user;
  const isReadOnlyView = isPublicView || isGuestUser;

  const [searchParams] = useSearchParams();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState(
    programKey ? (PROGRAM_CONFIGS.find((c) => c.key === programKey) ?? null) : null
  );

  // Auto-select program from prop or URL query param (?program=science_quest)
  useEffect(() => {
    const key = programKey || searchParams.get('program');
    if (key) {
      const found = PROGRAM_CONFIGS.find((c) => c.key === key);
      if (found) setSelectedProgram(found);
    }
  }, [searchParams, programKey]);

  useEffect(() => {
    setLoading(true);
    fetchOutreachList(token)
      .then((data) => setRecords(data?.records ?? []))
      .catch((err) => setError(err.message || 'Failed to load outreach data'))
      .finally(() => setLoading(false));
  }, [token, uploadVersion]);

  const getCount = (config) => records.filter((r) => config.match(r.program_name)).length;

  if (selectedProgram) {
    return (
      <div className={isPublicView ? '' : 'page-container'}>
        <div className={isPublicView ? '' : 'page-content'}>
          {!isReadOnlyView && (
            <button className="page-back-btn" onClick={() => navigate('/outreach-extension')}>
              ← Back to Outreach Extension
            </button>
          )}
          <ProgramDetailView
            programConfig={selectedProgram}
            records={records}
            user={user}
            token={token}
            loading={loading}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={isPublicView ? '' : 'page-container'}>
      <div className={isPublicView ? '' : 'page-content'}>
        {!isPublicView && (
          <button className="page-back-btn" onClick={() => navigate('/outreach-extension')}>
            ← Back to Outreach Extension
          </button>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div className="outreach-page-header">
            <h1>Outreach Programs</h1>
            <p>
              Community engagement initiatives connecting IIT Palakkad with schools, colleges, and society.
              Select a programme to explore its records.
            </p>
          </div>
          <ExportMenu
            elementId="outreach-programs-summary-container"
            data={PROGRAM_CONFIGS.map(c => ({ title: c.title, count: getCount(c) }))}
            headers={['Program', 'Record Count']}
            keys={['title', 'count']}
            filename="outreach_programs_summary"
            title="Outreach Programs Summary"
          />
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6e6e73' }}>
            Loading outreach data…
          </div>
        )}

        {error && (
          <div style={{
            padding: '1.25rem 1.5rem',
            background: '#fff5f5',
            border: '1px solid #fed7d7',
            borderRadius: '12px',
            color: '#c53030',
            fontSize: '0.9rem',
          }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <div id="outreach-programs-summary-container" className="outreach-sections-grid">
            {PROGRAM_CONFIGS.map((config) => {
              const count = getCount(config);
              return (
                <div
                  key={config.key}
                  className="outreach-section-card"
                  onClick={() => setSelectedProgram(config)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedProgram(config)}
                >
                  <div className="outreach-card-icon">{config.icon}</div>
                  <h3 className="outreach-card-title">{config.title}</h3>
                  <p className="outreach-card-subtitle">{config.description}</p>
                  <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', fontWeight: '600', color: '#f7a600' }}>
                    {count > 0 ? `${count} ${count === 1 ? 'record' : 'records'}` : 'To Be Updated'}
                  </div>
                  <div className="outreach-card-arrow">→</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default OutreachSection;
