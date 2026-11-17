export function NorthstarMark({ size = 40, id = "ns" }: { size?: number; id?: string }) {
  const gradient = `${id}-shield`;
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 64 74" aria-hidden="true">
      <path fill="#f3c2a4" d="M32 1.5 35.2 10h9.2L36.6 15.2 39.4 24 32 18.8 24.6 24l2.8-8.8L19.6 10h9.2Z" />
      <defs>
        <linearGradient id={gradient} x1="32" y1="20" x2="32" y2="72" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d9ccff" />
          <stop offset="1" stopColor="#5b4db8" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradient})`}
        d="M10 24.5 32 16l22 8.5v20.2c0 12.4-9.2 20.8-22 26.3-12.8-5.5-22-13.9-22-26.3Z"
      />
      <path fill="#f7f4ff" d="M32 30.5 42.5 46H35.5V58h-7V46H21.5Z" />
    </svg>
  );
}
