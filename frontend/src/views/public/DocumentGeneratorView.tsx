import React from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, Download, FileText, FolderOpen, Loader2, Save, Send, Sparkles, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { documentGeneratorService } from '../../services/documentGeneratorService';
import styles from './DocumentGeneratorView.module.css';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
type Message = { role: 'user' | 'assistant'; content: string };
type Draft = { templateTitle: string; content: string; templateSlug: string; sources: any[]; researchUnavailable: boolean };
type SavedDocument = { id: string; title: string; content: string; template_slug: string; created_at: string; sources?: any[] };
const surface: React.CSSProperties = { border: '1px solid var(--color-border, #e2e8f0)', background: 'var(--color-surface, #fff)', borderRadius: 16, boxShadow: '0 4px 16px rgba(15,23,42,.04)' };
const primary: React.CSSProperties = { border: 0, borderRadius: 11, padding: '.75rem 1rem', color: 'white', background: 'var(--color-primary, #2563eb)', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem' };
const secondary: React.CSSProperties = { border: '1px solid var(--color-border, #cbd5e1)', borderRadius: 11, padding: '.7rem .9rem', color: 'var(--color-text, #1e293b)', background: 'white', fontWeight: 650, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem' };

const DocumentGeneratorView = () => {
  const { session } = useAuth();
  const [messages, setMessages] = React.useState<Message[]>([{ role: 'assistant', content: 'Hello. What document do you need help preparing? Describe the situation in your own words, and I’ll ask for any essential details.' }]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [slow, setSlow] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState('');
  const [showSaved, setShowSaved] = React.useState(false);
  const [documents, setDocuments] = React.useState<SavedDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = React.useState(false);

  React.useEffect(() => {
    if (!loading) { setSlow(false); return; }
    const timer = window.setTimeout(() => setSlow(true), 12000);
    return () => window.clearTimeout(timer);
  }, [loading]);

  const openSavedDocuments = async () => {
    setShowSaved(true);
    if (!session?.access_token) return;
    setLoadingDocuments(true);
    try {
      const response = await fetch(`${API}/api/documents`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!response.ok) throw new Error('Saved drafts could not be loaded. Please try again.');
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (caught: any) {
      setError(caught?.message || 'Saved drafts could not be loaded.');
    } finally { setLoadingDocuments(false); }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput(''); setError(''); setSaved(false);
    const history = [...messages, { role: 'user' as const, content: text }];
    setMessages(history); setLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      const response = await fetch(`${API}/api/documents/interactive-draft`, { method: 'POST', headers, body: JSON.stringify({ history }) });
      if (!response.ok) {
        const statusMessage: Record<number, string> = { 401: 'Your session expired. Sign in again.', 429: 'Document drafting is busy right now. Try again shortly.' };
        throw new Error(statusMessage[response.status] || 'A draft could not be prepared right now. Your conversation is still here; try again.');
      }
      const data = await response.json();
      const reply = typeof data.response === 'string' ? data.response : '';
      if (!reply) throw new Error('No response was received. Please try again.');
      if (reply.startsWith('DOCUMENT:')) {
        const content = reply.replace(/^DOCUMENT:\s*/i, '').trim();
        const subject = content.match(/(?:Subject|Re|Paksa):\s*([^\n]+)/i)?.[1]?.trim();
        const heading = content.match(/^#\s+([^\n]+)/m)?.[1]?.trim();
        const title = subject || heading || 'AI Drafted Document';
        setDraft({ templateTitle: title, content, templateSlug: 'interactive-draft', sources: data.sources || [], researchUnavailable: Boolean(data.research_unavailable) });
        setMessages([...history, { role: 'assistant', content: 'Your draft is ready. Review and edit it before saving or exporting.' }]);
      } else {
        setMessages([...history, { role: 'assistant', content: reply.replace(/^QUESTION:\s*/i, '') }]);
      }
    } catch (caught: any) {
      setError(caught?.message || 'Could not connect to the document service. Check your connection and try again.');
    } finally { setLoading(false); }
  };

  const saveDraft = async () => {
    if (!draft || !session?.access_token || saving) return;
    setSaving(true); setError('');
    try {
      const response = await fetch(`${API}/api/documents/save`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ title: draft.templateTitle, content: draft.content, templateSlug: draft.templateSlug, sources: draft.sources }),
      });
      if (!response.ok) throw new Error('The draft could not be saved. Please try again.');
      setSaved(true);
    } catch (caught: any) { setError(caught?.message || 'The draft could not be saved.'); }
    finally { setSaving(false); }
  };

  const openDocument = (document: SavedDocument) => {
    setDraft({ templateTitle: document.title, content: document.content, templateSlug: document.template_slug, sources: document.sources || [], researchUnavailable: false });
    setSaved(true); setShowSaved(false); setError('');
  };

  const downloadDocx = async () => {
    if (!draft) return;
    setError('');
    try {
      const response = await fetch(`${API}/api/documents/export/docx`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: draft.templateTitle, content: draft.content }),
      });
      if (!response.ok) throw new Error('The Word document could not be exported. Please try again.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${draft.templateTitle.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 90) || 'Legal_Draft'}.docx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (caught: any) { setError(caught?.message || 'The Word document could not be exported.'); }
  };

  const newDraft = () => {
    setDraft(null); setSaved(false); setError('');
    setMessages([{ role: 'assistant', content: 'Hello. What document do you need help preparing? Describe the situation in your own words, and I’ll ask for any essential details.' }]);
  };

  return (
    <main className={styles.drafterPage}>
      <header className={styles.drafterHeader}>
        <div><div style={{ color: 'var(--color-primary)', fontSize: '.75rem', fontWeight: 750, letterSpacing: '.08em' }}>DOCUMENT DRAFTER</div><h1 className={styles.drafterTitle}>Draft a legal document</h1><p className={styles.drafterSubtitle}>Describe what you need. LAYA will ask focused follow-up questions and prepare an editable draft.</p></div>
        <button style={secondary} onClick={() => void openSavedDocuments()}><FolderOpen size={17} /> Saved drafts</button>
      </header>

      {draft ? <section className={styles.draftPanel} style={{ ...surface, padding: 'clamp(1rem, 3vw, 1.5rem)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', flexWrap: 'wrap' }}><FileText color="var(--color-primary)" /><div style={{ flex: 1 }}><h2 style={{ margin: 0, fontSize: '1.15rem' }}>{draft.templateTitle}</h2><span style={{ color: 'var(--color-text-muted)', fontSize: '.85rem' }}>Review the draft before using or sharing it.</span></div>
          <details className={styles.exportMenu}>
            <summary><Download size={16} /> Export or copy</summary>
            <div className={styles.exportOptions}>
              <button style={secondary} onClick={() => void documentGeneratorService.downloadDraft(`${draft.templateTitle.replace(/\s+/g, '_')}.txt`, draft.content)}>Download PDF</button>
              <button style={secondary} onClick={() => void downloadDocx()}>Download Word</button>
              <button style={secondary} onClick={() => void navigator.clipboard.writeText(draft.content)}><Copy size={16} /> Copy text</button>
            </div>
          </details>
          <button style={primary} onClick={() => void saveDraft()} disabled={saving || saved}>{saving ? <Loader2 className="animate-spin" size={16} /> : saved ? <Check size={16} /> : <Save size={16} />}{saved ? 'Saved to account' : saving ? 'Saving…' : 'Save draft'}</button>
        </div>
        <label className={styles.draftEditorLabel}>Document draft <span>You can edit this text before saving or exporting.</span><textarea className={styles.draftEditor} aria-label="Edit generated document" value={draft.content} onChange={event => { setDraft(current => current ? { ...current, content: event.target.value } : current); setSaved(false); }} /></label>
        {!!draft.sources.length && <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: 12, marginTop: '1rem' }}><h3 style={{ marginTop: 0, fontSize: '1rem' }}>Legal sources</h3><p style={{ color: 'var(--color-text-muted)', fontSize: '.85rem' }}>AI-generated research aids. Check the authoritative source before relying on it.</p>{draft.sources.map(source => <div key={`${source.dataset}-${source.id}`} style={{ padding: '.65rem 0', borderTop: '1px solid var(--color-border)' }}><strong>{source.title}</strong><div style={{ display: 'flex', gap: '1rem', marginTop: '.3rem' }}><a href={source.url} target="_blank" rel="noreferrer">Juris record</a>{source.source_url && <a href={source.source_url} target="_blank" rel="noreferrer">Authoritative source</a>}</div></div>)}</div>}
        {draft.researchUnavailable && <p role="status" style={{ color: '#a16207' }}>External legal sources could not be verified. No unverified citations were added.</p>}
        <p style={{ color: 'var(--color-text-muted)', fontSize: '.85rem', lineHeight: 1.6 }}>This is a draft, not legal advice. Have a lawyer review it before you use or submit it.</p>
        {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}><button style={secondary} onClick={() => setDraft(null)}><ArrowLeft size={16} /> Back to conversation</button><button style={primary} onClick={newDraft}>Create another document <ArrowRight size={16} /></button></div>
      </section> : <section className={styles.assistantPanel} style={{ ...surface, overflow: 'hidden' }}>
        <div className={styles.assistantHeader}><Sparkles size={18} color="#7c3aed" /> Document assistant <span>LAYA</span></div>
        <div className={styles.conversationHistory} style={{ minHeight: 300, maxHeight: '55vh', overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '.8rem' }}>
          {messages.map((message, index) => <div key={index} style={{ alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: 'min(88%, 680px)', padding: '.85rem 1rem', borderRadius: 16, background: message.role === 'user' ? 'var(--color-primary, #2563eb)' : '#f1f5f9', color: message.role === 'user' ? '#fff' : 'var(--color-text, #1e293b)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{message.content}</div>)}
          {loading && <div aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: '.55rem', color: 'var(--color-text-muted)' }}><Loader2 className="animate-spin" size={17} />{slow ? 'Preparing your draft—this is taking a little longer…' : 'Reviewing details…'}</div>}
        </div>
        {error && <p role="alert" style={{ color: '#b91c1c', padding: '0 1.2rem' }}>{error}</p>}
        <div className={styles.draftComposer} style={{ display: 'flex', gap: '.65rem', padding: '1rem', borderTop: '1px solid var(--color-border, #e2e8f0)' }}><textarea aria-label="Describe the document you need" value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="Describe the situation and document you need…" rows={2} maxLength={4000} style={{ flex: 1, resize: 'vertical', border: '1px solid var(--color-border, #cbd5e1)', borderRadius: 12, padding: '.75rem', font: 'inherit' }} /><button style={primary} onClick={() => void send()} disabled={!input.trim() || loading} aria-label="Send details"><Send size={18} /></button></div>
      </section>}

      {showSaved && <div role="presentation" onClick={() => setShowSaved(false)} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(15,23,42,.5)', display: 'grid', placeItems: 'center', padding: '1rem' }}><section role="dialog" aria-modal="true" aria-labelledby="saved-documents-title" onClick={event => event.stopPropagation()} style={{ ...surface, width: 'min(100%, 580px)', maxHeight: '80vh', overflowY: 'auto', padding: '1.2rem' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><h2 id="saved-documents-title" style={{ margin: 0 }}>Saved drafts</h2><button style={secondary} onClick={() => setShowSaved(false)} aria-label="Close saved drafts"><X size={17} /></button></div>{loadingDocuments ? <p><Loader2 className="animate-spin" size={17} /> Loading saved drafts…</p> : documents.length ? <div style={{ display: 'grid', gap: '.55rem', marginTop: '1rem' }}>{documents.map(document => <button key={document.id} style={{ ...secondary, justifyContent: 'flex-start', textAlign: 'left', padding: '.85rem' }} onClick={() => openDocument(document)}><FileText size={19} color="var(--color-primary)" /><span><strong>{document.title}</strong><br/><small style={{ color: 'var(--color-text-muted)' }}>{new Date(document.created_at).toLocaleDateString()}</small></span><ArrowRight size={16} style={{ marginLeft: 'auto' }} /></button>)}</div> : <p style={{ color: 'var(--color-text-muted)' }}>You have no saved drafts yet.</p>}</section></div>}
    </main>
  );
};

export default DocumentGeneratorView;
