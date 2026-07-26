import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Button from './Button';
import ConfirmModal from './ConfirmModal';
import { auditService } from '../services/auditService';
import { Lock, AlertCircle, X, Loader2 } from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  role?: 'public' | 'legal' | 'admin';
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-background)',
  color: 'var(--color-text)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: 500,
  marginBottom: '0.5rem',
};

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, role }) => {
  const { profile, updateProfile } = useAuth();
  const isLegal = role === 'legal';
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showConfirm, setShowConfirm] = React.useState(false);

  // Shared contact/location fields
  const [phone, setPhone] = React.useState('');
  const [streetAddress, setStreetAddress] = React.useState('');
  const [barangay, setBarangay] = React.useState('');
  const [city, setCity] = React.useState('');
  const [province, setProvince] = React.useState('');
  const [region, setRegion] = React.useState('');

  // Legal-only fields
  const [firstName, setFirstName] = React.useState('');
  const [middleName, setMiddleName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [suffix, setSuffix] = React.useState('');
  const [firmName, setFirmName] = React.useState('');
  const [ibpNumber, setIbpNumber] = React.useState('');
  const [rollNumber, setRollNumber] = React.useState('');
  const [selectedLanguages, setSelectedLanguages] = React.useState<string[]>(['Filipino', 'English']);

  React.useEffect(() => {
    if (isOpen && profile) {
      setPhone(profile.phone_number || '');
      setStreetAddress(profile.street_address || '');
      setBarangay(profile.barangay || '');
      setCity(profile.city_municipality || '');
      setProvince(profile.province || '');
      setRegion(profile.region || '');
      setFirstName(profile.first_name || '');
      setMiddleName(profile.middle_name || '');
      setLastName(profile.last_name || '');
      setSuffix(profile.suffix || '');
      setFirmName(profile.firm_name || '');
      setIbpNumber(profile.ibp_number || '');
      setRollNumber(profile.roll_number || '');
      const saved = profile.languages || profile.language || 'Filipino, English';
      setSelectedLanguages(saved.split(',').map(l => l.trim()).filter(Boolean));
    }
  }, [isOpen, profile]);

  if (!isOpen || !profile) return null;

  const EDIT_COOLDOWN_DAYS = 30;
  let daysSinceUpdate = 999;
  let nextAllowedDate = new Date();
  if (profile.last_details_update) {
    const lastUpdate = new Date(profile.last_details_update);
    const diffTime = Math.abs(new Date().getTime() - lastUpdate.getTime());
    daysSinceUpdate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    nextAllowedDate = new Date(lastUpdate);
    nextAllowedDate.setDate(nextAllowedDate.getDate() + EDIT_COOLDOWN_DAYS);
  }
  const isLocked = daysSinceUpdate < EDIT_COOLDOWN_DAYS;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setError(null);
    setShowConfirm(true);
  };

  const doSave = async () => {
    setIsLoading(true);
    setError(null);

    const updates: Record<string, any> = {
      phone_number: phone,
      street_address: streetAddress,
      barangay,
      city_municipality: city,
      province,
      region,
      last_details_update: new Date().toISOString(),
    };

    if (isLegal) {
      updates.first_name = firstName.trim();
      updates.middle_name = middleName.trim() || null;
      updates.last_name = lastName.trim();
      updates.suffix = suffix.trim() || null;
      updates.firm_name = firmName.trim() || null;
      updates.ibp_number = ibpNumber.trim();
      updates.roll_number = rollNumber.trim();
      (updates as any).languages = selectedLanguages.length > 0 ? selectedLanguages.join(', ') : 'Filipino, English';
    }

    const { error: updateError } = await updateProfile(updates);
    setIsLoading(false);

    if (updateError) {
      setError(typeof updateError === 'string' ? updateError : updateError.message || 'Failed to update profile.');
    } else {
      auditService.log('Profile Updated', `User updated their profile (${isLegal ? 'attorney' : 'citizen'})`);
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.35)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: isLegal ? '860px' : '520px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--color-border)'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)' }}>Edit Profile</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {isLocked ? (
            <div style={{
              backgroundColor: 'var(--color-background)',
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border)' }}>
                <Lock size={24} color="var(--color-text-muted)" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text)' }}>Edits are Temporarily Locked</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                  To maintain the integrity of accounts, details can only be changed once every 30 days.
                </p>
                <div style={{ marginTop: '1.5rem', padding: '0.75rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', display: 'inline-block' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                    You can edit again on:<br/>
                    <span style={{ color: 'var(--color-primary)' }}>
                      {new Intl.DateTimeFormat('en-PH', { dateStyle: 'long' }).format(nextAllowedDate)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--color-primary)', marginBottom: '1.5rem' }}>
                <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '1px' }} />
                <p style={{ fontSize: '0.875rem' }}>
                  {isLegal
                    ? 'You can update your personal details, contact information, and professional credentials below.'
                    : 'Your name is locked as it is tied to your Didit identity verification. You may only update contact and location details.'}
                </p>
              </div>

              {error && (
                <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                  {error}
                </div>
              )}

              {/* Two-column layout for legal, single column for public */}
              <div style={{ display: isLegal ? 'grid' : 'flex', gridTemplateColumns: isLegal ? '1fr 1fr' : undefined, flexDirection: isLegal ? undefined : 'column', gap: '0 2rem' }}>

                {/* LEFT column: Personal + Credentials */}
                {isLegal && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>Personal Information</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={labelStyle}>First Name</label>
                        <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={inputStyle} required />
                      </div>
                      <div>
                        <label style={labelStyle}>Middle Name</label>
                        <input type="text" value={middleName} onChange={(e) => setMiddleName(e.target.value)} style={inputStyle} placeholder="Optional" />
                      </div>
                      <div>
                        <label style={labelStyle}>Last Name</label>
                        <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} style={inputStyle} required />
                      </div>
                      <div>
                        <label style={labelStyle}>Suffix</label>
                        <select value={suffix} onChange={(e) => setSuffix(e.target.value)} style={inputStyle}>
                          <option value="">None</option>
                          <option value="Jr.">Jr.</option>
                          <option value="Sr.">Sr.</option>
                          <option value="II">II</option>
                          <option value="III">III</option>
                          <option value="IV">IV</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>Professional Credentials</p>
                      <div>
                        <label style={labelStyle}>Firm / Law Office Name</label>
                        <input type="text" value={firmName} onChange={(e) => setFirmName(e.target.value)} style={inputStyle} placeholder="e.g. Santos & Associates Law Office" />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={labelStyle}>IBP Number</label>
                          <input type="text" value={ibpNumber} onChange={(e) => setIbpNumber(e.target.value)} style={inputStyle} placeholder="e.g. 123456" />
                        </div>
                        <div>
                          <label style={labelStyle}>Roll Number</label>
                          <input type="text" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} style={inputStyle} placeholder="e.g. 12345" />
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>Languages Spoken</label>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                          {['Filipino', 'English', 'Cebuano', 'Ilocano', 'Hiligaynon'].map(lang => (
                            <label key={lang} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={selectedLanguages.includes(lang)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedLanguages(prev => [...prev, lang]);
                                  else setSelectedLanguages(prev => prev.filter(l => l !== lang));
                                }}
                              />
                              {lang}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* RIGHT column (legal) or single column (public): Contact & Location */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: isLegal ? '1px solid var(--color-border)' : 'none', paddingLeft: isLegal ? '2rem' : '0' }}>
                  {isLegal && <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>Contact & Location</p>}

                  <div>
                    <label style={labelStyle}>Phone Number</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} placeholder="e.g. +63 912 345 6789" />
                  </div>

                  <div>
                    <label style={labelStyle}>Street Address</label>
                    <input type="text" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} style={inputStyle} placeholder="House No., Street Name" />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={labelStyle}>Barangay</label>
                      <input type="text" value={barangay} onChange={(e) => setBarangay(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>City / Municipality</label>
                      <input type="text" value={city} onChange={(e) => setCity(e.target.value)} style={inputStyle} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={labelStyle}>Province</label>
                      <input type="text" value={province} onChange={(e) => setProvince(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Region</label>
                      <input type="text" value={region} onChange={(e) => setRegion(e.target.value)} style={inputStyle} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
                <Button variant="primary" type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Save Changes'}
                </Button>
              </div>
            </form>
          )}
        </div>

        {isLocked && (
          <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" onClick={onClose}>Understood</Button>
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={showConfirm}
        title="Save Profile Changes"
        message="Save these changes to your profile? Details can only be edited once every 30 days."
        confirmLabel="Save Changes"
        onConfirm={() => { setShowConfirm(false); doSave(); }}
        onCancel={() => setShowConfirm(false)}
        isLoading={isLoading}
      />
    </div>
  );
};

export default EditProfileModal;
