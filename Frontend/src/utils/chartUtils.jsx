/**
 * Format currency in Indian format
 */
export const formatCurrency = (value) => {
  if (value === null || value === undefined) return '–';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
};

/**
 * Format number in Indian format
 */
export const formatNumber = (value) => {
  return new Intl.NumberFormat('en-IN').format(value || 0);
};

export const getOrderedLegend = (payload = [], keys = []) => {
  const map = new Map(payload.map(p => [p.dataKey, p]));
  return keys.map(k => map.get(k)).filter(Boolean);
};