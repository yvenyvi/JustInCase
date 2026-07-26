import React from 'react';
import {
  Bell, CheckCheck, CheckCircle, XCircle, Loader2,
  BriefcaseIcon, MessageSquare, Info, ExternalLink, Clock, Star,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { auditService } from '../../services/auditService';
import styles from './PublicNotifications.module.css';

interface Notification {
  id: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

interface ProBonoLog {
  id: string;
  attorney_id: string;
  case_id: string;
  description: string;
  hours: number;
  is_verified: boolean;
  verified_at: string | null;
  attorney: { first_name: string; last_name: string } | null;
  case: { title: string } | null;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  case:    <BriefcaseIcon size={16} />,
  message: <MessageSquare size={16} />,
  rating:  <Star size={16} />,
  hours:   <Clock size={16} />,
  default: <Info size={16} />,
};

const COLOR_MAP: Record<string, string> = {
  case:    '#3B82F6',
  message: '#10B981',
  rating:  '#F59E0B',
  hours:   '#8B5CF6',
  default: '#6366F1',
};

const typeFromTitle = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('rate') || t.includes('rating')) return 'rating';
  if (t.includes('hour') || t.includes('service')) return 'hours';
  if (t.includes('case') || t.includes('kaso')) return 'case';
  if (t.includes('message') || t.includes('mensahe')) return 'message';
  return 'default';
};

const fmt = (iso: string) => {
  const date = new Date(iso);
  const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMins < 1)  return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24)  return `${diffHrs}h ago`;
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
};

