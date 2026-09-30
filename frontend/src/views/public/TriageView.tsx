import React from 'react';
import { ArrowLeft, ArrowRight, Check, FileText, Loader2, Paperclip, Scale, Search, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import styles from './TriageView.module.css';

type ChatMessage = { role: 'user' | 'assistant'; content: string; apiContent?: string; suggestions?: string[]; localOnly?: boolean };
type Assessment = Record<string, any>;
type Attorney = { id: string; first_name: string; last_name: string; firm_name?: string; profile_photo_url?: string | null; city_municipality?: string; rating?: number; review_count?: number; match_reasons?: string[] };

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const initialMessage: ChatMessage = {
  role: 'assistant',
  content: 'Hello. What would you like help with today? Describe the situation in your own words, then decide whether you want guidance or attorney assistance.',
};
const box: React.CSSProperties = { background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e2e8f0)', borderRadius: 16, padding: '1.1rem 1.25rem', boxShadow: '0 4px 14px rgba(15,23,42,.04)' };
const primary: React.CSSProperties = { border: 0, borderRadius: 12, padding: '.8rem 1.1rem', color: '#fff', background: 'var(--color-primary, #2563eb)', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '.55rem' };
const secondary: React.CSSProperties = { border: '1px solid var(--color-border, #cbd5e1)', borderRadius: 12, padding: '.75rem 1rem', color: 'var(--color-text, #1e293b)', background: '#fff', fontWeight: 650, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem' };

function initials(attorney: Attorney) {
  return `${attorney.first_name?.trim().charAt(0) || ''}${attorney.last_name?.trim().charAt(0) || ''}`.toUpperCase() || 'A';
}

const TriageView = () => {
  const { profile, session } = useAuth();
  const navigate = useNavigate();
  const [stage, setStage] = React.useState<'conversation' | 'review' | 'preference' | 'matching'>('conversation');
  const [messages, setMessages] = React.useState<ChatMessage[]>([initialMessage]);
  const [input, setInput] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [loadingSlow, setLoadingSlow] = React.useState(false);
  const [reviewReady, setReviewReady] = React.useState(false);
  const [intent, setIntent] = React.useState('undecided');
  const [assessment, setAssessment] = React.useState<Assessment | null>(null);
  const [correction, setCorrection] = React.useState<Assessment | null>(null);
  const [error, setError] = React.useState('');
  const [preference, setPreference] = React.useState('');
  const [attorneys, setAttorneys] = React.useState<Attorney[]>([]);
  const [selectedAttorney, setSelectedAttorney] = React.useState<string | null | undefined>(undefined);
  const [isMatching, setIsMatching] = React.useState(false);
  const [requesting, setRequesting] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [failedPhotos, setFailedPhotos] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!loading) { setLoadingSlow(false); return; }
    const timer = window.setTimeout(() => setLoadingSlow(true), 12000);
    return () => window.clearTimeout(timer);
  }, [loading]);

  const send = async (text = input, action: 'continue' | 'assess' = 'continue') => {
    if (loading || (!text.trim() && !file && action === 'continue')) return;
    if (!session?.access_token) { setError('Your session expired. Sign in again to continue.'); return; }
    const cleanHistory = messages.filter(message => !message.localOnly);
    const nextHistory = action === 'assess'
      ? cleanHistory
      : [...cleanHistory, {
        role: 'user' as const,
        content: `${text.trim()}${file ? `\n[Attached: ${file.name}]` : ''}`,
        ...(correction ? { apiContent: `The user reviewed and corrected their concern summary. Preserve their intent unless they change it. Corrections: ${JSON.stringify(correction)}. Current message: ${text.trim()}` } : {}),
      }];
    setMessages(nextHistory);
    if (action === 'continue' && correction) setCorrection(null);
    setInput('');
    setError('');
    setLoading(true);
    try {
      const headers: Record<string, string> = { Authorization: `Bearer ${session.access_token}` };
      let response: Response;
      if (file && action === 'continue') {
        const body = new FormData();
        body.append('history', JSON.stringify(nextHistory.map(({ role, content, apiContent }) => ({ role, content: apiContent || content }))));
        body.append('action', action);
        body.append('files', file);
        response = await fetch(`${API}/api/triage/interactive`, { method: 'POST', headers, body });
      } else {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        const body = new URLSearchParams({ history: JSON.stringify(nextHistory.map(({ role, content, apiContent }) => ({ role, content: apiContent || content }))), action });
        response = await fetch(`${API}/api/triage/interactive`, { method: 'POST', headers, body });
      }
      setFile(null);
      if (!response.ok) {
        const messages: Record<number, string> = {
          400: 'We could not process that message or file. Try a shorter message or start a new conversation.',
          401: 'Your session expired. Sign in again.',
          403: 'This account cannot access the assessment.',
          429: 'The assessment is busy right now. Wait a moment and try again.',
        };
        throw new Error(messages[response.status] || 'The assessment is temporarily unavailable. Your conversation is still here; try again later.');
      }
      const data = await response.json();
      if (typeof data.reply !== 'string') throw new Error('We could not read the response. Please try again.');
      setIntent(data.intent || 'undecided');
      setReviewReady(data.review_ready === true);
      if (action === 'assess' && data.assessment) {
        setAssessment(data.assessment);
        setCorrection(null);
        setStage('review');
      } else {
        setMessages([...nextHistory, { role: 'assistant', content: data.reply, suggestions: data.suggestions || [] }]);
      }
    } catch (caught: any) {
      setError(caught?.message || 'Could not connect to the assessment. Check your connection and try again.');
      if (action === 'continue') setMessages(nextHistory);
    } finally {
      setLoading(false);
    }
  };

  const startMatching = async (selectedPreference: string) => {
    if (!assessment) return;
    setPreference(selectedPreference);
    const updated: Assessment = { ...assessment, lawyer_preference: selectedPreference, lawyer_preference_provided: true, intent: 'seek_attorney' };
    setAssessment(updated);
    setStage('matching');
    setSelectedAttorney(undefined);
    setIsMatching(true);
    setError('');
    try {
      const response = await fetch(`${API}/api/lawyers/match`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_of_law: updated.category_of_law, case_subcategory: updated.case_subcategory, primary_issue: updated.primary_issue, case_summary: updated.case_summary, location: updated.location, urgency: updated.urgency, lawyer_preference: selectedPreference, limit: 3 }),
      });
      if (!response.ok) throw new Error('Attorney matches are unavailable right now. You can still choose the open network.');
      const data = await response.json();
      setAttorneys(Array.isArray(data.lawyers) ? data.lawyers : []);
      setSelectedAttorney(data.lawyers?.length ? undefined : null);
    } catch (caught: any) {
      setAttorneys([]);
      setSelectedAttorney(null);
      setError(caught?.message || 'Could not connect to attorney matching. You can still choose the open network.');
    } finally {
      setIsMatching(false);
    }
  };

  const submitRequest = async () => {
    if (!profile?.id || selectedAttorney === undefined || !assessment || requesting) return;
    setRequesting(true);
    setError('');
    try {
      const category = String(assessment.category_of_law || 'General Practice').replace(/\s+/g, ' ').trim().slice(0, 100) || 'General Practice';
      const date = new Date().toLocaleDateString();
      const suffix = ` Concern (${date})`;
      const title = `${category.slice(0, Math.max(1, 100 - suffix.length)).trimEnd()}${suffix}`.slice(0, 100);
      const description = {
        summary: assessment.primary_issue,
        case_summary: assessment.case_summary || assessment.primary_issue,
        category_of_law: assessment.category_of_law || category,
        case_subcategory: assessment.case_subcategory,
        chronology: assessment.chronology || [],
        important_dates: assessment.important_dates || [],
        urgency: assessment.urgency,
        location: assessment.location,
        opposingParty: assessment.opposing_party,
        evidence: assessment.evidence,
        desired_outcome: assessment.desired_outcome,
        safety_risks: assessment.safety_risks || [],
        lawyer_preference: preference,
        ai_assessment: assessment.ai_assessment,
        missing_details: assessment.missing_details,
        legal_sources: assessment.legal_sources || [],
        intent: 'seek_attorney',
        possible_options: assessment.possible_options || [],
        practical_steps: assessment.practical_steps || [],
      };
      const { error: insertError } = await supabase.from('cases').insert({
        title, client_id: profile.id, category, description: JSON.stringify(description), status: 'Pending Triage',
        attorney_id: selectedAttorney || null,
        lawyer_preference: ['Pro Bono', 'Private'].includes(preference) ? preference : null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      });
      if (insertError) throw insertError;
      setSubmitted(true);
    } catch (caught: any) {
      setError(caught?.message || 'The request could not be sent. Please try again.');
    } finally {
      setRequesting(false);
      setConfirm(false);
    }
  };

  const updateAssessment = (key: string, value: string) => setAssessment(current => current ? { ...current, [key]: value } : current);

  const reset = () => {
    setStage('conversation'); setMessages([initialMessage]); setInput(''); setFile(null); setReviewReady(false);
    setIntent('undecided'); setAssessment(null); setCorrection(null); setError(''); setPreference(''); setSubmitted(false);
  };

  const intentLabel = intent === 'seek_attorney' ? 'You asked for attorney assistance' : intent === 'guidance_only' ? 'Guidance only' : 'Exploring your options';
  const stageIndex = stage === 'conversation' ? 0 : stage === 'review' ? 1 : 2;
  const stageLabels = ['Describe your concern', 'Review your concern', 'Choose next steps'];
  const canReview = reviewReady && !input.trim() && !file;
  const renderReviewField = (key: string, label: string) => (
    <label key={key} className={styles.reviewField}>
      {label}
      <textarea
        value={String(assessment?.[key] ?? '')}
        onChange={event => updateAssessment(key, event.target.value)}
        rows={key === 'case_summary' || key === 'primary_issue' || key === 'desired_outcome' ? 3 : 1}
      />
    </label>
  );

  return (
    <main className={styles.triageContainer}>
      <header className={styles.pageHeader}>
        <div style={{ color: 'var(--color-primary)', fontWeight: 750, fontSize: '.76rem', letterSpacing: '.09em', textTransform: 'uppercase' }}>Legal help assessment</div>
        <h1 className={styles.pageTitle}>Talk through your concern</h1>
        <p className={styles.pageSubtitle}>Share only what you are comfortable sharing. Review the summary before choosing what happens next.</p>
        {!submitted && <div className={styles.stageIndicator} aria-label={`Step ${stageIndex + 1} of 3: ${stageLabels[stageIndex]}`}><div className={styles.stageMeta}><span>Step {stageIndex + 1} of 3</span><span>{stageLabels[stageIndex]}</span></div><div className={styles.stageTrack}><span style={{ width: `${((stageIndex + 1) / 3) * 100}%` }} /></div></div>}
      </header>

      {submitted ? (
        <section style={{ ...box, textAlign: 'center', padding: '2rem' }}>
          <Check size={40} color="#059669" style={{ margin: '0 auto' }} />
          <h2>Request sent</h2>
          <p style={{ lineHeight: 1.65, color: 'var(--color-text-muted)' }}>Your request for legal assistance was sent. This does not file a charge with a court or prosecutor. You can track it in Cases.</p>
          <button style={primary} onClick={() => navigate('/public/cases')}>View my cases <ArrowRight size={17} /></button>
        </section>
      ) : stage === 'conversation' ? (
        <section style={{ ...box, padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border, #e2e8f0)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '.55rem', fontWeight: 700 }}><Scale size={19} color="var(--color-primary)" /> LAYA Triage</span>
            {messages.length > 1 && <button style={{ ...secondary, padding: '.5rem .7rem' }} onClick={reset}>Start over</button>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.9rem', padding: '1rem', minHeight: 300, maxHeight: '55vh', overflowY: 'auto' }}>
            {messages.map((message, index) => <div key={index} style={{ alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: 'min(88%, 650px)' }}>
              <div style={{ padding: '.85rem 1rem', borderRadius: 16, background: message.role === 'user' ? 'var(--color-primary, #2563eb)' : '#f1f5f9', color: message.role === 'user' ? '#fff' : 'var(--color-text, #1e293b)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{message.content}</div>
              {!!message.suggestions?.length && <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginTop: '.45rem' }}>{message.suggestions.map(suggestion => <button key={suggestion} style={secondary} onClick={() => send(suggestion)}>{suggestion}</button>)}</div>}
            </div>)}
            {loading && <div aria-live="polite" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '.55rem', color: 'var(--color-text-muted)', padding: '.65rem' }}><Loader2 className={styles.spin} size={17} />{loadingSlow ? 'Reviewing details—this is taking a little longer…' : 'Thinking about your concern…'}</div>}
          </div>
          {error && <p role="alert" style={{ color: '#b91c1c', padding: '0 1.25rem' }}>{error}</p>}
          <div style={{ padding: '1rem', borderTop: '1px solid var(--color-border, #e2e8f0)' }}>
            {file && <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.5rem', color: 'var(--color-text-muted)' }}><Paperclip size={15} />{file.name}<button style={{ border: 0, background: 'transparent', cursor: 'pointer' }} onClick={() => setFile(null)} aria-label="Remove attachment"><X size={15} /></button></div>}
            <textarea aria-label="Describe your concern" value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="Describe what happened or what you need help with…" rows={3} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', border: '1px solid var(--color-border, #cbd5e1)', borderRadius: 12, padding: '.8rem', font: 'inherit' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.7rem', marginTop: '.65rem', flexWrap: 'wrap' }}>
              <label style={{ ...secondary, cursor: 'pointer' }}><Paperclip size={16} /> Attach PDF or image<input type="file" accept="application/pdf,image/*" hidden onChange={event => setFile(event.target.files?.[0] || null)} /></label>
              <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                {reviewReady && !input.trim() && !file && <button style={primary} disabled={loading} onClick={() => void send('', 'assess')}><Sparkles size={16} /> Review my concern <ArrowRight size={17} /></button>}
                {!canReview && <button style={primary} disabled={loading || (!input.trim() && !file)} onClick={() => void send()}>{loading ? 'Sending…' : 'Send'} <ArrowRight size={17} /></button>}
              </div>
            </div>
          </div>
        </section>
      ) : stage === 'review' && assessment ? (
        <section style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ ...box, background: '#eff6ff', display: 'flex', gap: '.7rem', alignItems: 'center' }}><ShieldCheck color="#2563eb" /><div><strong>Review your concern</strong><div style={{ color: 'var(--color-text-muted)', fontSize: '.9rem' }}>Check or edit the summary. You decide what happens next.</div></div></div>
          <div style={box}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '1rem' }}><FileText color="var(--color-primary)" /><h2 style={{ margin: 0, fontSize: '1.1rem' }}>Concern summary</h2></div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '.86rem' }}>{intentLabel}</p>
            <div className={styles.reviewFields}>
              {renderReviewField('primary_issue', 'Main issue')}
              {renderReviewField('case_summary', 'Concern summary')}
              {renderReviewField('desired_outcome', 'What you would like to happen')}
            </div>
            <details className={styles.optionalDetails}>
              <summary>Other details (optional)</summary>
              <div className={styles.reviewFields}>
                {renderReviewField('category_of_law', 'Legal category')}
                {renderReviewField('opposing_party', 'Other party')}
                {renderReviewField('location', 'Location')}
                {renderReviewField('urgency', 'Urgency')}
                {renderReviewField('evidence', 'Evidence')}
                {renderReviewField('missing_details', 'Details still unknown')}
              </div>
            </details>
          </div>
          {!!assessment.legal_sources?.length && <div style={box}><h2 style={{ fontSize: '1rem' }}>Legal sources</h2><p style={{ fontSize: '.85rem', color: 'var(--color-text-muted)' }}>AI-generated research aids; check the authoritative source.</p>{assessment.legal_sources.map((source: any) => <div key={`${source.dataset}-${source.id}`} style={{ borderTop: '1px solid var(--color-border)', padding: '.8rem 0' }}><strong>{source.title}</strong><div style={{ display: 'flex', gap: '1rem', marginTop: '.4rem' }}><a href={source.url} target="_blank" rel="noreferrer">Juris record</a>{source.source_url && <a href={source.source_url} target="_blank" rel="noreferrer">Authoritative source</a>}</div></div>)}</div>}
          {assessment.research_unavailable && <p role="status">External legal sources could not be verified. No unverified citations were added.</p>}
          {intent !== 'seek_attorney' && !!assessment.possible_options?.length && <div style={box}><h2 style={{ fontSize: '1rem' }}>Possible options</h2>{assessment.possible_options.map((item: string, index: number) => <p key={index}>{item}</p>)}</div>}
          {!!assessment.practical_steps?.length && <div style={box}><h2 style={{ fontSize: '1rem' }}>Preparation and next steps</h2>{assessment.practical_steps.map((item: string, index: number) => <p key={index}>{item}</p>)}</div>}
          {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '.7rem', flexWrap: 'wrap' }}><button style={secondary} onClick={() => { setCorrection(assessment); setReviewReady(false); setStage('conversation'); }}><ArrowLeft size={16} /> Continue discussing</button><button style={primary} onClick={() => { if (assessment.lawyer_preference_provided) void startMatching(assessment.lawyer_preference || 'Any'); else setStage('preference'); }}>{intent === 'seek_attorney' ? 'Review and find an attorney' : 'Find an attorney'} <ArrowRight size={16} /></button><button style={secondary} onClick={() => navigate('/public/dashboard')}>Finish for now</button></div>
        </section>
      ) : stage === 'preference' ? (
        <section style={box}><h2 style={{ marginTop: 0 }}>Attorney service preference</h2><p>Choose a preference to help find suitable attorneys. You can also choose no preference.</p><div style={{ display: 'grid', gap: '.65rem' }}>{[
          ['Pro Bono', 'Request assistance without attorney fees, subject to eligibility and availability.'], ['Private', 'Discuss a paid engagement and fees directly with the attorney.'], ['Any', 'Consider attorneys offering either type of assistance.'],
        ].map(([value, detail]) => <button key={value} onClick={() => setPreference(value)} aria-pressed={preference === value} style={{ ...secondary, textAlign: 'left', justifyContent: 'flex-start', borderColor: preference === value ? '#2563eb' : undefined, background: preference === value ? '#eff6ff' : '#fff' }}><span style={{ fontWeight: 750 }}>{value === 'Any' ? 'No preference' : value}</span><span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>{detail}</span></button>)}</div><div style={{ display: 'flex', gap: '.6rem', marginTop: '1rem' }}><button style={secondary} onClick={() => setStage('review')}><ArrowLeft size={16} /> Back</button><button style={primary} disabled={!preference} onClick={() => void startMatching(preference)}>Find matching attorneys <ArrowRight size={16} /></button></div></section>
      ) : (
        <section style={{ display: 'grid', gap: '1rem' }}>
          <div style={box}><h2 style={{ marginTop: 0 }}>Choose next steps</h2><p>We’ll send a request for legal assistance—not file a charge or court case for you.</p></div>
          {isMatching ? <div style={box} role="status" aria-live="polite"><Loader2 className={styles.spin} /> Finding attorneys…</div> : <>
            {error && <p role="alert" style={{ ...box, color: '#b91c1c' }}>{error}</p>}
            {attorneys.map((attorney, index) => <button key={attorney.id} onClick={() => setSelectedAttorney(attorney.id)} style={{ ...box, cursor: 'pointer', display: 'flex', gap: '1rem', alignItems: 'center', textAlign: 'left', border: selectedAttorney === attorney.id ? '2px solid #2563eb' : undefined }}>
              {attorney.profile_photo_url && !failedPhotos.includes(attorney.id) ? <img src={attorney.profile_photo_url} alt="" onError={() => setFailedPhotos(current => [...current, attorney.id])} style={{ width: 58, height: 58, borderRadius: '50%', objectFit: 'cover' }} /> : <span aria-hidden style={{ width: 58, height: 58, borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8', display: 'grid', placeItems: 'center', fontWeight: 750 }}>{initials(attorney)}</span>}
              <span style={{ flex: 1 }}><strong>{index === 0 ? 'Recommended · ' : ''}Atty. {attorney.first_name} {attorney.last_name}</strong><br/><span style={{ color: 'var(--color-text-muted)' }}>{attorney.firm_name || 'Independent Counsel'} · {attorney.city_municipality || 'Philippines'}</span>{!!attorney.match_reasons?.length && <small style={{ display: 'block', marginTop: '.35rem' }}>{attorney.match_reasons.join(' · ')}</small>}</span>{selectedAttorney === attorney.id && <Check color="#2563eb" />}</button>)}
            <button onClick={() => setSelectedAttorney(null)} style={{ ...box, cursor: 'pointer', display: 'flex', gap: '.9rem', alignItems: 'center', textAlign: 'left', border: selectedAttorney === null ? '2px solid #2563eb' : undefined }}><span style={{ width: 48, height: 48, borderRadius: '50%', background: '#f1f5f9', display: 'grid', placeItems: 'center' }}><Search /></span><span><strong>Post to the open network</strong><br/><span style={{ color: 'var(--color-text-muted)' }}>Let registered attorneys review the request.</span></span></button>
            <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}><button style={secondary} onClick={() => setStage('review')}><ArrowLeft size={16} /> Back to review</button><button style={primary} disabled={selectedAttorney === undefined || isMatching} onClick={() => setConfirm(true)}>Continue to confirmation <ArrowRight size={16} /></button></div>
          </>}
        </section>
      )}

      {confirm && <div role="presentation" onClick={() => setConfirm(false)} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(15,23,42,.55)', display: 'grid', placeItems: 'center', padding: '1rem' }}><section role="dialog" aria-modal="true" aria-labelledby="triage-confirm-title" onClick={event => event.stopPropagation()} style={{ ...box, width: 'min(100%, 470px)' }}><h2 id="triage-confirm-title">Send legal-assistance request?</h2><p>JusticeLink will share your reviewed concern and selected attorney/network so they can respond. This does not file a charge with a court or prosecutor.</p><div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.6rem' }}><button style={secondary} onClick={() => setConfirm(false)}>Not yet</button><button style={primary} disabled={requesting} onClick={() => void submitRequest()}>{requesting ? <Loader2 className={styles.spin} size={17} /> : null}Confirm request</button></div></section></div>}
    </main>
  );
};

export default TriageView;
