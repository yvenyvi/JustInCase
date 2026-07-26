import React from 'react';
import { Users, Briefcase, Clock, AlertCircle, ArrowRight, TrendingUp, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentPeriod } from '../../lib/proBonoperiod';
import styles from './LegalDashboard.module.css';

interface PendingCase {
  id: string;
  title: string;
  description: string;
  created_at: string;
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

    const [activeRes, pendingRes, logsRes] = await Promise.all([
      supabase
        .from('cases')
        .select('id', { count: 'exact', head: true })
        .eq('attorney_id', profile.id)
        .eq('status', 'In Progress'),
      supabase
        .from('cases')
        .select('id, title, description, created_at')
        .eq('attorney_id', profile.id)
        .eq('status', 'Pending Acceptance')
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases', filter: `attorney_id=eq.${profile.id}` }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData, profile?.id]);

  const firstName = profile?.first_name || 'Atty';

  return (
    <div className={styles.dashboard}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeading}>
          <h1 className={styles.title}>Overview</h1>
          <p className={styles.subtitle}>Welcome back, Atty. {firstName}. Narito ang iyong pro-bono impact ngayong buwan.</p>
        </div>
      </div>

      <div className={styles.statGrid}>
        <div className={`${styles.card} ${styles.statCard}`}>
          <div className={styles.statTopRow}>
            <span className={styles.statLabel}>Active Cases</span>
            <Briefcase size={20} color="var(--color-primary)" />
          </div>
          <div className={styles.statValue}>{isLoading ? <Loader2 size={20} className={styles.spin} /> : activeCaseCount}</div>
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
            <Loader2 size={20} className={styles.spin} color="var(--color-success)" />
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
            <span className={styles.statLabel}>New Matches</span>
            <Users size={20} color="var(--color-warning)" />
          </div>
          <div className={styles.statValue}>{isLoading ? <Loader2 size={20} className={styles.spin} /> : pendingCases.length}</div>
          <div className={styles.activityMeta}>Awaiting your response</div>
        </div>
      </div>

      <div className={styles.twoColumnGrid}>
        {/* Pending cases requiring action */}
        <div className={`${styles.card} ${styles.alertCard}`}>
          <div className={styles.alertTitleRow}>
            <AlertCircle size={24} color="var(--color-primary)" />
            <h2 className={styles.alertTitle}>Kailangang Aksyunan</h2>
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}>
              <Loader2 size={22} className={styles.spin} color="var(--color-primary)" />
            </div>
          ) : pendingCases.length === 0 ? (
            <p className={styles.alertText} style={{ color: 'var(--color-text-muted)' }}>
              Walang bagong case matches sa ngayon.
            </p>
          ) : (
            <>
              <p className={styles.alertText}>
                Mayroon kang <strong>{pendingCases.length}</strong> bagong Smart Triage match{pendingCases.length > 1 ? 'es' : ''} na naghihintay ng iyong review.
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
                      I-review ang Kaso <ArrowRight size={14} />
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
            Go to My Cases
          </button>
        </div>

        {/* Placeholder for recent activity */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.sectionHeading}>Kamakailang Aktibidad</h2>
          </div>
          <div className={`${styles.cardBody} ${styles.listStack}`}>
            {activeCaseCount === 0 && pendingCases.length === 0 && !isLoading ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', padding: '1rem 0' }}>
                Walang aktibidad pa. Tanggapin ang isang kaso para magsimula.
              </p>
            ) : (
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', padding: '1rem 0' }}>
                {activeCaseCount} active · {pendingCases.length} pending review
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
