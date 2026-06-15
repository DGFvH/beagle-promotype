export default function Logo({ size = 36, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M10 42c4-2 10-3 22-3s18 1 22 3l-3 6H13l-3-6z"
        fill="#176b6b"
      />
      <path d="M13 48h38" stroke="#115b5b" strokeWidth="0.75" strokeOpacity="0.45" />
      <line x1="22" y1="48" x2="22" y2="16" stroke="#8aa0aa" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M22 18 L22 38 L8 40 Z" fill="#ffffff" stroke="#d8e0e5" strokeWidth="0.5" />
      <line x1="40" y1="48" x2="40" y2="12" stroke="#8aa0aa" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M40 14 L40 36 L54 38 Z" fill="#eef2f4" stroke="#d8e0e5" strokeWidth="0.5" />
      <path d="M40 12 L46 14 L40 16 Z" fill="#a15c16" />
    </svg>
  );
}

export function LogoMark({ size = 28 }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-lg border border-edge bg-surface-2"
      style={{ width: size + 10, height: size + 10 }}
    >
      <Logo size={size} />
    </div>
  );
}
