import React from 'react';
import { Clock, CheckCircle, AlertCircle, Loader2, Plus, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentPeriod } from '../../lib/proBonoperiod';
import ServiceLogModal from './ServiceLogModal';
import styles from './LegalDashboard.module.css';
import Skeleton from '../../components/Skeleton';

interface ServiceLog {
  id: string;
  case_id: string;
  description: string;
  hours: number;
  evidence_url: string | null;
  evidence_name: string | null;
  is_verified: boolean;
  verified_at: string | null;
  created_at: string;
  case: { title: string } | null;
}

interface ActiveCase {
  id: string;
  title: string;
  client_id: string | null;
}

const BADGE_MILESTONES = [
  { hours: 60, label: 'Community Hero', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { hours: 45, label: 'Silver Advocate', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  { hours: 30, label: 'Justice Defender', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { hours: 15, label: 'Community Advocate', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
];

function earnedBadge(totalHours: number) {
  return BADGE_MILESTONES.find(b => totalHours >= b.hours) ?? null;
}

const ServiceLogs: React.FC = () => {
  const { profile } = useAuth();
  const [logs, setLogs] = React.useState<ServiceLog[]>([]);
  const [activeCases, setActiveCases] = React.useState<ActiveCase[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showModal, setShowModal] = React.useState(false);

  const period = React.useMemo(
    () => profile ? getCurrentPeriod(profile.pro_bono_period_start, profile.created_at) : null,
    [profile?.pro_bono_period_start, profile?.created_at]
  );

  const fetchLogs = React.useCallback(async () => {
    if (!profile?.id || !period) return;
    setIsLoading(true);

    const [logsRes, casesRes] = await Promise.all([
      supabase
        .from('pro_bono_logs')
        .select('id, case_id, description, hours, evidence_url, evidence_name, is_verified, verified_at, created_at, case:case_id(title)')
        .eq('attorney_id', profile.id)
        .gte('created_at', period.startISO)
        .order('created_at', { ascending: false }),
      supabase
        .from('cases')
        .select('id, title, client_id')
        .eq('attorney_id', profile.id)
        .eq('status', 'In Progress'),
    ]);

    if (!logsRes.error && logsRes.data) setLogs(logsRes.data as any);
    if (!casesRes.error && casesRes.data) setActiveCases(casesRes.data as any);
    setIsLoading(false);
  }, [profile?.id, period]);

  React.useEffect(() => { fetchLogs(); }, [fetchLogs]);

  React.useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`service-logs-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pro_bono_logs', filter: `attorney_id=eq.${profile.id}` }, fetchLogs)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLogs, profile?.id]);

  const totalHours = logs.reduce((sum, l) => sum + Number(l.hours), 0);
  const verifiedHours = logs.filter(l => l.is_verified).reduce((sum, l) => sum + Number(l.hours), 0);
  const badge = earnedBadge(verifiedHours);
  const pct = Math.min(100, Math.round((verifiedHours / 60) * 100));

  return (
    <div className={styles.dashboard}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeading}>
          <h1 className={styles.title}>Service Logs</h1>
          <p className={styles.subtitle}>Your pro-bono hour records. Verified hours count toward your IBP 60-hour compliance.</p>
        </div>
        <button
          className={styles.primaryButton}
          onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={16} /> Log Service Hours
        </button>
      </div>

      {/* Summary cards */}
      <div className={styles.statGrid}>
        <div className={`${styles.card} ${styles.statCard}`}>
          <div className={styles.statTopRow}>
            <span className={styles.statLabel}>Total Hours Logged</span>
            <Clock size={20} color="var(--color-primary)" />
          </div>
          <div className={styles.statValue}>{totalHours.toFixed(1)}</div>
          <div className={styles.activityMeta}>{logs.length} service entr{logs.length === 1 ? 'y' : 'ies'}</div>
        </div>

        <div className={`${styles.card} ${styles.statCard} ${styles.statCardSuccess}`}>
          <div className={styles.statTopRow}>
            <span className={styles.statLabel}>Verified Hours</span>
            <CheckCircle size={20} color="var(--color-success)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className={styles.statValue}>{verifiedHours.toFixed(1)}</div>
            <span className={`${styles.badge} ${styles.badgeSuccess}`}>{pct}% of 60</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${pct}%`, transition: 'width 0.6s ease' }} />
          </div>
          <div className={styles.activityMeta}>Period: {period?.label} · {period?.daysRemaining}d left</div>
        </div>

        <div className={`${styles.card} ${styles.statCard}`} style={{ borderLeftColor: badge?.color ?? 'var(--color-border)' }}>
          <div className={styles.statTopRow}>
            <span className={styles.statLabel}>Current Badge</span>
            <AlertCircle size={20} color={badge?.color ?? 'var(--color-text-muted)'} />
          </div>
          {badge ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.8rem', borderRadius: '9999px', backgroundColor: badge.bg, color: badge.color, fontWeight: 700, fontSize: '0.875rem', width: 'fit-content' }}>
                {badge.label}
              </span>
              <div className={styles.activityMeta}>
                {verifiedHours >= 60 ? 'IBP compliant!' : `${(60 - verifiedHours).toFixed(1)} hrs to Community Hero`}
              </div>
            </div>
          ) : (
            <div className={styles.activityMeta} style={{ marginTop: '0.5rem' }}>
              Earn your first badge at 15 verified hours.
            </div>
          )}
        </div>
      </div>

      {/* Log table */}
      <div className={`${styles.card} ${styles.tableCard}`}>
        <div className={styles.cardHeader}>
          <h2 className={styles.sectionHeading}>All Entries</h2>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
                <Skeleton style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <Skeleton style={{ height: 16, width: '45%', borderRadius: 4, marginBottom: 6 }} />
                  <Skeleton style={{ height: 13, width: '70%', borderRadius: 4 }} />
                </div>
                <Skeleton style={{ height: 20, width: 60, borderRadius: 4 }} />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className={styles.emptyState} style={{ padding: '3rem' }}>
            No service logs yet. Click "Log Service Hours" to add your first entry.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {logs.map(log => (
              <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
                {/* Verified indicator */}
                <div style={{ flexShrink: 0, marginTop: '0.1rem' }}>
                  {log.is_verified
                    ? <CheckCircle size={18} color="var(--color-success)" />
                    : <Clock size={18} color="var(--color-warning)" />}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)', marginBottom: '0.2rem' }}>
                    {(log.case as any)?.title ?? 'Unknown Case'}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0 0 0.4rem', lineHeight: 1.6 }}>
                    {log.description}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                    <span>{new Date(log.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    {log.evidence_name && (
                      <a href={log.evidence_url!} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-primary)', textDecoration: 'none' }}>
                        <FileText size={12} /> {log.evidence_name}
                      </a>
                    )}
                  </div>
                </div>

                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text)' }}>{Number(log.hours).toFixed(1)}h</div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '9999px', backgroundColor: log.is_verified ? 'var(--color-success-bg)' : 'var(--color-warning-bg)', color: log.is_verified ? 'var(--color-success)' : 'var(--color-warning)' }}>
                    {log.is_verified ? 'Verified' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <ServiceLogModal
          activeCases={activeCases}
          onClose={() => setShowModal(false)}
          onLogged={() => { setShowModal(false); fetchLogs(); }}
        />
      )}
    </div>
  );
};

export default ServiceLogs;
