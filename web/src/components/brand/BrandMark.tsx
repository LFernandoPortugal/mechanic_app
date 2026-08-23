import { useId } from "react";

type BrandMarkProps = {
  className?: string;
  title?: string;
};

export function BrandMark({ className = "h-10 w-10", title }: BrandMarkProps) {
  const id = useId().replaceAll(":", "");
  const orangeClip = `${id}-orange`;
  const graphiteClip = `${id}-graphite`;

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        <clipPath id={orangeClip}><path d="M8 0h56v64H0L64 0Z" /></clipPath>
        <clipPath id={graphiteClip}><path d="M0 0h64L0 64V0Z" /></clipPath>
      </defs>
      <path
        clipPath={`url(#${orangeClip})`}
        fill="var(--brand-orange)"
        d="m27 2 10 0 2 6 6 3 6-3 7 7-3 6 3 7 6 2v10l-6 2-3 7 3 6-7 7-6-3-7 3-2 6H27l-2-6-7-3-6 3-7-7 3-6-3-7-6-2V30l6-2 3-7-3-6 7-7 6 3 7-3 2-6Z"
      />
      <path
        clipPath={`url(#${graphiteClip})`}
        fill="var(--brand-steel)"
        d="m27 2 10 0 2 6 6 3 6-3 7 7-3 6 3 7 6 2v10l-6 2-3 7 3 6-7 7-6-3-7 3-2 6H27l-2-6-7-3-6 3-7-7 3-6-3-7-6-2V30l6-2 3-7-3-6 7-7 6 3 7-3 2-6Z"
      />
      <path fill="var(--brand-channel)" d="M17 15h27l7 7-7 7v-5H23c-2 0-3 1-3 3 0 1 1 2 3 3l18 6c5 2 8 5 8 10 0 7-5 11-12 11H16l-7-7 7-7v5h21c2 0 3-1 3-3 0-1-1-2-3-3l-18-6c-5-2-8-5-8-10 0-7 5-11 12-11Z" />
      <circle cx="18" cy="25" r="3.5" fill="var(--brand-orange)" stroke="var(--brand-channel)" strokeWidth="2" />
      <circle cx="42" cy="46" r="3.5" fill="var(--brand-steel)" stroke="var(--brand-channel)" strokeWidth="2" />
    </svg>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <BrandMark className={compact ? "h-7 w-7" : "h-9 w-9"} />
      <span className="font-black tracking-[-0.045em] text-foreground">SGA</span>
    </span>
  );
}
