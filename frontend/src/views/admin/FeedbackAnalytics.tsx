import { useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  CheckCircle2,
  MessageSquareText,
  TrendingUp,
  Clock,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  MinusCircle,
  Star,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import styles from './FeedbackAnalytics.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CaseRow {
  id: string;
  status: string;
  client_feedback: string | null;   // 'Nalutas' | 'Bahagi lang' | 'Hindi nalutas' | null
  feedback_rating: number | null;   // 1–5 star rating
  closed_at: string | null;
  created_at: string;
  attorney_id: string | null;
  client_id: string | null;
}

interface AttorneyStats {
  id: string;
  name: string;
  total: number;
  won: number;
  lost: number;
  withdrawn: number;
  dropped: number;
  resolutionRate: number;
  nalutas: number;
  bahagiBa: number;
  hindiNalutas: number;
  feedbackCount: number;
  ratingSum: number;
  ratingCount: number;
}

interface FeedbackEntry {
  caseId: string;
  resolution: string;
  rating: number | null;
  closedAt: string;
  clientName: string;
  attorneyName: string;
}

interface OutcomeCount {
  label: string;
  count: number;
  color: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CLOSED_STATUSES  = ['Closed - Won', 'Closed - Lost'];
const TERMINAL_STATUSES = ['Closed - Won', 'Closed - Lost', 'Withdrawn', 'Dropped'];

const OUTCOME_COLORS: Record<string, string> = {
  'Closed - Won':       '#10B981',
  'Closed - Lost':      '#EF4444',
  'Withdrawn':          '#F59E0B',
  'Dropped':            '#94A3B8',
  'In Progress':        '#3B82F6',
  'Pending Triage':     '#8B5CF6',
  'Pending Acceptance': '#0EA5E9',
};

/** Display config for each client_feedback value */
const RESOLUTION_CONFIG: Record<string, { label: string; color: string; bg: string; icon: ReactNode }> = {
  'Nalutas':        { label: 'Nalutas (Resolved)',          color: '#10B981', bg: '#ECFDF5', icon: <ThumbsUp  size={13} /> },
  'Bahagi lang':    { label: 'Bahagi lang (Partial)',        color: '#F59E0B', bg: '#FFFBEB', icon: <MinusCircle size={13} /> },
  'Hindi nalutas':  { label: 'Hindi nalutas (Unresolved)',   color: '#EF4444', bg: '#FEF2F2', icon: <ThumbsDown size={13} /> },
};

type FeedbackFilter = 'all' | 'Nalutas' | 'Bahagi lang' | 'Hindi nalutas';

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });

// ─── Main component ───────────────────────────────────────────────────────────

