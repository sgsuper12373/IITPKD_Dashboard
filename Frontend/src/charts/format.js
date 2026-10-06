const IN = 'en-IN';

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

export const fmtInt = (v) => (isNum(v) ? Math.round(v).toLocaleString(IN) : '–');

export const fmtNum = (v, digits = 1) =>
  isNum(v)
    ? v.toLocaleString(IN, { minimumFractionDigits: 0, maximumFractionDigits: digits })
    : '–';

export const fmtPct = (v, digits = 1) => (isNum(v) ? `${fmtNum(v, digits)}%` : '–');

export const fmtCr = (v) => (isNum(v) ? `₹${fmtNum(v, 2)} Cr` : '–');

/** "+4.2%" / "−1.0%" / "–" — typographic minus so it lines up with the plus. */
export const fmtDelta = (v, unit = '%', digits = 1) => {
  if (!isNum(v)) return '–';
  const sign = v > 0 ? '+' : v < 0 ? '−' : '';
  return `${sign}${fmtNum(Math.abs(v), digits)}${unit === 'pp' ? ' pp' : unit}`;
};

export const isFiniteNumber = isNum;
