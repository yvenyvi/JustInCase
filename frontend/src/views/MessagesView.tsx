import React from 'react';
import { Search, Send, Paperclip, ChevronLeft, Loader2, MessageSquare, FileText, X, Download } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import styles from './MessagesView.module.css';
import Skeleton from '../components/Skeleton';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { auditService } from '../services/auditService';

interface Thread {
  id: string;
  caseTitle: string | null;
  otherName: string;
  otherUserId: string;
  preview: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentType: string | null;
}

interface MessagesViewProps {
  role: 'public' | 'legal';
}

const MAX_FILE_MB = 10;
const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

const formatTime = (iso: string) => {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-PH', { weekday: 'short' });
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
};

const formatDateLabel = (iso: string) => {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
};

const initials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

const toMessage = (m: any): Message => ({
  id: m.id,
  senderId: m.sender_id,
  content: m.content ?? '',
  createdAt: m.created_at,
  attachmentUrl: m.attachment_url ?? null,
  attachmentName: m.attachment_name ?? null,
  attachmentType: m.attachment_type ?? null,
});

// Renders the attachment portion of a message bubble
const AttachmentDisplay: React.FC<{ url: string; name: string | null; type: string | null; isSent: boolean }> = ({ url, name, type, isSent }) => {
  const isImage = IMAGE_TYPES.includes(type ?? '');
  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: name ? '0.5rem' : 0 }}>
        <img
          src={url}
          alt={name ?? 'image'}
          style={{ maxWidth: '260px', maxHeight: '200px', borderRadius: '8px', objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
        />
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download={name ?? true}
      style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.25rem', padding: '0.6rem 0.75rem', backgroundColor: isSent ? 'rgba(37,99,235,0.07)' : 'var(--color-background)', borderRadius: '8px', textDecoration: 'none', border: '1px solid var(--color-border)', maxWidth: '240px' }}
    >
      <FileText size={18} color="var(--color-primary)" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {name ?? 'Download file'}
      </span>
      <Download size={14} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
    </a>
  );
};

