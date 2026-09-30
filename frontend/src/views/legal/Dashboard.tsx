import React from 'react';
import { Users, Briefcase, Clock, AlertCircle, ArrowRight, TrendingUp, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentPeriod } from '../../lib/proBonoperiod';
import styles from './LegalDashboard.module.css';
import Skeleton from '../../components/Skeleton';

interface PendingCase {
  id: string;
  title: string;
  description: string;
  created_at: string;
  status?: string;
}

const BADGE_MILESTONES = [
  { hours: 60, label: 'Community Hero', color: '#f59e0b' },
  { hours: 45, label: 'Silver Advocate', color: '#6b7280' },
  { hours: 30, label: 'Justice Defender', color: '#3b82f6' },
  { hours: 15, label: 'Community Advocate', color: '#10b981' },
];

function DonutChart({ pct }: { pct: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" style={{ flexShrink: 0 }}>
      <circle cx="45" cy="45" r={r} fill="none" stroke="var(--color-background)" strokeWidth="10" />
      <circle
        cx="45" cy="45" r={r} fill="none"
        stroke="var(--color-success)" strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 45 45)"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text x="45" y="49" textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--color-text)">{pct}%</text>
    </svg>
  );
}

const Dashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeCaseCount, setActiveCaseCount] = React.useState(0);
  const [pendingCases, setPendingCases] = React.useState<PendingCase[]>([]);
  const [directRequests, setDirectRequests] = React.useState<PendingCase[]>([]);
  const [unassignedCases, setUnassignedCases] = React.useState<PendingCase[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [verifiedHours, setVerifiedHours] = React.useState(0);
  const [totalHours, setTotalHours] = React.useState(0);

  const period = React.useMemo(
    () => profile ? getCurrentPeriod(profile.pro_bono_period_start, profile.created_at) : null,
    [profile?.pro_bono_period_start, profile?.created_at]
  );

  const fetchData = React.useCallback(async () => {
    if (!profile?.id || !period) return;
    setIsLoading(true);

    const [activeRes, pendingRes, directRes, unassignedRes, logsRes] = await Promise.all([
      supabase
        .from('cases')
        .select('id', { count: 'exact', head: true })
        .eq('attorney_id', profile.id)
        .in('status', ['Pending Acceptance', 'In Progress', 'Hearing Scheduled', 'Demand Sent']),
      supabase
        .from('cases')
        .select('id, title, description, created_at, status')
        .eq('attorney_id', profile.id)
        .eq('status', 'Pending Acceptance')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('cases')
        .select('id, title, description, created_at, status')
        .eq('attorney_id', profile.id)
        .eq('status', 'Pending Triage')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('cases')
        .select('id, title, description, created_at, status')
        .is('attorney_id', null)
        .eq('status', 'Pending Triage')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('pro_bono_logs')
        .select('hours, is_verified')
        .eq('attorney_id', profile.id)
        .gte('created_at', period.startISO),
    ]);

    setActiveCaseCount(activeRes.count || 0);
    if (!pendingRes.error && pendingRes.data) setPendingCases(pendingRes.data);
    if (!directRes.error && directRes.data) setDirectRequests(directRes.data);
    if (!unassignedRes.error && unassignedRes.data) setUnassignedCases(unassignedRes.data);
    if (!logsRes.error && logsRes.data) {
      const total = logsRes.data.reduce((s: number, l: any) => s + Number(l.hours), 0);
      const verified = logsRes.data.filter((l: any) => l.is_verified).reduce((s: number, l: any) => s + Number(l.hours), 0);
      setTotalHours(total);
      setVerifiedHours(verified);
    }
    setIsLoading(false);
  }, [profile?.id, period]);

  React.useEffect(() => {
    fetchData();

    if (!profile?.id) return;
    const channel = supabase
      .channel(`legal-dashboard-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases' }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData, profile?.id]);

  const firstName = profile?.first_name || 'Atty';

  return (
    <div className={styles.dashboard}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeading}>
          <h1 className={styles.title}>Attorney workspace</h1>
          <p className={styles.subtitle}>Welcome back, Atty. {firstName}. Review client requests, manage active cases, and access legal research.</p>
        </div>
      </div>

      <div className={styles.statGrid}>
        <div className={`${styles.card} ${styles.statCard}`}>
          <div className={styles.statTopRow}>
            <span className={styles.statLabel}>Active Cases</span>
            <Briefcase size={20} color="var(--color-primary)" />
          </div>
          <div className={styles.statValue}>{isLoading ? <Skeleton style={{ height: 28, width: 44, borderRadius: 4, display: 'inline-block' }} /> : activeCaseCount}</div>
          <div className={styles.statMeta} style={{ color: 'var(--color-success)' }}>
            <TrendingUp size={16} /> In Progress
          </div>
        </div>

        <div className={`${styles.card} ${styles.statCard} ${styles.statCardSuccess}`}>
          <div className={styles.statTopRow}>
            <span className={styles.statLabel}>Pro-Bono Hours</span>
            <Clock size={20} color="var(--color-success)" />
          </div>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 0' }}>
              <Skeleton style={{ width: 50, height: 50, borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>
                <Skeleton style={{ height: 24, width: 70, borderRadius: 4, marginBottom: 6 }} />
                <Skeleton style={{ height: 12, width: 120, borderRadius: 4 }} />
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <DonutChart pct={Math.min(100, Math.round((verifiedHours / 60) * 100))} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                    <span className={styles.statValue}>{verifiedHours.toFixed(1)}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>/ 60h</span>
                  </div>
                  <div className={styles.activityMeta} style={{ marginTop: '0.2rem' }}>
                    {totalHours.toFixed(1)}h logged · {verifiedHours.toFixed(1)}h verified
                  </div>
                  {(() => {
                    const badge = BADGE_MILESTONES.find(b => verifiedHours >= b.hours);
                    return badge ? (
                      <span style={{ display: 'inline-flex', marginTop: '0.5rem', padding: '0.25rem 0.65rem', borderRadius: '9999px', backgroundColor: `${badge.color}20`, color: badge.color, fontWeight: 700, fontSize: '0.72rem' }}>
                        {badge.label}
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                        {(15 - verifiedHours) > 0 ? `${(15 - verifiedHours).toFixed(1)}h to first badge` : ''}
                      </span>
                    );
                  })()}
                </div>
              </div>
              <div className={styles.activityMeta} style={{ marginTop: '0.5rem' }}>
                Period: {period?.label} · {period?.daysRemaining}d left
              </div>
            </>
          )}
        </div>

        <div className={`${styles.card} ${styles.statCard} ${styles.statCardWarning}`}>
          <div className={styles.statTopRow}>
            <span className={styles.statLabel}>Case Requests</span>
            <Users size={20} color="var(--color-warning)" />
          </div>
          <div className={styles.statValue}>{isLoading ? <Skeleton style={{ height: 28, width: 44, borderRadius: 4, display: 'inline-block' }} /> : pendingCases.length + directRequests.length + unassignedCases.length}</div>
          <div className={styles.activityMeta}>Direct and open-network cases</div>
        </div>
      </div>

      <div className={styles.requestOverview}>
        {/* Pending cases requiring action */}
        <div className={`${styles.card} ${styles.alertCard}`}>
          <div className={styles.alertTitleRow}>
            <AlertCircle size={24} color="var(--color-primary)" />
            <h2 className={styles.alertTitle}>Requests to review</h2>
          </div>

          {isLoading ? (
            <div className={styles.alertList}>
              {[1, 2].map((i) => (
                <div key={i} className={styles.alertItem} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <Skeleton style={{ height: 18, width: '60%', borderRadius: 4 }} />
                  <Skeleton style={{ height: 13, width: '85%', borderRadius: 4 }} />
                </div>
              ))}
            </div>
          ) : pendingCases.length === 0 ? (
            <p className={styles.alertText} style={{ color: 'var(--color-text-muted)' }}>
              No new case requests need your review right now.
            </p>
          ) : (
            <>
              <p className={styles.alertText}>
                <strong>{pendingCases.length}</strong> case request{pendingCases.length === 1 ? '' : 's'} are waiting for your review.
              </p>
              <div className={styles.alertList}>
                {pendingCases.map((c) => (
                  <div key={c.id} className={styles.alertItem}>
                    <div className={styles.alertItemTop}>
                      <span className={styles.alertType}>{c.title}</span>
                      <span className={styles.alertMatch} style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {new Date(c.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <button
                      className={styles.linkButton}
                      style={{ color: 'var(--color-primary)', fontSize: '0.8rem' }}
                      onClick={() => navigate('/legal/cases')}
                    >
                      Review request <ArrowRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          <button
            className={styles.primaryButton}
            style={{ width: '100%', marginTop: '1.5rem' }}
            onClick={() => navigate('/legal/cases')}
          >
            Open case queue
          </button>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
        {[
          { title: 'Direct requests', items: directRequests, empty: 'No direct requests at the moment.' },
          { title: 'Open-network cases', items: unassignedCases, empty: 'No open-network cases are available right now.' },
        ].map(section => (
          <section key={section.title} className={styles.card} aria-label={section.title}>
            <div className={styles.cardHeader}><h2 className={styles.sectionHeading}>{section.title}</h2><button className={styles.linkButton} onClick={() => navigate('/legal/cases')}>View all <ArrowRight size={14} /></button></div>
            {isLoading ? <Skeleton style={{ height: 56, borderRadius: 8 }} /> : section.items.length === 0 ? <p style={{ color: 'var(--color-text-muted)', margin: '.75rem 0' }}>{section.empty}</p> : (
              <div className={styles.listStack}>{section.items.map(item => <div key={item.id} className={styles.alertItem}>
                <div className={styles.alertItemTop}><span className={styles.alertType}>{item.title}</span><span className={styles.alertMatch} style={{ fontSize: '.75rem', color: 'var(--color-text-muted)' }}>{new Date(item.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span></div>
                <button className={styles.linkButton} onClick={() => navigate('/legal/cases')}>{section.title === 'Open-network cases' ? 'Browse available cases' : 'Review request'} <ArrowRight size={14} /></button>
              </div>)}</div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
