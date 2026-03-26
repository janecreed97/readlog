export default function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Pediment */}
      <polygon points="16,2 4,9 28,9" fill="#2C2926" />
      {/* Architrave */}
      <rect x="4" y="9" width="24" height="2.5" fill="#2C2926" />
      {/* Columns */}
      <rect x="5"   y="11.5" width="2.5" height="10" fill="#2C2926" />
      <rect x="10"  y="11.5" width="2.5" height="10" fill="#2C2926" />
      <rect x="14.75" y="11.5" width="2.5" height="10" fill="#2C2926" />
      <rect x="19.5" y="11.5" width="2.5" height="10" fill="#2C2926" />
      <rect x="24.5" y="11.5" width="2.5" height="10" fill="#2C2926" />
      {/* Stylobate */}
      <rect x="3"  y="21.5" width="26" height="2"   fill="#2C2926" />
      <rect x="1.5" y="23.5" width="29" height="2"  fill="#2C2926" />
      <rect x="0"  y="25.5" width="32" height="2.5" fill="#2C2926" />
    </svg>
  )
}
