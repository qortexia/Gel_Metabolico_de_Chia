'use client';

type ProgressBarProps = {
  current: number;
  total: number;
};

export function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = Math.min(100, Math.round((current / total) * 100));
  return (
    <div
      className="h-1.5 w-full bg-neutral-200"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full bg-brand transition-all duration-300 ease-out" style={{ width: `${pct}%` }} />
    </div>
  );
}