const PublicNotifications: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [pendingLogs, setPendingLogs] = React.useState<ProBonoLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [verifying, setVerifying] = React.useState<string | null>(null);
  const [markingAll, setMarkingAll] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    if (!profile?.id) return;
    setIsLoading(true);

    const [notifRes, casesRes] = await Promise.all([
      supabase
        .from('notifications')
        .select('id, title, body, link, is_read, created_at')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('cases')
        .select('id')
        .eq('client_id', profile.id),
    ]);

    if (!notifRes.error && notifRes.data) setNotifications(notifRes.data as Notification[]);

    const caseIds = (casesRes.data ?? []).map((c: { id: string }) => c.id);
    if (caseIds.length > 0) {
      const logsRes = await supabase
        .from('pro_bono_logs')
        .select('id, attorney_id, case_id, description, hours, is_verified, verified_at, attorney:attorney_id(first_name, last_name), case:case_id(title)')
        .eq('is_verified', false)
        .in('case_id', caseIds);
      if (!logsRes.error && logsRes.data) setPendingLogs(logsRes.data as any);
    }

    setIsLoading(false);
  }, [profile?.id]);

  React.useEffect(() => {
    fetchData();
    if (!profile?.id) return;
    const ch = supabase
      .channel(`notifications-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchData, profile?.id]);

  const handleVerify = async (logId: string, confirm: boolean) => {
    setVerifying(logId);
    const log = pendingLogs.find(l => l.id === logId);
    const update: Record<string, unknown> = { is_verified: confirm };
    if (confirm) update.verified_at = new Date().toISOString();
    if (confirm) update.verified_by = profile?.id;

    await supabase.from('pro_bono_logs').update(update).eq('id', logId);

    if (log?.attorney_id) {
      const caseTitle = (log.case as any)?.title ?? 'your case';
      const hours = Number(log.hours).toFixed(1);
      const attyName = log.attorney
        ? `Atty. ${(log.attorney as any).first_name} ${(log.attorney as any).last_name}`
        : 'attorney';
      await supabase.from('notifications').insert({
        user_id: log.attorney_id,
        title: confirm ? 'Service Hours Confirmed' : 'Service Hours Disputed',
        body: confirm
          ? `Your logged ${hours} hour${Number(hours) !== 1 ? 's' : ''} on "${caseTitle}" have been confirmed by the client.`
          : `Your logged ${hours} hour${Number(hours) !== 1 ? 's' : ''} on "${caseTitle}" have been disputed by the client. Please review and follow up.`,
        link: '/legal/service-logs',
      });
      auditService.log(
        confirm ? 'Service Log Verified' : 'Service Log Disputed',
        `Client ${confirm ? 'confirmed' : 'disputed'} ${hours}h logged by ${attyName} on "${caseTitle}"`
      );
    }

    setPendingLogs(prev => prev.filter(l => l.id !== logId));
    setVerifying(null);
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    if (!profile?.id) return;
    setMarkingAll(true);
    await supabase.from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setMarkingAll(false);
  };

  const handleClick = async (n: Notification) => {
    if (!n.is_read) await markAsRead(n.id);
    if (n.link) navigate(n.link);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Notifications</h1>
          <p className={styles.subtitle}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button className={styles.markAllBtn} onClick={markAllRead} disabled={markingAll}>
            {markingAll
              ? <Loader2 size={14} className={styles.spin} />
              : <CheckCheck size={14} />}
            Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className={styles.centered}>
          <Loader2 size={28} color="var(--color-primary)" className={styles.spin} />
        </div>
      ) : (
        <>
          {/* Pro-bono hours awaiting confirmation */}
          {pendingLogs.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.iconWrap} style={{ background: '#8B5CF618', color: '#8B5CF6' }}>
                  <Clock size={16} />
                </div>
                <span className={styles.sectionTitle}>
                  Pro-Bono Hours Awaiting Confirmation ({pendingLogs.length})
                </span>
              </div>
              {pendingLogs.map(log => {
                const atty = log.attorney as any;
                const c = log.case as any;
                const name = atty ? `Atty. ${atty.first_name} ${atty.last_name}` : 'Your attorney';
                return (
                  <div key={log.id} className={styles.logEntry}>
                    <p className={styles.logTitle}>
                      {name} logged{' '}
                      <strong>{Number(log.hours).toFixed(1)} hour{Number(log.hours) !== 1 ? 's' : ''}</strong>{' '}
                      on <strong>"{c?.title ?? 'your case'}"</strong>
                    </p>
                    <p className={styles.logDesc}>"{log.description}"</p>
                    <div className={styles.logActions}>
                      <button
                        onClick={() => handleVerify(log.id, true)}
                        disabled={verifying === log.id}
                        className={styles.btnConfirm}
                      >
                        {verifying === log.id
                          ? <Loader2 size={14} className={styles.spin} />
                          : <CheckCircle size={14} />}
                        Confirm
                      </button>
                      <button
                        onClick={() => handleVerify(log.id, false)}
                        disabled={verifying === log.id}
                        className={styles.btnDispute}
                      >
                        <XCircle size={14} /> Dispute
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* General notifications */}
          {notifications.length === 0 ? (
            <div className={styles.empty}>
              <Bell size={40} className={styles.emptyIcon} />
              <p className={styles.emptyText}>No notifications yet.</p>
              <p className={styles.emptySubtext}>You'll be notified when your cases are updated.</p>
            </div>
          ) : (
            <div className={styles.list}>
              {notifications.map(n => {
                const type = typeFromTitle(n.title);
                const color = COLOR_MAP[type];
                return (
                  <div
                    key={n.id}
                    className={`${styles.item} ${n.is_read ? styles.read : styles.unread}`}
                    onClick={() => handleClick(n)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && handleClick(n)}
                  >
                    <div className={styles.iconWrap} style={{ background: `${color}18`, color }}>
                      {ICON_MAP[type]}
                    </div>
                    <div className={styles.content}>
                      <div className={styles.topRow}>
                        <span className={styles.notifTitle}>{n.title}</span>
                        <span className={styles.time}>{fmt(n.created_at)}</span>
                      </div>
                      <p className={styles.body}>{n.body}</p>
                      {n.link && (
                        <span className={styles.linkHint}>
                          <ExternalLink size={11} /> View
                        </span>
                      )}
                    </div>
                    {!n.is_read && <span className={styles.dot} />}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PublicNotifications;
