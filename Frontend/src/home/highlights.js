import { fmtNum } from '../charts/format';
import { KPI_PUBLIC_PATH } from './exploreMap';

const PHRASE = {
  students: 'Student intake',
  faculty: 'Faculty strength',
  publications: 'Publications',
  patents: 'Patents filed',
  funding: 'Sponsored funding',
  startups: 'Startups incubated',
};

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * Turns the already-loaded pulse data into up to `max` plain-text insights,
 * biggest movers first. Text is built from numbers only (no API strings).
 */
export function buildHighlights(data, max = 4) {
  if (!data) return [];
  const out = [];

  (data.kpis ?? []).forEach((k) => {
    if (!PHRASE[k.key] || !isNum(k.delta) || k.delta === 0) return;
    const good = k.invert ? k.delta < 0 : k.delta > 0;
    out.push({
      key: k.key,
      score: Math.abs(k.delta),
      tone: good ? 'up' : 'down',
      text: `${PHRASE[k.key]} ${k.delta > 0 ? 'up' : 'down'} ${fmtNum(Math.abs(k.delta), 1)}% on last year`,
      to: KPI_PUBLIC_PATH[k.key],
    });
  });

  const pl = data.gauges?.placement;
  if (pl && isNum(pl.delta) && pl.delta !== 0) {
    out.push({
      key: 'placement',
      score: Math.abs(pl.delta),
      tone: pl.delta > 0 ? 'up' : 'down',
      text: `Placement rate ${pl.delta > 0 ? 'up' : 'down'} ${fmtNum(Math.abs(pl.delta), 1)} points on last year`,
      to: '/education',
    });
  }

  return out.sort((a, b) => b.score - a.score).slice(0, max);
}
