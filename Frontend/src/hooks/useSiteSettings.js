import { useCallback, useEffect, useState } from 'react';
import axios from '../utils/cachedAxios';

const API = `${import.meta.env.VITE_API_BASE_URL}/api/site-settings`;
const STORAGE_KEY = 'site_settings';

const DEFAULTS = { show_image_slider: 'true', show_nirf: 'true' };

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function writeLocal(settings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}

export function useSiteSettings() {
  const [settings, setSettings] = useState(() => ({ ...DEFAULTS, ...readLocal() }));

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    axios.get(`${API}/`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => {
        const merged = { ...DEFAULTS, ...r.data };
        setSettings(merged);
        writeLocal(merged);
      })
      .catch(() => {});
  }, []);

  const toggle = useCallback((key) => {
    setSettings(prev => {
      const next = { ...prev, [key]: prev[key] === 'true' ? 'false' : 'true' };
      writeLocal(next);

      const token = localStorage.getItem('authToken');
      if (token) {
        axios.put(`${API}/${key}`, { value: next[key] }, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }

      return next;
    });
  }, []);

  return { settings, toggle };
}
