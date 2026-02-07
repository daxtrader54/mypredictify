export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer circle - football shape */}
      <circle cx="20" cy="20" r="18" fill="url(#grad)" stroke="hsl(var(--primary))" strokeWidth="2" />
      {/* Pentagon pattern - simplified football */}
      <path
        d="M20 8 L26.5 14 L24 22 L16 22 L13.5 14 Z"
        fill="hsl(var(--primary))"
        opacity="0.9"
      />
      {/* Crosshair lines */}
      <line x1="20" y1="2" x2="20" y2="10" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="30" x2="20" y2="38" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
      <line x1="2" y1="20" x2="10" y2="20" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="20" x2="38" y2="20" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
      {/* Inner target ring */}
      <circle cx="20" cy="20" r="11" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" opacity="0.5" />
      {/* Center dot */}
      <circle cx="20" cy="20" r="2.5" fill="hsl(var(--primary))" />
      <defs>
        <radialGradient id="grad" cx="0.3" cy="0.3" r="0.7">
          <stop offset="0%" stopColor="hsl(var(--primary) / 0.15)" />
          <stop offset="100%" stopColor="hsl(var(--primary) / 0.05)" />
        </radialGradient>
      </defs>
    </svg>
  );
}
