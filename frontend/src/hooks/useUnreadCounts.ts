import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface UnreadCounts {
  messages: number;
  notifications: number;
}

/**
 * Subscribes to unread message and notification counts for the given user.
 * Keeps live via Supabase realtime. Safe to call with null/undefined userId.
 */
export function useUnreadCounts(userId: string | null | undefined): UnreadCounts {
  const [counts, setCounts] = useState<UnreadCounts>({ messages: 0, notifications: 0 });

  const fetch = useCallback(async () => {
    if (!userId) {
      setCounts({ messages: 0, notifications: 0 });
      return;
    }

    // 1. Get thread IDs the user participates in
    const { data: participations } = await supabase
      .from('thread_participants')
      .select('thread_id')
      .eq('user_id', userId);

    const threadIds = (participations ?? []).map((p: { thread_id: string }) => p.thread_id);

    // 2. Count unread messages (not sent by this user) in those threads
    const msgPromise = threadIds.length > 0
      ? supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .in('thread_id', threadIds)
          .neq('sender_id', userId)
          .eq('is_read', false)
      : Promise.resolve({ count: 0 });

    // 3. Count unread notifications
    const notifPromise = supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    const [msgRes, notifRes] = await Promise.all([msgPromise, notifPromise]);

    setCounts({
      messages: msgRes.count ?? 0,
      notifications: notifRes.count ?? 0,
    });
  }, [userId]);

  useEffect(() => {
    fetch();
    if (!userId) return;

    const channel = supabase
      .channel(`unread-counts-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, fetch)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, fetch]);

  return counts;
}
