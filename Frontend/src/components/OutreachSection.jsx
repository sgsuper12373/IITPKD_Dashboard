import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { fetchOutreachList } from '../services/outreachExtensionStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import DataUploadModal from './LazyDataUploadModal';
import ExportMenu from './ExportMenu';
import { OUTREACH_PROGRAM_ROLES } from '../utils/rolePermissions';
import './Page.css';
import './OutreachMinimal.css';
import './OutreachSection.css';

// ─── Field definitions ───────────────────────────────────────────────────────

const COMMON_FIELDS = [
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
  if (typeof value === 'string') {
    // ISO: "2025-09-17..." or RFC: "Wed, 17 Sep 2025 00:00:00 GMT"
    const isDateString =
      /^\d{4}-\d{2}-\d{2}/.test(value) ||
      /^[A-Za-z]{3},\s+\d{1,2}\s+[A-Za-z]{3}\s+\d{4}/.test(value);
    if (isDateString) {
      const d = new Date(value);
      if (!isNaN(d))
        return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    }
  }
  return String(value);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FieldRow({ label, value }) {
  const formatted = formatValue(value);
  if (!isNonNull(formatted)) return null;
  return (
    <div className="ors-field-row">
      <span className="ors-field-label">{label}</span>
      <span className="ors-field-value">{formatted}</span>
    </div>
  );
}

function SectionHeading({ children }) {
  return <div className="ors-section-heading">{children}</div>;
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
    <div className="ors-grid-card" onClick={onClick}>
      <div className="ors-card-top">
        <div className="ors-card-sl-badge">{slNo}</div>
        <span className="ors-card-year">{record.academic_year || 'N/A'}</span>
      </div>

      <div className="ors-card-body">
        <h3 className="ors-card-h3">{record.program_name || 'Outreach Record'}</h3>
        <p className="ors-card-type">
          {[record.engagement_type, record.program_type].filter(Boolean).join(' · ')}
        </p>
      </div>

      {(record.start_date || record.end_date) && (
        <div className="ors-card-dates">
          <span className="ors-card-date-icon">&#128197;</span>
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
    <div className="ors-expanded">
      <div className="ors-expanded-header">
        <button className="ors-back-btn" onClick={onBack}>
          <span className="ors-back-arrow">&#8592;</span> Back
        </button>
        <div className="ors-expanded-title">
          <h2 className="ors-expanded-h2">{record.program_name || 'Record Details'}</h2>
          <p className="ors-expanded-sub">{record.academic_year} · {record.engagement_type}</p>
        </div>
      </div>

      <div className="ors-expanded-body">
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
  const roleId = user?.role_id;
  const allowedRoles = OUTREACH_PROGRAM_ROLES[programConfig.key] ?? [3];
  const canModify = allowedRoles.includes(roleId);

  useEffect(() => {
    setSelectedRecord(null);
  }, [programConfig]);

  return (
    <div className="outreach-expanded-view">
      <div className="outreach-expanded-container">
        {/* Top bar */}
        <div className="outreach-top-bar">
          <div className="outreach-icon-header">{programConfig.icon}</div>
          <div className="ors-detail-flex">
            <p className="outreach-overview-text">{programConfig.title}</p>
            <p className="ors-detail-desc">{programConfig.description}</p>
          </div>
          <span className="ors-record-badge">
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
          {canModify && (
            <button
              className="page-upload-btn ors-upload-shrink"
              onClick={() => setIsUploadOpen(true)}
            >
              &#128228; Upload Data
            </button>
          )}
        </div>

        {/* Records */}
        <div className="ors-records-body">
          {loading ? (
            <div className="ors-loading-state">
              <p className="ors-state-p">Loading records...</p>
            </div>
          ) : matching.length === 0 ? (
            <div className="ors-empty-state">
              <div className="ors-empty-icon">&#128237;</div>
              <p className="ors-state-p">No records found for <strong>{programConfig.title}</strong>.</p>
              {canModify && (
                <p className="ors-empty-note">
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
            <div id="outreach-program-records-container" className="ors-records-grid">
              {matching.map((record, idx) => (
                <GridRecordCard
                  key={record.id ?? idx}
                  record={record}
                  slNo={idx + 1}
                  onClick={() => setSelectedRecord(record)}
                />
              ))}
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
              &#8592; Back to Outreach Extension
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
            &#8592; Back to Outreach Extension
          </button>
        )}
        <div className="ors-header-row">
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
          <div className="ors-loading">Loading outreach data&#8230;</div>
        )}

        {error && (
          <div className="ors-error">{error}</div>
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
                  <div className="ors-card-count">
                    {count > 0 ? `${count} ${count === 1 ? 'record' : 'records'}` : 'To Be Updated'}
                  </div>
                  <div className="outreach-card-arrow">&#8594;</div>
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
