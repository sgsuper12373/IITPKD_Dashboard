export default function CampusClipart({ className = '', style = {} }) {
  return (
    <img
      className={className}
      style={{ objectFit: 'contain', ...style }}
      src="/IdentityTower.avif"
      alt="IIT Palakkad Identity Tower"
      aria-hidden="true"
      draggable={false}
    />
  );
}
