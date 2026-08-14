import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Activity,
  ArrowUpRight,
  Briefcase,
  Gavel,
  Clock,
  Loader2,
  Shield,
  FileText,
  MessageSquare,
  User as UserIcon,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import styles from './AdminDashboard.module.css';

interface KPIs {
  totalUsers: number;
  triageSessions: number;
  totalCases: number;
  verifiedAttorneys: number;
}

interface AuditRow {
  id: number;
  action_type: string;
  detail: string;
  created_at: string;
  userName: string;
}

interface DayCount {
  label: string;
  count: number;
}

const ACTION_ICON: Record<string, React.ReactNode> = {
  'User Login':      <Shield size={15} />,
  'Case Accepted':   <Briefcase size={15} />,
  'Case Rejected':   <Briefcase size={15} />,
  'Case Closed':     <Briefcase size={15} />,
  'Case Withdrawn':  <Briefcase size={15} />,
  'Triage Submitted':<FileText size={15} />,
  'Attorney Matched':<Gavel size={15} />,
  'Message Sent':    <MessageSquare size={15} />,
  'File Uploaded':   <FileText size={15} />,
  'Profile Updated': <UserIcon size={15} />,
};

const ACTION_COLOR: Record<string, string> = {
  'User Login':      '#3B82F6',
  'Case Accepted':   '#10B981',
  'Case Rejected':   '#EF4444',
  'Case Closed':     '#6B7280',
  'Case Withdrawn':  '#F59E0B',
  'Triage Submitted':'#8B5CF6',
  'Attorney Matched':'#0EA5E9',
  'Message Sent':    '#14B8A6',
  'File Uploaded':   '#F97316',
  'Profile Updated': '#6366F1',
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<KPIs>({ totalUsers: 0, triageSessions: 0, totalCases: 0, verifiedAttorneys: 0 });
  const [auditActivity, setAuditActivity] = useState<AuditRow[]>([]);
  const [registrationsByDay, setRegistrationsByDay] = useState<DayCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  const loadAll = useCallback(async () => {
    setIsLoading(true);

    const [
      { count: totalUsers },
      { count: triageSessions },
      { count: totalCases },
      { count: verifiedAttorneys },
      { data: recentLogs },
      { data: recentUsers },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('triage_assessments').select('*', { count: 'exact', head: true }),
      supabase.from('cases').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true })
        .eq('role', 'Volunteer Attorney').eq('status_verification', 'verified'),
      supabase.from('audit_logs')
        .select('id, action_type, detail, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('users')
        .select('id, created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true }),
    ]);

    setKpis({
      totalUsers: totalUsers ?? 0,
      triageSessions: triageSessions ?? 0,
      totalCases: totalCases ?? 0,
      verifiedAttorneys: verifiedAttorneys ?? 0,
    });

    // Build 7-day registration chart
    const days: DayCount[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-PH', { weekday: 'short' });
      const dateStr = d.toISOString().slice(0, 10);
      const count = (recentUsers ?? []).filter(u => u.created_at.slice(0, 10) === dateStr).length;
      days.push({ label, count });
    }
    setRegistrationsByDay(days);

    // Enrich audit logs with user names
    if (recentLogs && recentLogs.length > 0) {
      const userIds = [...new Set(recentLogs.map((l: any) => l.user_id).filter(Boolean))];
      const { data: userRows } = userIds.length
        ? await supabase.from('users').select('id, first_name, last_name').in('id', userIds)
        : { data: [] };
      const userMap: Record<string, string> = {};
      for (const u of userRows ?? []) {
        userMap[u.id] = [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Unknown';
      }
      setAuditActivity(recentLogs.map((l: any) => ({
        id: l.id,
        action_type: l.action_type,
        detail: l.detail,
        created_at: l.created_at,
        userName: userMap[l.user_id] ?? 'System',
      })));
    }

    setLastUpdated(new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadAll();

    const channel = supabase
      .channel('admin-audit-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, loadAll)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, loadAll)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadAll]);

  const maxReg = Math.max(...registrationsByDay.map(d => d.count), 1);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>System Analytics</h1>
          <p className={styles.subtitle}>Real-time overview of LAYA platform activity.</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.lastUpdate}>
            <Clock size={14} />
            {isLoading ? 'Loading...' : `Last updated: ${lastUpdated}`}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '6rem' }}>
          <Loader2 size={32} color="var(--color-primary)" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <>
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <div className={`${styles.kpiIcon} ${styles.blue}`}><Users size={20} /></div>
                <span className={styles.kpiTrend}><ArrowUpRight size={14} /> Live</span>
              </div>
              <div className={styles.kpiInfo}>
                <h3 className={styles.kpiValue}>{kpis.totalUsers.toLocaleString()}</h3>
                <p className={styles.kpiLabel}>Total Registered Users</p>
              </div>
              <div className={styles.miniChart}>
                {registrationsByDay.map((d, i) => (
                  <div key={i} className={styles.bar} style={{ height: `${(d.count / maxReg) * 40}px` }} />
                ))}
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <div className={`${styles.kpiIcon} ${styles.green}`}><Activity size={20} /></div>
                <span className={styles.kpiTrend}><ArrowUpRight size={14} /> Live</span>
              </div>
              <div className={styles.kpiInfo}>
                <h3 className={styles.kpiValue}>{kpis.triageSessions.toLocaleString()}</h3>
                <p className={styles.kpiLabel}>Triage Submissions</p>
              </div>
              <div className={styles.miniChart}>
                <svg viewBox="0 0 100 40" className={styles.sparkline}>
                  <path d="M0 35 L20 25 L40 30 L60 15 L80 20 L100 5" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <div className={`${styles.kpiIcon} ${styles.purple}`}><Briefcase size={20} /></div>
                <span className={styles.kpiTrend}><ArrowUpRight size={14} /> Live</span>
              </div>
              <div className={styles.kpiInfo}>
                <h3 className={styles.kpiValue}>{kpis.totalCases.toLocaleString()}</h3>
                <p className={styles.kpiLabel}>Total Cases Filed</p>
              </div>
              <div className={styles.miniChart}>
                {registrationsByDay.map((d, i) => (
                  <div key={i} className={styles.bar} style={{ height: `${(d.count / maxReg) * 40}px`, backgroundColor: '#8B5CF6' }} />
                ))}
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <div className={`${styles.kpiIcon} ${styles.orange}`}><Gavel size={20} /></div>
                <span className={styles.kpiTrend}><ArrowUpRight size={14} /> Live</span>
              </div>
              <div className={styles.kpiInfo}>
                <h3 className={styles.kpiValue}>{kpis.verifiedAttorneys.toLocaleString()}</h3>
                <p className={styles.kpiLabel}>Verified Attorneys</p>
              </div>
              <div className={styles.miniChart}>
                <div className={styles.uptimeFull}>
                  <div className={styles.uptimeFill} style={{ width: `${Math.min((kpis.verifiedAttorneys / Math.max(kpis.totalUsers, 1)) * 100 * 10, 100)}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.mainGrid}>
            <div className={styles.chartSection}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>User Registrations — Last 7 Days</h2>
              </div>
              <div className={styles.mainChartContainer}>
                <div className={styles.yAxis}>
                  <span>{maxReg}</span>
                  <span>{Math.round(maxReg * 0.75)}</span>
                  <span>{Math.round(maxReg * 0.5)}</span>
                  <span>{Math.round(maxReg * 0.25)}</span>
                  <span>0</span>
                </div>
                <div className={styles.chartContent}>
                  <div className={styles.gridLines}>
                    {[0,1,2,3,4].map(i => <div key={i} className={styles.gridLine} />)}
                  </div>
                  <div className={styles.mainBars}>
                    {registrationsByDay.map((d, i) => (
                      <div key={i} className={styles.mainBarWrapper}>
                        <div className={styles.mainBar} style={{ height: `${(d.count / maxReg) * 200}px` }}>
                          <div className={styles.barTooltip}>{d.count} users</div>
                        </div>
                        <span className={styles.xAxisLabel}>{d.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.activitySection}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Recent Activity</h2>
                <button className={styles.viewAllBtn} onClick={() => navigate('/admin/logs')}>View Logs</button>
              </div>
              <div className={styles.activityList}>
                {auditActivity.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    No activity yet.
                  </div>
                ) : (
                  auditActivity.map(item => (
                    <div key={item.id} className={styles.activityItem}>
                      <div
                        className={styles.activityIcon}
                        style={{ backgroundColor: `${ACTION_COLOR[item.action_type] ?? '#6B7280'}20`, color: ACTION_COLOR[item.action_type] ?? '#6B7280' }}
                      >
                        {ACTION_ICON[item.action_type] ?? <Activity size={15} />}
                      </div>
                      <div className={styles.activityInfo}>
                        <div className={styles.activityText}>
                          <span className={styles.activityUser}>{item.userName}</span>
                          <span className={styles.activityDetail}>{item.detail}</span>
                        </div>
                        <span className={styles.activityTime}>{fmt(item.created_at)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
