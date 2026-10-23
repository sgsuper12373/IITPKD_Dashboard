export default function CampusSkyline({ className = '', style = {} }) {
  return (
    <img
      className={className}
      style={{ objectFit: 'contain', ...style }}
      src="/summary_card_clipart.avif"
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
