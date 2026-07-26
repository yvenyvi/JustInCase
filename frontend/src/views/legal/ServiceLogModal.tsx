import React from 'react';
import { X, Clock, Upload, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { auditService } from '../../services/auditService';
import ConfirmModal from '../../components/ConfirmModal';
import styles from './LegalDashboard.module.css';

interface ActiveCase {
  id: string;
  title: string;
  client_id: string | null;
}

interface Props {
  preselectedCase?: ActiveCase;
  activeCases?: ActiveCase[];
  onClose: () => void;
  onLogged: () => void;
}

const MAX_MB = 10;

const ServiceLogModal: React.FC<Props> = ({ preselectedCase, activeCases = [], onClose, onLogged }) => {
  const { profile } = useAuth();

  const [caseId, setCaseId] = React.useState(preselectedCase?.id ?? '');
  const [description, setDescription] = React.useState('');
  const [hours, setHours] = React.useState('');
  const [evidenceFile, setEvidenceFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState('');
  const [showConfirm, setShowConfirm] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const selectedCase = preselectedCase ?? activeCases.find(c => c.id === caseId);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_MB} MB.`);
      return;
    }
    setError('');
    setEvidenceFile(f);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !caseId) return;

    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 24) {
      setError('Hours must be between 0.5 and 24.');
      return;
    }
    if (!description.trim()) {
      setError('Please describe the service rendered.');
      return;
    }

    setError('');
    setShowConfirm(true);
  };

  const doSave = async () => {
    if (!profile?.id || !caseId) return;
    const hoursNum = parseFloat(hours);
    setSaving(true);

    let evidenceUrl: string | null = null;
    let evidenceName: string | null = null;

    if (evidenceFile) {
      setUploading(true);
      const ext = evidenceFile.name.split('.').pop();
      const path = `pro-bono-evidence/${profile.id}/${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('documents')
        .upload(path, evidenceFile, { upsert: false });
      setUploading(false);

      if (uploadErr) {
        setError('Evidence upload failed. Try again.');
        setSaving(false);
        return;
      }

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(uploadData.path);
      evidenceUrl = urlData.publicUrl;
      evidenceName = evidenceFile.name;
    }

    const { error: insertErr } = await supabase.from('pro_bono_logs').insert({
      attorney_id: profile.id,
      case_id: caseId,
      description: description.trim(),
      hours: hoursNum,
      evidence_url: evidenceUrl,
      evidence_name: evidenceName,
    });

    if (insertErr) {
      setError('Failed to save log. Please try again.');
      setSaving(false);
      return;
    }

    if (selectedCase?.client_id) {
      await supabase.from('notifications').insert({
        user_id: selectedCase.client_id,
        title: 'Pro-Bono Hours Logged',
        body: `Atty. ${profile.first_name} ${profile.last_name} logged ${hoursNum} hour${hoursNum !== 1 ? 's' : ''} of service on your case "${selectedCase.title}". Please confirm this took place.`,
        link: '/public/notifications',
      });
    }

    auditService.log('Service Log Submitted', `Logged ${hoursNum}h for case ${caseId}`);
    setSaving(false);
    setDone(true);
    setTimeout(() => { onLogged(); onClose(); }, 1500);
  };

  const canSubmit = caseId && description.trim() && parseFloat(hours) > 0 && !saving;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '480px', boxShadow: '0 20px 56px rgba(0,0,0,0.2)', position: 'relative' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Clock size={20} color="var(--color-success)" />
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text)', margin: 0 }}>Log Service Hours</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0.25rem' }}>
            <X size={20} />
          </button>
        </div>

        {done ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1.5rem 0', color: 'var(--color-success)' }}>
            <CheckCircle size={40} />
            <p style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>Service log saved!</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>The client has been notified to verify.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Case selector — only shown when no case is preselected */}
            {!preselectedCase && (
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.825rem', marginBottom: '0.4rem', color: 'var(--color-text)' }}>Case</label>
                <select
                  value={caseId}
                  onChange={e => setCaseId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.6rem 0.875rem', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '0.875rem', backgroundColor: 'var(--color-background)', fontFamily: 'inherit' }}
                >
                  <option value="">Select a case…</option>
                  {activeCases.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
            )}

            {preselectedCase && (
              <div style={{ padding: '0.65rem 0.875rem', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                Case: <strong style={{ color: 'var(--color-text)' }}>{preselectedCase.title}</strong>
              </div>
            )}

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.825rem', marginBottom: '0.4rem', color: 'var(--color-text)' }}>Service Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Attended hearing at RTC Malolos, drafted demand letter, consulted with client for 2 hours…"
                rows={3}
                required
                style={{ width: '100%', padding: '0.65rem 0.875rem', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit', backgroundColor: 'var(--color-background)', boxSizing: 'border-box' }}
              />
            </div>

            {/* Hours */}
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.825rem', marginBottom: '0.4rem', color: 'var(--color-text)' }}>Hours Rendered</label>
              <input
                type="number"
                value={hours}
                onChange={e => setHours(e.target.value)}
                placeholder="e.g. 2.5"
                min="0.5"
                max="24"
                step="0.5"
                required
                style={{ width: '100%', padding: '0.6rem 0.875rem', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '0.875rem', backgroundColor: 'var(--color-background)', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>

            {/* Evidence upload */}
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.825rem', marginBottom: '0.4rem', color: 'var(--color-text)' }}>
                Proof of Service <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(optional — court slip, pleading, signed form)</span>
              </label>
              <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleFile} style={{ display: 'none' }} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px dashed var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text-muted)', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}
              >
                <Upload size={15} />
                {evidenceFile ? evidenceFile.name : 'Attach evidence file…'}
              </button>
            </div>

            {error && (
              <p style={{ fontSize: '0.825rem', color: '#ef4444', margin: 0 }}>{error}</p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'none', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', backgroundColor: canSubmit ? 'var(--color-success)' : 'var(--color-border)', color: canSubmit ? 'white' : 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.875rem', cursor: canSubmit ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'all 0.15s' }}
              >
                {uploading ? <><Loader2 size={15} className={styles.spin} /> Uploading…</> : saving ? <><Loader2 size={15} className={styles.spin} /> Saving…</> : <><Clock size={15} /> Submit Log</>}
              </button>
            </div>
          </form>
        )}
      </div>
      <ConfirmModal
        isOpen={showConfirm}
        title="Submit Service Log"
        message={`Log ${hours} hour${parseFloat(hours) !== 1 ? 's' : ''} for "${selectedCase?.title ?? 'this case'}"? The client will be notified to verify.`}
        confirmLabel="Submit Log"
        onConfirm={() => { setShowConfirm(false); doSave(); }}
        onCancel={() => setShowConfirm(false)}
        isLoading={saving}
      />
    </div>
  );
};

export default ServiceLogModal;
