import React from 'react';

/**
 * Standard Custom Tooltip for Recharts that displays percentage values.
 */
export const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (active && payload && payload.length) {
    // Calculate total for percentage if not already provided in data
    const total = payload.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);

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
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            
            let displayValue = formatter ? formatter(value, entry.name) : value.toLocaleString('en-IN');

            return (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color }} />
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>{entry.name}:</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600 }}>{displayValue}</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px', fontWeight: 500 }}>({percentage}%)</span>
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