const MessagesView: React.FC<MessagesViewProps> = ({ role }) => {
  const { profile } = useAuth();
  const location = useLocation();
  const openClientId = (location.state as any)?.openClientId ?? null;

  const [threads, setThreads] = React.useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [newMessage, setNewMessage] = React.useState('');
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = React.useState<string | null>(null);
  const [isThreadsLoading, setIsThreadsLoading] = React.useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [showChatOnMobile, setShowChatOnMobile] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const activeThread = threads.find(t => t.id === activeThreadId) ?? null;
  const canSend = (newMessage.trim().length > 0 || pendingFile !== null) && !isSending;

  // ── Thread list ──────────────────────────────────────────────────────────
  const fetchThreads = React.useCallback(async () => {
    if (!profile?.id) return;
    setIsThreadsLoading(true);

    const { data: myParticipations } = await supabase
      .from('thread_participants')
      .select('thread_id')
      .eq('user_id', profile.id);

    const threadIds = (myParticipations ?? []).map((p: any) => p.thread_id);

    if (!threadIds.length) {
      setThreads([]);
      setIsThreadsLoading(false);
      return;
    }

    const [threadRes, lastMsgRes, unreadRes] = await Promise.all([
      supabase
        .from('message_threads')
        .select('id, case_id, updated_at, cases(title), thread_participants(user_id)')
        .in('id', threadIds)
        .order('updated_at', { ascending: false }),
      supabase
        .from('messages')
        .select('thread_id, content, attachment_name, attachment_type, created_at')
        .in('thread_id', threadIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('messages')
        .select('thread_id, id')
        .in('thread_id', threadIds)
        .eq('is_read', false)
        .neq('sender_id', profile.id),
    ]);

    const otherUserIds = [
      ...new Set(
        (threadRes.data ?? []).flatMap((t: any) =>
          (t.thread_participants ?? [])
            .filter((p: any) => p.user_id !== profile.id)
            .map((p: any) => p.user_id)
        )
      ),
    ] as string[];

    const { data: userProfiles } = otherUserIds.length
      ? await supabase.from('users').select('id, first_name, last_name').in('id', otherUserIds)
      : { data: [] };

    const userMap: Record<string, string> = {};
    for (const u of userProfiles ?? []) {
      userMap[u.id] = [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Unknown';
    }

    const lastMsgMap: Record<string, any> = {};
    for (const msg of lastMsgRes.data ?? []) {
      if (!lastMsgMap[msg.thread_id]) lastMsgMap[msg.thread_id] = msg;
    }

    const unreadMap: Record<string, number> = {};
    for (const msg of unreadRes.data ?? []) {
      unreadMap[msg.thread_id] = (unreadMap[msg.thread_id] ?? 0) + 1;
    }

    const mapped: Thread[] = (threadRes.data ?? []).map((row: any) => {
      const otherParticipant = (row.thread_participants ?? []).find(
        (p: any) => p.user_id !== profile.id
      );
      const otherUserId = otherParticipant?.user_id ?? '';
      const otherName = otherUserId ? (userMap[otherUserId] ?? 'Unknown') : 'Unknown';
      const lastMsg = lastMsgMap[row.id];
      const preview = lastMsg
        ? lastMsg.content || (lastMsg.attachment_name ? `📎 ${lastMsg.attachment_name}` : 'Attachment')
        : 'Wala pang mensahe.';
      return {
        id: row.id,
        caseTitle: row.cases?.title ?? null,
        otherName,
        otherUserId,
        preview,
        lastMessageAt: lastMsg?.created_at ?? row.updated_at,
        unreadCount: unreadMap[row.id] ?? 0,
      };
    });

    setThreads(mapped);
    setActiveThreadId(prev => prev ?? (mapped[0]?.id ?? null));
    setIsThreadsLoading(false);
  }, [profile?.id]);

  React.useEffect(() => { fetchThreads(); }, [fetchThreads]);

  React.useEffect(() => {
    if (openClientId) fetchThreads();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openClientId]);

  React.useEffect(() => {
    if (!openClientId || !threads.length) return;
    const match = threads.find(t => t.otherUserId === openClientId);
    if (match) { setActiveThreadId(match.id); setShowChatOnMobile(true); }
  }, [openClientId, threads]);

  // ── Messages for active thread ───────────────────────────────────────────
  React.useEffect(() => {
    if (!activeThreadId || !profile?.id) return;
    const load = async () => {
      setIsMessagesLoading(true);
      const { data } = await supabase
        .from('messages')
        .select('id, content, sender_id, created_at, attachment_url, attachment_name, attachment_type')
        .eq('thread_id', activeThreadId)
        .order('created_at', { ascending: true });

      setMessages((data ?? []).map(toMessage));
      setIsMessagesLoading(false);

      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('thread_id', activeThreadId)
        .eq('is_read', false)
        .neq('sender_id', profile.id);

      setThreads(prev =>
        prev.map(t => (t.id === activeThreadId ? { ...t, unreadCount: 0 } : t))
      );
    };
    load();
  }, [activeThreadId, profile?.id]);

  // ── Real-time ────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!activeThreadId) return;
    const channel = supabase
      .channel(`messages:${activeThreadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${activeThreadId}` },
        (payload) => {
          const m = payload.new as any;
          setMessages(prev => {
            if (prev.some(p => p.id === m.id)) return prev;
            return [...prev, toMessage(m)];
          });
          const preview = m.content || (m.attachment_name ? `📎 ${m.attachment_name}` : 'Attachment');
          setThreads(prev =>
            prev.map(t => t.id === activeThreadId ? { ...t, preview, lastMessageAt: m.created_at } : t)
          );
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeThreadId]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── File handling ────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setUploadError(`File too large. Max size is ${MAX_FILE_MB}MB.`);
      e.target.value = '';
      return;
    }
    setUploadError(null);
    setPendingFile(file);
    if (IMAGE_TYPES.includes(file.type)) {
      setPendingPreviewUrl(URL.createObjectURL(file));
    } else {
      setPendingPreviewUrl(null);
    }
    e.target.value = '';
  };

  const clearPendingFile = () => {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(null);
    setPendingPreviewUrl(null);
    setUploadError(null);
  };

  // ── Send ─────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!canSend || !activeThreadId || !profile?.id) return;
    setIsSending(true);

    let attachmentUrl: string | null = null;
    let attachmentName: string | null = null;
    let attachmentType: string | null = null;

    if (pendingFile) {
      const path = `${activeThreadId}/${Date.now()}_${pendingFile.name}`;
      const { error: uploadErr } = await supabase.storage
        .from('message-attachments')
        .upload(path, pendingFile, { contentType: pendingFile.type });

      if (uploadErr) {
        setUploadError(`Upload failed: ${uploadErr.message}`);
        setIsSending(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(path);

      attachmentUrl = urlData.publicUrl;
      attachmentName = pendingFile.name;
      attachmentType = pendingFile.type;
    }

    const content = newMessage.trim();
    const messageId = crypto.randomUUID();
    const { error } = await supabase.from('messages').insert({
      id: messageId,
      thread_id: activeThreadId,
      sender_id: profile.id,
      content: content || null,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
      attachment_type: attachmentType,
    });

    if (!error) {
      const sentAt = new Date().toISOString();
      setNewMessage('');
      clearPendingFile();
      setMessages(prev => {
        if (prev.some(p => p.id === messageId)) return prev;
        return [...prev, {
          id: messageId,
          senderId: profile.id,
          content: content || '',
          createdAt: sentAt,
          attachmentUrl,
          attachmentName,
          attachmentType,
        }];
      });
      const preview = content || (attachmentName ? `📎 ${attachmentName}` : 'Attachment');
      setThreads(prev =>
        prev.map(t => t.id === activeThreadId ? { ...t, preview, lastMessageAt: sentAt } : t)
      );
      if (attachmentName) {
        auditService.log('File Uploaded', `Uploaded file: "${attachmentName}" in thread ${activeThreadId}`);
      } else {
        auditService.log('Message Sent', `Sent message in thread ${activeThreadId}`);
      }

      // Notify the recipient — deduplicate so rapid messages don't flood their inbox
      if (activeThread?.otherUserId) {
        const senderName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Someone';
        const recipientLink = role === 'legal' ? '/public/messages' : '/legal/messages';
        const caseInfo = activeThread.caseTitle ? ` about "${activeThread.caseTitle}"` : '';
        await supabase.from('notifications')
          .delete()
          .eq('user_id', activeThread.otherUserId)
          .eq('title', 'New Message')
          .eq('link', recipientLink)
          .eq('is_read', false);
        await supabase.from('notifications').insert({
          user_id: activeThread.otherUserId,
          title: 'New Message',
          body: `${senderName} sent you a message${caseInfo}.`,
          link: recipientLink,
        });
      }
    } else {
      console.error('Send error:', error.message, error.code);
    }
    setIsSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleThreadClick = (id: string) => { setActiveThreadId(id); setShowChatOnMobile(true); };

  // ── Filtering & grouping ─────────────────────────────────────────────────
  const filteredThreads = searchTerm
    ? threads.filter(t =>
        t.otherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.caseTitle ?? '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : threads;

  const groupedMessages: { label: string; messages: Message[] }[] = [];
  for (const msg of messages) {
    const label = formatDateLabel(msg.createdAt);
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.label === label) last.messages.push(msg);
    else groupedMessages.push({ label, messages: [msg] });
  }

  const emptyMessage = role === 'public'
    ? 'Wala pang mensahe. Pumili ng abogado sa Smart Triage para makapagsimula ng kaso.'
    : 'Wala pang mensahe. Ang mga mensahe ay lilitaw kapag tinanggap mo ang isang kaso.';

  return (
    <div className={`${styles.container} ${showChatOnMobile ? styles.showChat : ''}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.txt"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* ── Sidebar ── */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.searchWrapper}>
            <Search size={16} color="var(--color-text-muted)" />
            <input type="text" placeholder="Search" className={styles.searchInput}
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className={styles.threadsList}>
          <h3 className={styles.sectionTitle} style={{ padding: '1rem 1.5rem 0.5rem', marginBottom: 0 }}>
            Messages
            {threads.length > 0 && (
              <span style={{ backgroundColor: '#f3f4f6', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', marginLeft: '0.4rem' }}>
                {threads.length}
              </span>
            )}
          </h3>

          {isThreadsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem 0' }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem' }}>
                  <Skeleton style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <Skeleton style={{ height: 16, width: '50%', borderRadius: 4, marginBottom: 6 }} />
                    <Skeleton style={{ height: 12, width: '80%', borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredThreads.length === 0 ? (
            <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
              <MessageSquare size={32} color="var(--color-text-muted)" style={{ margin: '0 auto 0.75rem' }} />
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                {threads.length === 0 ? emptyMessage : 'No conversations match your search.'}
              </p>
            </div>
          ) : (
            filteredThreads.map(thread => (
              <div key={thread.id}
                className={`${styles.threadItem} ${thread.id === activeThreadId ? styles.active : ''}`}
                onClick={() => handleThreadClick(thread.id)}
              >
                <div className={styles.userAvatar}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-primary)', color: 'white', fontSize: '0.7rem', fontWeight: 700 }}
                >
                  {initials(thread.otherName)}
                </div>
                <div className={styles.threadContent}>
                  <div className={styles.threadTop}>
                    <h4 className={styles.threadName}>{thread.otherName}</h4>
                    <span className={styles.threadTime}>{formatTime(thread.lastMessageAt)}</span>
                  </div>
                  {thread.caseTitle && (
                    <p style={{ fontSize: '0.72rem', color: 'var(--color-primary)', fontWeight: 500, marginBottom: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {thread.caseTitle}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <p className={styles.threadPreview} style={{ flex: 1 }}>{thread.preview}</p>
                    {thread.unreadCount > 0 && (
                      <span style={{ backgroundColor: 'var(--color-primary)', color: 'white', borderRadius: '9999px', fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.45rem', flexShrink: 0 }}>
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Chat Area ── */}
      <div className={styles.chatArea}>
        {!activeThread ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', gap: '0.75rem' }}>
            <MessageSquare size={40} strokeWidth={1.5} />
            <p style={{ fontSize: '0.9rem' }}>Piliin ang isang conversation</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className={styles.chatHeader}>
              <div className={styles.headerInfo}>
                <button className={styles.mobileBackBtn} onClick={() => setShowChatOnMobile(false)}>
                  <ChevronLeft size={24} />
                </button>
                <div className={styles.userAvatar}
                  style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-primary)', color: 'white', fontSize: '0.875rem', fontWeight: 700 }}
                >
                  {initials(activeThread.otherName)}
                </div>
                <div>
                  <h3 className={styles.headerName}>{activeThread.otherName}</h3>
                  {activeThread.caseTitle && (
                    <span className={styles.headerHandle}>Case: {activeThread.caseTitle}</span>
                  )}
                </div>
              </div>
              <div className={styles.headerActions}></div>
            </div>

            {/* Messages */}
            <div className={styles.messagesContainer}>
              {isMessagesLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', maxWidth: '70%' }}>
                    <Skeleton style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
                    <Skeleton style={{ height: 44, width: 220, borderRadius: 12 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Skeleton style={{ height: 52, width: 260, borderRadius: 12 }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', maxWidth: '70%' }}>
                    <Skeleton style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
                    <Skeleton style={{ height: 36, width: 180, borderRadius: 12 }} />
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem', padding: '3rem 1rem' }}>
                  Wala pang mensahe. Simulan ang usapan!
                </div>
              ) : (
                groupedMessages.map(group => (
                  <React.Fragment key={group.label}>
                    <div className={styles.dateDivider}>{group.label}</div>
                    {group.messages.map(msg => {
                      const isSent = msg.senderId === profile?.id;
                      return (
                        <div key={msg.id} className={`${styles.messageRow} ${isSent ? styles.sent : styles.received}`}>
                          {!isSent && (
                            <div className={styles.messageAvatar}
                              style={{ backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.6rem', fontWeight: 700 }}
                            >
                              {initials(activeThread.otherName)}
                            </div>
                          )}
                          <div className={styles.messageBubble}>
                            <div className={styles.messageTop}
                              style={isSent ? { alignSelf: 'flex-end', flexDirection: 'row-reverse' } : {}}
                            >
                              <span className={styles.senderName}>{isSent ? 'You' : activeThread.otherName}</span>
                              <span className={styles.messageTime}>{formatTime(msg.createdAt)}</span>
                            </div>
                            {msg.content && <div className={styles.bubbleText}>{msg.content}</div>}
                            {msg.attachmentUrl && (
                              <AttachmentDisplay
                                url={msg.attachmentUrl}
                                name={msg.attachmentName}
                                type={msg.attachmentType}
                                isSent={isSent}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className={styles.inputArea}>
              {/* Pending file preview */}
              {pendingFile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', marginBottom: '0.5rem', backgroundColor: 'var(--color-background)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                  {pendingPreviewUrl ? (
                    <img src={pendingPreviewUrl} alt="preview" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(37,99,235,0.1)', borderRadius: '8px', flexShrink: 0 }}>
                      <FileText size={20} color="var(--color-primary)" />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pendingFile.name}</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{(pendingFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button onClick={clearPendingFile} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0.25rem', borderRadius: '50%', display: 'flex' }}>
                    <X size={16} />
                  </button>
                </div>
              )}

              {uploadError && (
                <p style={{ fontSize: '0.78rem', color: '#ef4444', marginBottom: '0.4rem', paddingLeft: '0.25rem' }}>{uploadError}</p>
              )}

              <div className={styles.inputContainer}>
                <textarea
                  placeholder="Sumulat ng mensahe..."
                  className={styles.textInput}
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                />
                <div className={styles.inputToolbar}>
                  <div className={styles.toolbarActions}>
                    <button
                      className={styles.iconBtn}
                      onClick={() => fileInputRef.current?.click()}
                      title="Attach file or image"
                      style={{ color: pendingFile ? 'var(--color-primary)' : undefined }}
                    >
                      <Paperclip size={20} />
                    </button>
                  </div>
                  <button
                    className={styles.sendBtn}
                    onClick={handleSend}
                    disabled={!canSend}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', opacity: canSend ? 1 : 0.4 }}
                  >
                    {isSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    I-send
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MessagesView;
