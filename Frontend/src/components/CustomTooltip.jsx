import './CustomTooltip.css';

const CustomTooltip = ({ active, payload, label, formatter, hidePercentage, denominatorKey, excludePercentageFor = [] }) => {
  if (active && payload && payload.length) {
    const totalEntry = payload.find(e => e.name === 'Total');

    const firstPayload = payload[0]?.payload;
    const denominatorValue = (denominatorKey && firstPayload && firstPayload[denominatorKey] !== undefined)
      ? Number(firstPayload[denominatorKey])
      : null;

    const denominator = denominatorValue !== null
      ? denominatorValue
      : (totalEntry ? Number(totalEntry.value) || 0 : payload.reduce((sum, e) => sum + (Number(e.value) || 0), 0));

    return (
      <div className="ct-box">
        <p className="ct-label">{label}</p>
        <div className="ct-entries">
          {payload.map((entry, index) => {
            const value = Number(entry.value) || 0;
            const isTotal = entry.name === 'Total';
            const isExcluded = excludePercentageFor.includes(entry.name);
            const percentage = (!isTotal && !isExcluded && !hidePercentage && denominator > 0)
              ? ((value / denominator) * 100).toFixed(1)
              : null;

            const displayValue = formatter
              ? formatter(value, entry.name)
              : value.toLocaleString('en-IN');

            return (
              <div key={index} className="ct-row">
                <div className="ct-name-wrap">
                  <div className="ct-dot" style={{ backgroundColor: entry.color }} />
                  <span className="ct-name">{entry.name}:</span>
                </div>
                <div className="ct-value-wrap">
                  <span className="ct-value">{displayValue}</span>
                  {percentage !== null && (
                    <span className="ct-pct">({percentage}%)</span>
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

export default CustomTooltip;
