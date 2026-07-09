const COMMON = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function ThermometerIcon() {
  return (
    <svg {...COMMON} aria-hidden="true">
      <path d="M14 14.76V3.5a2 2 0 0 0-4 0v11.26a4 4 0 1 0 4 0Z" />
      <line x1="12" y1="7" x2="12" y2="13" />
    </svg>
  );
}

export function WindIcon() {
  return (
    <svg {...COMMON} aria-hidden="true">
      <path d="M3 8h9a2.5 2.5 0 1 0-2.5-2.5" />
      <path d="M3 12h13a2.5 2.5 0 1 1-2.5 2.5" />
      <path d="M3 16h7a2 2 0 1 1-2 2" />
    </svg>
  );
}

export function AlertTriangleIcon() {
  return (
    <svg {...COMMON} aria-hidden="true">
      <path d="M12 4 3 20h18L12 4Z" />
      <line x1="12" y1="10" x2="12" y2="14.5" />
      <circle cx="12" cy="17.2" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FlagIcon() {
  return (
    <svg {...COMMON} aria-hidden="true">
      <line x1="5" y1="21" x2="5" y2="4" />
      <path d="M5 5h13l-3.5 4L18 13H5" />
    </svg>
  );
}

export function SunIcon() {
  return (
    <svg {...COMMON} aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
