import React from 'react';
import { Bell, CheckCheck, Loader2, BriefcaseIcon, MessageSquare, Info, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import styles from './LegalNotifications.module.css';
import Skeleton from '../../components/Skeleton';

interface Notification {
  id: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  case:    <BriefcaseIcon size={16} />,
  message: <MessageSquare size={16} />,
  default: <Info size={16} />,
};

const typeFromTitle = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('case') || t.includes('kaso')) return 'case';
  if (t.includes('message') || t.includes('mensahe')) return 'message';
  return 'default';
};

const COLOR_MAP: Record<string, string> = {
  case:    '#3B82F6',
  message: '#10B981',
  default: '#8B5CF6',
};

const fmt = (iso: string) => {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1)  return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24)  return `${diffHrs}h ago`;
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
};

const LegalNotifications: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [markingAll, setMarkingAll] = React.useState(false);

  const fetchNotifications = React.useCallback(async () => {
    if (!profile?.id) return;
    setIsLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('id, title, body, link, is_read, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications(data ?? []);
    setIsLoading(false);
  }, [profile?.id]);

  React.useEffect(() => {
    fetchNotifications();
    if (!profile?.id) return;
    const ch = supabase
      .channel(`legal-notifs-${profile.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${profile.id}`,
      }, fetchNotifications)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchNotifications, profile?.id]);

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
          <button
            className={styles.markAllBtn}
            onClick={markAllRead}
            disabled={markingAll}
          >
            {markingAll
              ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              : <CheckCheck size={14} />}
            Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className={styles.list}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={styles.item} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem' }}>
              <Skeleton style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <Skeleton style={{ height: 16, width: '40%', borderRadius: 4, marginBottom: 6 }} />
                <Skeleton style={{ height: 14, width: '75%', borderRadius: 4, marginBottom: 6 }} />
                <Skeleton style={{ height: 11, width: '20%', borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className={styles.empty}>
          <Bell size={40} className={styles.emptyIcon} />
          <p className={styles.emptyText}>No notifications yet.</p>
          <p className={styles.emptySubtext}>You'll be notified when cases are assigned or updated.</p>
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
    </div>
  );
};

export default LegalNotifications;
