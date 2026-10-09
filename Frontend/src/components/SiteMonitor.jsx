import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import './SiteMonitor.css';

const API = import.meta.env.VITE_API_BASE_URL;
const pct = (v) => (typeof v === 'number' ? `${(v * 100).toFixed(0)}%` : '–');
const when = (iso) => (iso ? new Date(iso).toLocaleString('en-IN') : '–');

function Table({ caption, columns, rows, empty = 'No data yet' }) {
  return (
    <div className="sm-block">
      <h3 className="sm-h3">{caption}</h3>
      {rows.length === 0 ? (
        <p className="sm-empty">{empty}</p>
      ) : (
        <div className="sm-scroll">
          <table className="sm-table">
            <thead>
              <tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>{columns.map((c) => <td key={c.key}>{c.render ? c.render(r) : r[c.key]}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="sm-stat">
      <span className="sm-stat__value">{value ?? '–'}</span>
      <span className="sm-stat__label">{label}</span>
    </div>
  );
}

/** Admin-only (role 3) view of visitor behaviour and the security audit log. Text is rendered via React, never as HTML. */
export default function SiteMonitor({ token }) {
  const [tab, setTab] = useState('visitors');
  const [days, setDays] = useState(30);
  const [hours, setHours] = useState(24);
  const [visitors, setVisitors] = useState(null);
  const [security, setSecurity] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    const headers = { Authorization: `Bearer ${token}` };
    try {
      if (tab === 'visitors') {
        const r = await axios.get(`${API}/api/analytics/summary`, { headers, params: { days } });
        setVisitors(r.data);
      } else {
        const [s, e] = await Promise.all([
          axios.get(`${API}/api/security/summary`, { headers, params: { hours } }),
          axios.get(`${API}/api/security/events`, { headers, params: { limit: 100 } }),
        ]);
        setSecurity(s.data);
        setEvents(e.data.events);
      }
    } catch (err) {
      setError(err.response?.status === 403 ? 'Only the master administrator can view this page.' : 'Could not load data right now.');
    }
  }, [tab, days, hours, token]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="sm">
      <h1 className="sm-title">Site Monitor</h1>
      <div className="sm-tabs" role="tablist">
        {[['visitors', 'Visitors'], ['security', 'Security']].map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k}
            className={`sm-tab${tab === k ? ' is-active' : ''}`} onClick={() => setTab(k)}>{label}</button>
        ))}
        <label className="sm-range">
          {tab === 'visitors' ? 'Period' : 'Window'}
          {tab === 'visitors' ? (
            <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {[7, 30, 90, 180].map((d) => <option key={d} value={d}>Last {d} days</option>)}
            </select>
          ) : (
            <select value={hours} onChange={(e) => setHours(Number(e.target.value))}>
              {[[24, '24 hours'], [72, '3 days'], [168, '7 days'], [720, '30 days']].map(([h, l]) => <option key={h} value={h}>Last {l}</option>)}
            </select>
          )}
        </label>
      </div>

      {error && <p className="sm-error" role="alert">{error}</p>}

      {!error && tab === 'visitors' && visitors && (
        <>
          <div className="sm-stats">
            <Stat label="Page views" value={visitors.views} />
            <Stat label="Visits (sessions)" value={visitors.sessions} />
            <Stat label="Pages per visit" value={visitors.avg_pages_per_session} />
            <Stat label="Left after one page" value={pct(visitors.single_page_share)} />
            <Stat label="From campus" value={pct(visitors.campus_share)} />
          </div>
          <Table caption="Most viewed pages" columns={[{ key: 'path', label: 'Page' }, { key: 'views', label: 'Views' }]} rows={visitors.top_pages} />
          <Table caption="Where visits start" columns={[{ key: 'path', label: 'Page' }, { key: 'sessions', label: 'Visits' }]} rows={visitors.entry_pages} />
          <Table caption="Where visits end" columns={[{ key: 'path', label: 'Page' }, { key: 'sessions', label: 'Visits' }]} rows={visitors.exit_pages} />
          <Table caption="What visitors click (new features)" columns={[{ key: 'target', label: 'Element' }, { key: 'clicks', label: 'Clicks' }]} rows={visitors.clicks} />
          <Table caption="Most followed paths" columns={[{ key: 'from_path', label: 'From' }, { key: 'path', label: 'To' }, { key: 'views', label: 'Times' }]} rows={visitors.flows} />
          <Table caption="Daily" columns={[{ key: 'day', label: 'Day' }, { key: 'views', label: 'Views' }, { key: 'sessions', label: 'Visits' }]} rows={[...visitors.daily].reverse()} />
        </>
      )}

      {!error && tab === 'security' && security && (
        <>
          <Table caption="Needs attention (high severity)"
            columns={[{ key: 'occurred_at', label: 'When', render: (r) => when(r.occurred_at) }, { key: 'event_type', label: 'Event' }, { key: 'ip_address', label: 'IP' }, { key: 'email', label: 'Account' }, { key: 'detail', label: 'Detail' }]}
            rows={security.recent_high} empty="Nothing high-severity in this window" />
          <Table caption="Events by type"
            columns={[{ key: 'event_type', label: 'Event' }, { key: 'severity', label: 'Severity' }, { key: 'count', label: 'Count' }]} rows={security.by_type} empty="No events in this window" />
          <Table caption="Noisiest IPs (failed logins, denials, rate limits, probes)"
            columns={[{ key: 'ip_address', label: 'IP' }, { key: 'count', label: 'Events' }, { key: 'kinds', label: 'Kinds' }, { key: 'last_seen', label: 'Last seen', render: (r) => when(r.last_seen) }]} rows={security.top_ips} empty="No suspicious IPs" />
          <Table caption="Latest events"
            columns={[{ key: 'occurred_at', label: 'When', render: (r) => when(r.occurred_at) }, { key: 'event_type', label: 'Event' }, { key: 'severity', label: 'Sev' }, { key: 'ip_address', label: 'IP' }, { key: 'endpoint', label: 'Endpoint' }, { key: 'email', label: 'Account' }, { key: 'detail', label: 'Detail' }]} rows={events} />
        </>
      )}
    </div>
  );
}
