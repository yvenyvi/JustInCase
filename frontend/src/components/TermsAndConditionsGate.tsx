import React, { useRef, useState } from 'react';
import { ScrollText, LogOut, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import TermsContent from './TermsContent';
// logo served from public/

const TermsAndConditionsGate: React.FC = () => {
  const { acceptTerms, signOut } = useAuth();
  const [checked, setChecked] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleAccept = async () => {
    if (!checked) return;
    setIsAccepting(true);
    await acceptTerms();
    // Profile state updates in AuthContext; gate unmounts automatically.
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'var(--color-background)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: 'var(--font-family-base)',
      overflowY: 'auto',
    }}>
      {/* Top bar */}
      <div style={{
        width: '100%',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        padding: '1rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        flexShrink: 0,
      }}>
        <img src="/logo.svg" alt="JusticeLink" style={{ width: 28, height: 28 }} />
        <span style={{
          fontFamily: 'var(--font-family-display)',
          fontSize: '1.15rem',
          fontWeight: 600,
          color: 'var(--color-secondary)',
        }}>
          JusticeLink
        </span>
      </div>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 720,
        margin: '2rem auto',
        padding: '0 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '14px',
            background: 'rgba(37,99,235,0.08)',
            border: '1px solid rgba(37,99,235,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <ScrollText size={24} color="var(--color-primary)" />
          </div>
          <div>
            <h1 style={{
              fontSize: '1.4rem',
              fontWeight: 700,
              color: 'var(--color-secondary)',
              fontFamily: 'var(--font-family-display)',
              margin: '0 0 0.3rem',
            }}>
              Terms and Conditions
            </h1>
            <p style={{
              fontSize: '0.9rem',
              color: 'var(--color-text-muted)',
              margin: 0,
              lineHeight: 1.5,
            }}>
              Before you continue, please read and accept the JusticeLink Terms and Conditions.
              This is required for all users.
            </p>
          </div>
        </div>

        {/* Scrollable T&C content */}
        <div
          ref={scrollRef}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '14px',
            padding: '1.5rem 1.75rem',
            maxHeight: '55vh',
            overflowY: 'auto',
            scrollBehavior: 'smooth',
          }}
        >
          <TermsContent compact />
        </div>

        {/* Acceptance controls */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '14px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          {/* Checkbox */}
          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            cursor: 'pointer',
            userSelect: 'none',
          }}>
            <div style={{ position: 'relative', flexShrink: 0, marginTop: '2px' }}>
              <input
                type="checkbox"
                checked={checked}
                onChange={e => setChecked(e.target.checked)}
                style={{
                  width: 20,
                  height: 20,
                  accentColor: 'var(--color-primary)',
                  cursor: 'pointer',
                }}
              />
            </div>
            <span style={{
              fontSize: '0.9rem',
              color: 'var(--color-text-main)',
              lineHeight: 1.55,
            }}>
              I have read and understood the JusticeLink Terms and Conditions, and I agree to
              be bound by them. I understand that JusticeLink is a facilitation platform, not a
              law firm, and that use of this platform does not create an attorney-client relationship.
            </span>
          </label>

          {/* Action buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}>
            <button
              onClick={() => void signOut()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.1rem',
                background: 'none',
                border: '1px solid var(--color-border)',
                borderRadius: '10px',
                color: 'var(--color-text-muted)',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'var(--font-family-base)',
              }}
            >
              <LogOut size={15} /> Sign out
            </button>

            <button
              onClick={() => void handleAccept()}
              disabled={!checked || isAccepting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.5rem',
                background: checked ? 'var(--color-primary)' : 'var(--color-border)',
                border: 'none',
                borderRadius: '10px',
                color: checked ? 'white' : 'var(--color-text-muted)',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: checked ? 'pointer' : 'not-allowed',
                transition: 'background 0.18s, color 0.18s',
                fontFamily: 'var(--font-family-base)',
                opacity: isAccepting ? 0.7 : 1,
              }}
            >
              <CheckCircle2 size={17} />
              {isAccepting ? 'Saving…' : 'I Agree — Continue'}
            </button>
          </div>
        </div>

        {/* Footer note */}
        <p style={{
          textAlign: 'center',
          fontSize: '0.78rem',
          color: 'var(--color-text-muted)',
          marginBottom: '2rem',
          lineHeight: 1.5,
        }}>
          You can view these Terms at any time from your account settings.
          For questions, contact us at{' '}
          <a href="mailto:justicelink.ph@gmail.com" style={{ color: 'var(--color-primary)' }}>
            justicelink.ph@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
};

export default TermsAndConditionsGate;
