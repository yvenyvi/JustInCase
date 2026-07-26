const MS_3_YEARS = 3 * 365.25 * 24 * 60 * 60 * 1000;

export interface PeriodBounds {
  start: Date;
  end: Date;
  /** ISO string for Supabase .gte() filter */
  startISO: string;
  /** How many full days remain in this period */
  daysRemaining: number;
  /** e.g. "May 2026 – May 2029" */
  label: string;
}

export function getCurrentPeriod(periodStart: string | null | undefined, createdAt: string): PeriodBounds {
  const base = new Date(periodStart ?? createdAt);
  const now = Date.now();
  const elapsed = now - base.getTime();
  const periodsElapsed = Math.max(0, Math.floor(elapsed / MS_3_YEARS));

  const start = new Date(base.getTime() + periodsElapsed * MS_3_YEARS);
  const end = new Date(start.getTime() + MS_3_YEARS);
  const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now) / (24 * 60 * 60 * 1000)));

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return {
    start,
    end,
    startISO: start.toISOString(),
    daysRemaining,
    label: `${fmt(start)} – ${fmt(end)}`,
  };
}
