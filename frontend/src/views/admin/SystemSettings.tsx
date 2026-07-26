import { useState, useEffect, useRef } from 'react';
import {
  Monitor,
  Check,
  AlertCircle,
  Loader2,
  Download,
  Upload,
  ShieldCheck,
  Save,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { auditService } from '../../services/auditService';
import styles from './SystemSettings.module.css';

interface Settings {
  maintenance_mode: boolean;
}

const DEFAULTS: Settings = {
  maintenance_mode: false,
};

const rowToSettings = (rows: { key: string; value: string }[]): Settings => {
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return {
    maintenance_mode: map.maintenance_mode === 'true',
  };
};

const settingsToRows = (s: Settings): { key: string; value: string }[] =>
  Object.entries(s).map(([key, value]) => ({ key, value: String(value) }));

const SystemSettings = () => {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'preview' | 'restoring' | 'done' | 'error'>('idle');
  const [restorePreview, setRestorePreview] = useState<Settings | null>(null);
  const [restoreError, setRestoreError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('system_settings').select('key, value');
      if (data && data.length > 0) setSettings(rowToSettings(data));
      setIsLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaveStatus('saving');
    const rows = settingsToRows(settings);
    const now = new Date().toISOString();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('system_settings')
      .upsert(
        rows.map(r => ({ ...r, updated_at: now, updated_by: user?.id ?? null })),
        { onConflict: 'key' }
      );

    if (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return;
    }

    auditService.log('Profile Updated', 'Updated system settings');
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2500);
  };

  const handleBackup = () => {
    const blob = new Blob(
      [JSON.stringify({ version: '1.0', timestamp: new Date().toISOString(), platform: 'JusticeLink PH', settings }, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `justicelink-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    auditService.log('Profile Updated', 'Downloaded system settings backup');
  };

  const handleRestoreFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!parsed.settings || typeof parsed.settings !== 'object') {
          throw new Error('Invalid backup file: missing settings object.');
        }
        const restored: Settings = {
          maintenance_mode: String(parsed.settings.maintenance_mode) === 'true',
        };
        setRestorePreview(restored);
        setRestoreStatus('preview');
      } catch (err: any) {
        setRestoreError(err.message || 'Could not parse backup file.');
        setRestoreStatus('error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRestoreConfirm = async () => {
    if (!restorePreview) return;
    setRestoreStatus('restoring');
    const now = new Date().toISOString();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('system_settings').upsert(
      settingsToRows(restorePreview).map(r => ({ ...r, updated_at: now, updated_by: user?.id ?? null })),
      { onConflict: 'key' }
    );
    if (error) {
      setRestoreError('Failed to restore settings: ' + error.message);
      setRestoreStatus('error');
      return;
    }
    setSettings(restorePreview);
    auditService.log('Profile Updated', 'Restored system settings from backup file');
    setRestorePreview(null);
    setRestoreStatus('done');
    setTimeout(() => setRestoreStatus('idle'), 3000);
  };

  const handleRestoreCancel = () => {
    setRestorePreview(null);
    setRestoreStatus('idle');
    setRestoreError('');
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <Loader2 size={28} color="var(--color-primary)" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>System Settings</h1>
          <p className={styles.subtitle}>Manage platform operational status and configuration backups.</p>
        </div>
        <button
          className={`${styles.saveBtn} ${saveStatus === 'saved' ? styles.saved : ''} ${saveStatus === 'error' ? styles.error : ''}`}
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
        >
          {saveStatus === 'saving' ? (
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          ) : saveStatus === 'saved' ? (
            <Check size={18} />
          ) : saveStatus === 'error' ? (
            <AlertCircle size={18} />
          ) : (
            <Save size={18} />
          )}
          {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : saveStatus === 'error' ? 'Save Failed' : 'Save Changes'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', maxWidth: '860px' }}>
        {/* System Status */}
        <div className={`${styles.card} ${settings.maintenance_mode ? styles.maintenanceActive : ''}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <Monitor size={20} className={styles.cardIcon} />
              <h2 className={styles.cardTitle}>System Status</h2>
            </div>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <div className={styles.settingLabel}>Maintenance Mode</div>
                <div className={styles.settingDesc}>Public access will be restricted to a maintenance page.</div>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={settings.maintenance_mode}
                  onChange={e => setSettings(prev => ({ ...prev, maintenance_mode: e.target.checked }))}
                />
                <span className={styles.slider}></span>
              </label>
            </div>
            {settings.maintenance_mode && (
              <div className={styles.alertBox}>
                <AlertCircle size={18} />
                <span>Platform will be restricted to Administrators after saving.</span>
              </div>
            )}
          </div>
        </div>

        {/* Backup & Restore */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <ShieldCheck size={20} className={styles.cardIcon} />
              <h2 className={styles.cardTitle}>Backup & Restore</h2>
            </div>
          </div>
          <div className={styles.cardContent}>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
              Export current settings to a JSON file, or restore from a previous backup.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <button
                onClick={handleBackup}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'none', color: 'var(--color-text)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', width: '100%' }}
              >
                <Download size={16} />
                Download Backup (.json)
              </button>

              <input ref={fileInputRef} type="file" accept=".json" onChange={handleRestoreFileChange} style={{ display: 'none' }} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={restoreStatus === 'restoring'}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'none', color: 'var(--color-text)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', width: '100%' }}
              >
                <Upload size={16} />
                Restore from Backup...
              </button>
            </div>

            {restoreStatus === 'preview' && restorePreview && (
              <div style={{ marginTop: '1rem', padding: '0.875rem', backgroundColor: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.25)', borderRadius: '8px' }}>
                <p style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--color-primary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Preview — Settings to Restore</p>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>maintenance mode</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{String(restorePreview.maintenance_mode)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={handleRestoreConfirm} style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', backgroundColor: 'var(--color-primary)', color: 'white', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                    Confirm Restore
                  </button>
                  <button onClick={handleRestoreCancel} style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'none', color: 'var(--color-text)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {restoreStatus === 'restoring' && (
              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                Restoring settings…
              </div>
            )}
            {restoreStatus === 'done' && (
              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--color-success)' }}>
                <Check size={14} /> Settings restored successfully.
              </div>
            )}
            {restoreStatus === 'error' && (
              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8rem', color: '#ef4444' }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                {restoreError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
