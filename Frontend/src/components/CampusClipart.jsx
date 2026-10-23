export default function CampusClipart({ className = '', style = {} }) {
  return (
    <img
      className={className}
      style={{ objectFit: 'contain', ...style }}
      src="/sidebar_clipart.avif"
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
