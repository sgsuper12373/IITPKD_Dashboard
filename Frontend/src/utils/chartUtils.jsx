import React from 'react';

/**
 * Standard Custom Tooltip for Recharts that displays percentage values.
 * Total is the denominator — individual entries are expressed as % of Total.
 * The "Total" entry itself does not show a percentage.
 */
export const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (active && payload && payload.length) {
    // Find an explicit "Total" entry in the payload if present
    const totalEntry = payload.find(e => e.name === 'Total');

    // Denominator:
    //   • If there's an explicit "Total" bar/line, use its value.
    //   • Otherwise sum only non-Total entries (all entries when no Total exists).
    const denominator = totalEntry
      ? Number(totalEntry.value) || 0
      : payload.reduce((sum, e) => sum + (Number(e.value) || 0), 0);

    return (
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        padding: '12px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(4px)'
      }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: 700, color: '#1e293b', fontSize: '14px' }}>{label}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {payload.map((entry, index) => {
            const value = Number(entry.value) || 0;
            const isTotal = entry.name === 'Total';

            // Only show % for non-Total entries, using Total as denominator
            const percentage = (!isTotal && denominator > 0)
              ? ((value / denominator) * 100).toFixed(1)
              : null;

            const displayValue = formatter
              ? formatter(value, entry.name)
              : value.toLocaleString('en-IN');

            return (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color }} />
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>{entry.name}:</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600 }}>{displayValue}</span>
                  {percentage !== null && (
                    <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px', fontWeight: 500 }}>
                      ({percentage}%)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

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