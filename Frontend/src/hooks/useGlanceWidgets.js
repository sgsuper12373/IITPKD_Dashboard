import { useCallback, useEffect, useState } from 'react';

const API = `${import.meta.env.VITE_API_BASE_URL}/api/glance-widgets/`;

const authHeaders = () => {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

const DEFAULT_WIDGETS = [
  { id: -1,  widget_type: 'gauge',    data_key: 'placementRate',   size: 'md', sort_order: 1,  title: 'Placement rate',              config: {} },
  { id: -2,  widget_type: 'gauge',    data_key: 'nirfRank',        size: 'md', sort_order: 2,  title: 'NIRF engineering rank',        config: {} },
  { id: -3,  widget_type: 'kpi',      data_key: 'students',        size: 'sm', sort_order: 3,  title: 'Students on roll',             config: {} },
  { id: -4,  widget_type: 'kpi',      data_key: 'faculty',         size: 'sm', sort_order: 4,  title: 'Faculty strength',             config: {} },
  { id: -5,  widget_type: 'kpi',      data_key: 'publications',    size: 'sm', sort_order: 5,  title: 'Publications',                 config: {} },
  { id: -6,  widget_type: 'kpi',      data_key: 'patents',         size: 'sm', sort_order: 6,  title: 'Patents filed',                config: {} },
  { id: -7,  widget_type: 'kpi',      data_key: 'funding',         size: 'sm', sort_order: 7,  title: 'Sponsored funding',            config: {} },
  { id: -8,  widget_type: 'kpi',      data_key: 'startups',        size: 'sm', sort_order: 8,  title: 'Startups incubated',           config: {} },
  { id: -9,  widget_type: 'combo',    data_key: 'funding',         size: 'lg', sort_order: 9,  title: 'Cross-section analysis',       config: {} },
  { id: -10, widget_type: 'radar',    data_key: 'pillarIndex',     size: 'md', sort_order: 10, title: 'Pillar index',                 config: {} },
  { id: -11, widget_type: 'funnel',   data_key: 'placementFunnel', size: 'md', sort_order: 11, title: 'Placement funnel',             config: {} },
  { id: -12, widget_type: 'donut',    data_key: 'alumniOutcomes',  size: 'md', sort_order: 12, title: 'Alumni outcomes',              config: {} },
  { id: -13, widget_type: 'progress', data_key: 'femaleShare',     size: 'md', sort_order: 13, title: 'Female share',                 config: {} },
  { id: -14, widget_type: 'ranked',   data_key: 'pubByDept',       size: 'lg', sort_order: 14, title: 'Publications by department',   config: {} },
];

export function useGlanceWidgets() {
  const [widgets, setWidgets] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fromApi, setFromApi] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    fetch(API, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((rows) => {
        if (Array.isArray(rows) && rows.length > 0) {
          setWidgets(rows);
          setFromApi(true);
        } else {
          setWidgets(DEFAULT_WIDGETS);
          setFromApi(false);
        }
        setLoading(false);
      })
      .catch(() => { setWidgets(DEFAULT_WIDGETS); setFromApi(false); setLoading(false); });
  }, []);

  useEffect(refresh, [refresh]);

  const addWidget = useCallback(async (body) => {
    const r = await fetch(API, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
    if (!r.ok) throw await r.json();
    refresh();
  }, [refresh]);

  const updateWidget = useCallback(async (id, body) => {
    const r = await fetch(`${API}${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) });
    if (!r.ok) throw await r.json();
    refresh();
  }, [refresh]);

  const deleteWidget = useCallback(async (id) => {
    const r = await fetch(`${API}${id}`, { method: 'DELETE', headers: authHeaders() });
    if (!r.ok) throw await r.json();
    refresh();
  }, [refresh]);

  const reorder = useCallback(async (items) => {
    const r = await fetch(`${API}reorder`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(items) });
    if (!r.ok) throw await r.json();
    refresh();
  }, [refresh]);

  return { widgets, loading, fromApi, refresh, addWidget, updateWidget, deleteWidget, reorder };
}
