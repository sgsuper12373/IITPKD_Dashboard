import './SkeletonLoader.css';

// Heights for the mock bar-chart bars (% of container height)
const BAR_HEIGHTS = [55, 75, 40, 88, 62, 95, 48, 72, 58, 82];

function SectionSkeleton({ cards = 4, charts = 1 }) {
  return (
    <div className="sk-wrapper">
      {/* Stat-card placeholders */}
      <div
        className="sk-cards"
        style={{ gridTemplateColumns: `repeat(${Math.min(cards, 4)}, 1fr)` }}
      >
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="sk-card">
            <div className="sk-block sk-card-icon" />
            <div className="sk-block sk-line sk-line-sm" />
            <div className="sk-block sk-line sk-line-lg" />
          </div>
        ))}
      </div>

      {/* Chart-section placeholders */}
      {Array.from({ length: charts }).map((_, i) => (
        <div key={i} className="sk-chart-box">
          <div className="sk-chart-header">
            <div className="sk-block sk-line sk-line-title" />
            <div className="sk-block sk-line sk-line-md sk-line-55" />
          </div>
          <div className="sk-bars">
            {BAR_HEIGHTS.map((h, j) => (
              <div
                key={j}
                className="sk-block sk-bar"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default SectionSkeleton;
