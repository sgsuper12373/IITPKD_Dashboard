import { useEffect, useMemo, useRef, useState } from 'react';
import { useUploadRefresh } from './useUploadRefresh';
import { TREND_YEARS } from '../charts/chartConfig';
import { availableYears, buildPulse, buildSeries, defaultYear, windowYears } from '../utils/pulseModel';

import { fetchPlacementTrend, fetchPlacementRecruiters } from '../services/placementStats';
import { fetchNirfMetrics } from '../services/nirfStats';
import { fetchProgramTrends, fetchOnrollSummary } from '../services/academicStats';
import { fetchYearwiseStrength } from '../services/administrativeStats';
import {
  fetchPublicationTrend,
  fetchPublicationByDepartment,
  fetchPatentStats,
  fetchConsultancyRevenueTrend,
} from '../services/researchModuleStats';
import { fetchYearlyGrowth } from '../services/innovationStats';
import { fetchEwdYearly } from '../services/ewdStats';
import { fetchSummary as fetchIarSummary } from '../services/iarStats';
import { fetchIcsrYearlyDistribution } from '../services/industryConnectStats';
import { fetchNptelTrend, fetchOpenHouseTimeline } from '../services/outreachExtensionStats';

const readToken = () => {
  try {
    return localStorage.getItem('authToken');
  } catch {
    return null;
  }
};

/**
 * Loads every series the Quick Glance page needs from the EXISTING section
 * APIs (all read-only, token-optional endpoints — no new backend surface) and
 * derives the per-year view with src/utils/pulseModel.js.
 *
 *  - One fetch round per page load (and per CSV upload); changing the year only
 *    re-derives from what is already loaded.
 *  - Promise.allSettled: one failing endpoint degrades its own widgets instead
 *    of blanking the page. Error details are logged, never rendered.
 *  - Department publications are fetched per year, lazily, for the sparkline
 *    window of the selected year only.
 *
 * @param {number|null} selectedYear academic-year START year (2024 ≙ 2024-25); null = default (latest)
 * @returns {{ status: 'loading'|'ready'|'error', partial: boolean, year: number|null,
 *            years: number[], data: object|null }}
 */
export function useInstitutePulse(selectedYear) {
  const uploadVersion = useUploadRefresh();
  const [raw, setRaw] = useState(null);
  const [status, setStatus] = useState('loading');
  const [partial, setPartial] = useState(false);
  const [deptByYear, setDeptByYear] = useState({});
  const attempted = useRef(new Set());
  const gen = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /* ── main fetch ── */
  useEffect(() => {
    let alive = true;
    const token = readToken();
    setStatus((s) => (s === 'ready' ? s : 'loading'));

    const tasks = {
      placementTrend: () => fetchPlacementTrend({}, token),
      recruiters: () => fetchPlacementRecruiters({}, token),
      nirf: () => fetchNirfMetrics(token),
      programTrends: () => fetchProgramTrends({}, token),
      onroll: () => fetchOnrollSummary(token),
      facultyStrength: () => fetchYearwiseStrength({ emp_type: 'Teaching', num_years: TREND_YEARS + 3 }, token),
      pubTrend: () => fetchPublicationTrend({}, token),
      patents: () => fetchPatentStats({}, token),
      revenue: () => fetchConsultancyRevenueTrend({}, token),
      innovation: () => fetchYearlyGrowth(token),
      ewd: () => fetchEwdYearly(token),
      iar: () => fetchIarSummary({}, token),
      icsrYearly: () => fetchIcsrYearlyDistribution({}, token),
      nptelTrend: () => fetchNptelTrend(token),
      openHouse: () => fetchOpenHouseTimeline(token),
    };
    const keys = Object.keys(tasks);

    Promise.allSettled(keys.map((k) => tasks[k]())).then((results) => {
      if (!alive) return;
      const next = {};
      let failed = 0;
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') next[keys[i]] = r.value;
        else {
          failed += 1;
          console.error(`Quick Glance: "${keys[i]}" failed`);
        }
      });
      gen.current += 1;
      attempted.current = new Set();
      setDeptByYear({});
      setRaw(next);
      setPartial(failed > 0);
      setStatus(failed === keys.length ? 'error' : 'ready');
    });

    return () => {
      alive = false;
    };
  }, [uploadVersion]);

  const series = useMemo(() => (raw ? buildSeries(raw) : null), [raw]);
  // The newest selectable year: the latest year with placement data (else any data).
  // Later years that only appear in a few sources are never offered.
  const latestYear = useMemo(() => (series ? defaultYear(series) : null), [series]);
  const year = useMemo(() => {
    if (!series || latestYear === null) return null;
    return Number.isInteger(selectedYear) && selectedYear <= latestYear ? selectedYear : latestYear;
  }, [series, selectedYear, latestYear]);
  const years = useMemo(
    () => (series ? availableYears(series).filter((y) => y <= latestYear).slice(-TREND_YEARS) : []),
    [series, latestYear]
  );

  /* ── department publications for the selected year's sparkline window ── */
  useEffect(() => {
    if (!series || !Number.isInteger(year)) return;
    const token = readToken();
    const generation = gen.current;
    const missing = windowYears(year).filter((y) => !attempted.current.has(y));
    if (missing.length === 0) return;
    missing.forEach((y) => attempted.current.add(y));

    // Results are stored even if the user has since picked another year (they
    // are keyed by year and stay valid); only a newer main fetch invalidates them.
    Promise.allSettled(missing.map((y) => fetchPublicationByDepartment({ publication_year: y }, token))).then(
      (results) => {
        if (!mounted.current || generation !== gen.current) return;
        const add = {};
        results.forEach((r, i) => {
          if (r.status === 'fulfilled' && Array.isArray(r.value)) add[missing[i]] = r.value;
        });
        if (Object.keys(add).length) setDeptByYear((prev) => ({ ...prev, ...add }));
      }
    );
  }, [series, year]);

  const data = useMemo(
    () => (series && Number.isInteger(year) ? buildPulse(series, year, { onroll: raw?.onroll, deptByYear }) : null),
    [series, year, raw, deptByYear]
  );

  return { status, partial, year, years, data };
}

export default useInstitutePulse;