const FeedbackAnalytics = () => {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [feedbackFilter, setFeedbackFilter] = useState<FeedbackFilter>('all');

  const load = useCallback(async () => {
    setIsLoading(true);

    const { data: caseData } = await supabase
      .from('cases')
      .select('id, status, client_feedback, feedback_rating, closed_at, created_at, attorney_id, client_id')
      .order('created_at', { ascending: false });

    const rows: CaseRow[] = caseData ?? [];
    setCases(rows);

    // Collect unique user IDs
    const ids = [...new Set([
      ...rows.map(r => r.attorney_id),
      ...rows.map(r => r.client_id),
    ].filter((id): id is string => Boolean(id)))];

    if (ids.length) {
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', ids);

      const map: Record<string, string> = {};
      for (const u of users ?? []) {
        map[u.id] = [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Unknown';
      }
      setUserMap(map);
    }

    setLastUpdated(new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel('admin-feedback-analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  // ── Derived stats ──────────────────────────────────────────────────────────

  const total         = cases.length;
  const closedCases   = cases.filter(c => CLOSED_STATUSES.includes(c.status));
  const terminalCases = cases.filter(c => TERMINAL_STATUSES.includes(c.status));
  const withFeedback  = cases.filter(c => Boolean(c.client_feedback));

  const nalutasCount       = withFeedback.filter(c => c.client_feedback === 'Nalutas').length;
  const bahagiBaCount      = withFeedback.filter(c => c.client_feedback === 'Bahagi lang').length;
  const hindiNalutasCount  = withFeedback.filter(c => c.client_feedback === 'Hindi nalutas').length;

  const resolutionRate = total > 0
    ? Math.round((closedCases.length / total) * 100)
    : 0;

  const feedbackCoverage = terminalCases.length > 0
    ? Math.round((withFeedback.length / terminalCases.length) * 100)
    : 0;

  const clientResolvedRate = withFeedback.length > 0
    ? Math.round((nalutasCount / withFeedback.length) * 100)
    : 0;

  const withRating = cases.filter(c => c.feedback_rating != null && c.client_feedback != null);
  const avgRating = withRating.length > 0
    ? (withRating.reduce((s, c) => s + (c.feedback_rating ?? 0), 0) / withRating.length).toFixed(1)
    : null;

  // Outcome breakdown chart
  const outcomeCounts = Object.entries(
    cases.reduce<Record<string, number>>((acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count, color: OUTCOME_COLORS[label] ?? '#94A3B8' })) as OutcomeCount[];

  const maxOutcome = Math.max(...outcomeCounts.map(o => o.count), 1);

  // Per-attorney stats
  const attorneyStatsMap: Record<string, AttorneyStats> = {};
  for (const c of cases) {
    if (!c.attorney_id) continue;
    const id = c.attorney_id;
    if (!attorneyStatsMap[id]) {
      attorneyStatsMap[id] = {
        id,
        name: userMap[id] ?? 'Unknown',
        total: 0, won: 0, lost: 0, withdrawn: 0, dropped: 0,
        resolutionRate: 0,
        nalutas: 0, bahagiBa: 0, hindiNalutas: 0, feedbackCount: 0,
        ratingSum: 0, ratingCount: 0,
      };
    }
    const s = attorneyStatsMap[id];
    s.total++;
    if (c.status === 'Closed - Won')  s.won++;
    if (c.status === 'Closed - Lost') s.lost++;
    if (c.status === 'Withdrawn')     s.withdrawn++;
    if (c.status === 'Dropped')       s.dropped++;
    if (c.client_feedback === 'Nalutas')       { s.nalutas++;      s.feedbackCount++; }
    if (c.client_feedback === 'Bahagi lang')   { s.bahagiBa++;     s.feedbackCount++; }
    if (c.client_feedback === 'Hindi nalutas') { s.hindiNalutas++; s.feedbackCount++; }
    if (c.feedback_rating != null) { s.ratingSum += c.feedback_rating; s.ratingCount++; }
  }

  const attorneyStats = Object.values(attorneyStatsMap).map(s => {
    const closed   = s.won + s.lost;
    const terminal = closed + s.withdrawn + s.dropped;
    return {
      ...s,
      name: userMap[s.id] ?? s.name,
      resolutionRate: terminal > 0 ? Math.round((closed / terminal) * 100) : 0,
    };
  }).sort((a, b) => b.total - a.total);

  // Feedback entries filtered by tab
  const feedbackEntries: FeedbackEntry[] = cases
    .filter(c =>
      Boolean(c.client_feedback) &&
      (feedbackFilter === 'all' || c.client_feedback === feedbackFilter)
    )
    .map(c => ({
      caseId: c.id,
      resolution: c.client_feedback!,
      rating: c.feedback_rating ?? null,
      closedAt: c.closed_at ?? c.created_at,
      clientName: userMap[c.client_id ?? ''] ?? 'Unknown client',
      attorneyName: userMap[c.attorney_id ?? ''] ?? 'No attorney',
    }));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Feedback &amp; Resolution</h1>
          <p className={styles.subtitle}>Service quality metrics across all cases.</p>
        </div>
        <div className={styles.lastUpdate}>
          <Clock size={14} />
          {isLoading ? 'Loading…' : `Updated: ${lastUpdated}`}
        </div>
      </div>

      {isLoading ? (
        <div className={styles.centered}>
          <Loader2 size={32} color="var(--color-primary)" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className={styles.kpiGrid}>

            {/* Case Resolution Rate */}
            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <div className={`${styles.kpiIcon} ${styles.green}`}>
                  <CheckCircle2 size={20} />
                </div>
                <span className={`${styles.kpiBadge} ${resolutionRate >= 50 ? styles.badgeGood : styles.badgeWarn}`}>
                  {resolutionRate}%
                </span>
              </div>
              <div>
                <p className={styles.kpiValue}>{closedCases.length}</p>
                <p className={styles.kpiLabel}>Cases Closed</p>
              </div>
              <div className={styles.kpiProgress}>
                <div
                  className={styles.kpiProgressFill}
                  style={{ width: `${resolutionRate}%`, background: resolutionRate >= 50 ? '#10B981' : '#F59E0B' }}
                />
              </div>
            </div>

            {/* Feedback Coverage */}
            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <div className={`${styles.kpiIcon} ${styles.blue}`}>
                  <MessageSquareText size={20} />
                </div>
                <span className={`${styles.kpiBadge} ${feedbackCoverage >= 40 ? styles.badgeGood : styles.badgeNeutral}`}>
                  {feedbackCoverage}%
                </span>
              </div>
              <div>
                <p className={styles.kpiValue}>{withFeedback.length}</p>
                <p className={styles.kpiLabel}>Feedback Received</p>
              </div>
              <div className={styles.kpiProgress}>
                <div
                  className={styles.kpiProgressFill}
                  style={{ width: `${feedbackCoverage}%`, background: '#3B82F6' }}
                />
              </div>
            </div>

            {/* Avg star rating */}
            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <div className={`${styles.kpiIcon} ${styles.amber}`}>
                  <Star size={20} />
                </div>
                <span className={`${styles.kpiBadge} ${styles.badgeNeutral}`}>/ 5.0</span>
              </div>
              <div>
                <p className={styles.kpiValue}>{avgRating ?? '—'}</p>
                <p className={styles.kpiLabel}>Avg Star Rating</p>
              </div>
              {avgRating ? (
                <div style={{ display: 'flex', gap: '2px' }}>
                  {[1,2,3,4,5].map(n => (
                    <Star
                      key={n}
                      size={14}
                      fill={n <= Math.round(parseFloat(avgRating)) ? '#F59E0B' : 'none'}
                      color={n <= Math.round(parseFloat(avgRating)) ? '#F59E0B' : '#E2E8F0'}
                    />
                  ))}
                  <span style={{ fontSize: '0.7rem', color: '#94A3B8', marginLeft: '0.25rem' }}>
                    ({withRating.length})
                  </span>
                </div>
              ) : (
                <div className={styles.kpiProgress}>
                  <div className={styles.kpiProgressFill} style={{ width: '0%', background: '#F59E0B' }} />
                </div>
              )}
            </div>

            {/* Total cases */}
            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <div className={`${styles.kpiIcon} ${styles.purple}`}>
                  <TrendingUp size={20} />
                </div>
                <span className={`${styles.kpiBadge} ${styles.badgeNeutral}`}>Total</span>
              </div>
              <div>
                <p className={styles.kpiValue}>{total}</p>
                <p className={styles.kpiLabel}>Cases on Platform</p>
              </div>
              <div className={styles.kpiProgress}>
                <div className={styles.kpiProgressFill} style={{ width: '100%', background: '#8B5CF6' }} />
              </div>
            </div>
          </div>

          {/* Outcome chart + Attorney table */}
          <div className={styles.mainGrid}>

            {/* Case Outcome Breakdown */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Case Outcome Breakdown</h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {total} total
                </span>
              </div>
              <div className={styles.outcomeList}>
                {outcomeCounts.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No cases yet.</p>
                ) : (
                  outcomeCounts.map(o => (
                    <div key={o.label} className={styles.outcomeRow}>
                      <div className={styles.outcomeRowTop}>
                        <span className={styles.outcomeLabel}>
                          <span className={styles.outcomeDot} style={{ background: o.color }} />
                          {o.label}
                        </span>
                        <span className={styles.outcomeCount}>
                          {o.count} &nbsp;
                          <span style={{ color: '#94A3B8', fontWeight: 400 }}>
                            ({Math.round((o.count / total) * 100)}%)
                          </span>
                        </span>
                      </div>
                      <div className={styles.outcomeTrack}>
                        <div
                          className={styles.outcomeFill}
                          style={{ width: `${(o.count / maxOutcome) * 100}%`, background: o.color }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Client Resolution mini-bar */}
              {withFeedback.length > 0 && (
                <div style={{ borderTop: '1px solid #E2E8F0', padding: '1rem 1.25rem' }}>
                  <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.625rem' }}>
                    Client Resolution Feedback ({withFeedback.length} responses)
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {[
                      { key: 'Nalutas',       count: nalutasCount,      color: '#10B981', bg: '#ECFDF5' },
                      { key: 'Bahagi lang',   count: bahagiBaCount,     color: '#F59E0B', bg: '#FFFBEB' },
                      { key: 'Hindi nalutas', count: hindiNalutasCount, color: '#EF4444', bg: '#FEF2F2' },
                    ].map(r => (
                      <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.65rem', borderRadius: '99px', backgroundColor: r.bg, border: `1px solid ${r.color}30` }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: r.color }}>{r.key}</span>
                        <span style={{ fontSize: '0.78rem', color: r.color, fontWeight: 700 }}>{r.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Attorney Performance */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Attorney Performance</h2>
              </div>
              {attorneyStats.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No attorney-assigned cases yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Attorney</th>
                        <th style={{ textAlign: 'center' }}>Won</th>
                        <th style={{ textAlign: 'center' }}>Lost</th>
                        <th style={{ textAlign: 'center' }}>Rate</th>
                        <th style={{ textAlign: 'center' }}>Client Feedback</th>
                        <th style={{ textAlign: 'center' }}>Stars</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attorneyStats.map(a => (
                        <tr key={a.id}>
                          <td>
                            <span className={styles.attorneyName}>{a.name}</span>
                            <br />
                            <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                              {a.total} case{a.total !== 1 ? 's' : ''}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={styles.pillWon}>{a.won}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={styles.pillLost}>{a.lost}</span>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>
                            {a.resolutionRate}%
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {a.feedbackCount === 0 ? (
                              <span style={{ color: '#CBD5E1', fontSize: '0.75rem' }}>—</span>
                            ) : (
                              <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                {a.nalutas > 0 && (
                                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10B981', background: '#ECFDF5', padding: '0.1rem 0.4rem', borderRadius: '99px' }}>
                                    ✓{a.nalutas}
                                  </span>
                                )}
                                {a.bahagiBa > 0 && (
                                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#F59E0B', background: '#FFFBEB', padding: '0.1rem 0.4rem', borderRadius: '99px' }}>
                                    ◑{a.bahagiBa}
                                  </span>
                                )}
                                {a.hindiNalutas > 0 && (
                                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#EF4444', background: '#FEF2F2', padding: '0.1rem 0.4rem', borderRadius: '99px' }}>
                                    ✗{a.hindiNalutas}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {a.ratingCount === 0 ? (
                              <span style={{ color: '#CBD5E1', fontSize: '0.75rem' }}>—</span>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                <div style={{ display: 'flex', gap: '1px' }}>
                                  {[1,2,3,4,5].map(n => (
                                    <Star
                                      key={n}
                                      size={12}
                                      fill={n <= Math.round(a.ratingSum / a.ratingCount) ? '#F59E0B' : 'none'}
                                      color={n <= Math.round(a.ratingSum / a.ratingCount) ? '#F59E0B' : '#E2E8F0'}
                                    />
                                  ))}
                                </div>
                                <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                                  {(a.ratingSum / a.ratingCount).toFixed(1)}
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Feedback entries */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Client Feedback Entries</h2>
            </div>

            {/* Filter tabs */}
            <div className={styles.tabs}>
              {([
                { key: 'all',           label: `All (${withFeedback.length})` },
                { key: 'Nalutas',       label: `Nalutas (${nalutasCount})` },
                { key: 'Bahagi lang',   label: `Bahagi lang (${bahagiBaCount})` },
                { key: 'Hindi nalutas', label: `Hindi nalutas (${hindiNalutasCount})` },
              ] as { key: FeedbackFilter; label: string }[]).map(tab => (
                <button
                  key={tab.key}
                  className={`${styles.tab} ${feedbackFilter === tab.key ? styles.active : ''}`}
                  onClick={() => setFeedbackFilter(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {feedbackEntries.length === 0 ? (
              <div className={styles.noFeedback}>
                <MessageSquareText size={36} className={styles.noFeedbackIcon} />
                {withFeedback.length === 0
                  ? 'No feedback submitted yet.'
                  : 'No entries match this filter.'}
              </div>
            ) : (
              <div className={styles.feedbackList}>
                {feedbackEntries.map(f => {
                  const cfg = RESOLUTION_CONFIG[f.resolution] ?? {
                    label: f.resolution,
                    color: '#64748B',
                    bg: '#F8FAFC',
                    icon: <MessageSquareText size={13} />,
                  };
                  return (
                    <div key={f.caseId} className={styles.feedbackEntry}>
                      <div className={styles.feedbackEntryTop}>
                        <span className={styles.feedbackMeta}>
                          {f.clientName} → {f.attorneyName}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                            fontSize: '0.75rem', fontWeight: 700,
                            color: cfg.color, background: cfg.bg,
                            padding: '0.2rem 0.6rem', borderRadius: '99px',
                            border: `1px solid ${cfg.color}30`,
                          }}>
                            {cfg.icon}
                            {cfg.label}
                          </span>
                          {f.rating != null && (
                            <div style={{ display: 'flex', gap: '1px', alignItems: 'center' }}>
                              {[1,2,3,4,5].map(n => (
                                <Star
                                  key={n}
                                  size={13}
                                  fill={n <= f.rating! ? '#F59E0B' : 'none'}
                                  color={n <= f.rating! ? '#F59E0B' : '#E2E8F0'}
                                />
                              ))}
                            </div>
                          )}
                          <span className={styles.feedbackMeta}>{fmt(f.closedAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default FeedbackAnalytics;
