import React from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Notification {
  id: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const formatAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const NotificationBell: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const fetchNotifications = React.useCallback(async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('notifications')
      .select('id, title, body, link, is_read, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setNotifications(data as Notification[]);
  }, [profile?.id]);

  React.useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Real-time: new notifications for this user
  React.useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`notifications:${profile.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${profile.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    if (!profile?.id || unreadCount === 0) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleClick = async (n: Notification) => {
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Notifications"
        style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', transition: 'background 0.15s' }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: 7, right: 7, width: 8, height: 8, backgroundColor: 'var(--color-danger, #ef4444)', borderRadius: '50%', border: '2px solid var(--color-surface)' }} />
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 340, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)' }}>
              Notifications {unreadCount > 0 && <span style={{ backgroundColor: 'var(--color-primary)', color: 'white', borderRadius: '9999px', fontSize: '0.7rem', padding: '0.1rem 0.4rem', marginLeft: '0.3rem' }}>{unreadCount}</span>}
            </span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                Walang notification sa ngayon.
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  style={{ display: 'flex', gap: '0.75rem', padding: '0.85rem 1rem', cursor: 'pointer', backgroundColor: n.is_read ? 'transparent' : 'rgba(37,99,235,0.05)', borderBottom: '1px solid var(--color-border)', transition: 'background 0.15s' }}
                >
                  {!n.is_read && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-primary)', flexShrink: 0, marginTop: 5 }} />
                  )}
                  {n.is_read && <div style={{ width: 8, flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: n.is_read ? 500 : 700, fontSize: '0.825rem', color: 'var(--color-text)', marginBottom: '0.2rem' }}>{n.title}</p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.45 }}>{n.body}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>{formatAgo(n.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
