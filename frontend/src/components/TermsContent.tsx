import React from 'react';

/**
 * TermsContent — the canonical T&C text for LAYA Philippines.
 * Rendered inside both the first-login gate and the viewable settings page.
 * Accepts an optional `compact` prop to reduce heading size inside a modal.
 */
const TermsContent: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const h2Style: React.CSSProperties = {
    fontSize: compact ? '0.95rem' : '1.05rem',
    fontWeight: 700,
    color: 'var(--color-secondary)',
    marginTop: '1.5rem',
    marginBottom: '0.4rem',
  };
  const pStyle: React.CSSProperties = {
    fontSize: compact ? '0.875rem' : '0.9375rem',
    color: 'var(--color-text-main)',
    lineHeight: 1.75,
    marginBottom: '0.5rem',
    margin: '0 0 0.5rem',
  };
  const liStyle: React.CSSProperties = {
    fontSize: compact ? '0.875rem' : '0.9375rem',
    color: 'var(--color-text-main)',
    lineHeight: 1.75,
    marginBottom: '0.25rem',
  };

  return (
    <div style={{ fontFamily: 'var(--font-family-base)' }}>
      {/* Preamble */}
      <p style={{ ...pStyle, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
        Effective Date: January 1, 2025 &nbsp;·&nbsp; Version 1.0
      </p>
      <p style={pStyle}>
        Welcome to <strong>LAYA Philippines</strong>. Before using our platform, please read
        these Terms and Conditions carefully. By clicking "I Agree," you confirm that you have read,
        understood, and agree to be bound by these terms.
      </p>

      <h2 style={h2Style}>1. About LAYA</h2>
      <p style={pStyle}>
        LAYA is a non-profit digital legal aid facilitation platform that connects Filipino
        citizens with volunteer attorneys and provides access to legal resources and information.
        <strong> LAYA is not a law firm</strong> and does not provide legal advice, legal
        representation, or legal opinions.
      </p>

      <h2 style={h2Style}>2. No Attorney-Client Relationship</h2>
      <p style={pStyle}>
        Use of this platform does not, by itself, create an attorney-client relationship between you
        and LAYA, its administrators, or any volunteer attorney listed on the platform. An
        attorney-client relationship is only established when a formal engagement letter or retainer
        agreement has been executed directly between you and the attorney.
      </p>

      <h2 style={h2Style}>3. Nature of Information Provided</h2>
      <p style={pStyle}>
        All information on LAYA — including document templates, rights articles, triage
        assessments, and AI-assisted responses (Kampi) — is provided for <strong>general
        informational and self-advocacy purposes only</strong>. It is not a substitute for
        professional legal counsel from a licensed attorney admitted to the Philippine Bar.
      </p>

      <h2 style={h2Style}>4. Volunteer Attorneys</h2>
      <p style={pStyle}>
        Attorneys registered on LAYA provide services on a <strong>pro bono, voluntary
        basis</strong>. LAYA does not guarantee the availability, response time, quality, or
        outcome of any attorney engagement. Volunteer attorneys are independent professionals and
        are not employees, agents, or representatives of LAYA.
      </p>

      <h2 style={h2Style}>5. User Responsibilities</h2>
      <p style={{ ...pStyle, marginBottom: '0.25rem' }}>By using LAYA, you agree to:</p>
      <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
        <li style={liStyle}>Provide accurate, truthful, and complete information in all forms and communications</li>
        <li style={liStyle}>Use the platform solely for legitimate legal assistance purposes</li>
        <li style={liStyle}>Treat all attorneys, staff, and fellow users with respect and dignity</li>
        <li style={liStyle}>Not submit false, misleading, fraudulent, or duplicate case requests</li>
        <li style={liStyle}>Not use the platform for any unlawful, harassing, or abusive purpose</li>
        <li style={liStyle}>Not upload malicious files or attempt to compromise platform security</li>
        <li style={liStyle}>Not misrepresent your identity or professional credentials</li>
      </ul>

      <h2 style={h2Style}>6. Data Privacy</h2>
      <p style={pStyle}>
        LAYA collects and processes personal data in accordance with{' '}
        <strong>Republic Act No. 10173 (Data Privacy Act of the Philippines)</strong> and its
        implementing rules. Your personal information is used solely to facilitate legal aid
        matching, secure communications, and service delivery. We do not sell, trade, or share
        your personal data with third parties for commercial purposes.
      </p>
      <p style={pStyle}>
        You have the right to access, correct, and request deletion of your personal data stored on
        LAYA. To exercise these rights, contact us at{' '}
        <strong>justicelink.ph@gmail.com</strong>.
      </p>

      <h2 style={h2Style}>7. Platform Limitations and Disclaimer</h2>
      <p style={{ ...pStyle, marginBottom: '0.25rem' }}>LAYA does not guarantee:</p>
      <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
        <li style={liStyle}>Uninterrupted, error-free, or continuous platform availability</li>
        <li style={liStyle}>A specific attorney match or acceptance for every case submitted</li>
        <li style={liStyle}>Any particular outcome or resolution of your legal matter</li>
        <li style={liStyle}>The accuracy, completeness, or timeliness of AI-generated content</li>
        <li style={liStyle}>That document templates are suitable for your specific circumstances</li>
      </ul>

      <h2 style={h2Style}>8. Intellectual Property</h2>
      <p style={pStyle}>
        All content on LAYA — including but not limited to document templates, rights
        articles, platform design, and software — is the property of LAYA Philippines and
        its respective authors. Reproduction, distribution, or commercial use of any content without
        prior written permission is strictly prohibited.
      </p>

      <h2 style={h2Style}>9. Termination of Access</h2>
      <p style={pStyle}>
        LAYA reserves the right to suspend or permanently revoke access to any account that
        violates these Terms and Conditions, engages in abusive or fraudulent conduct, or is found
        to be misusing the platform's resources or attorney network.
      </p>

      <h2 style={h2Style}>10. Changes to These Terms</h2>
      <p style={pStyle}>
        LAYA may update these Terms and Conditions from time to time. You will be notified of
        material changes, and continued use of the platform after such changes constitutes acceptance
        of the revised terms. The effective date at the top of this document reflects the most recent
        revision.
      </p>

      <h2 style={h2Style}>11. Governing Law</h2>
      <p style={pStyle}>
        These Terms and Conditions are governed by and construed in accordance with the laws of the
        Republic of the Philippines. Any dispute arising under these terms shall be subject to the
        exclusive jurisdiction of the appropriate courts of the Philippines.
      </p>

      <h2 style={h2Style}>12. Contact Us</h2>
      <p style={pStyle}>
        For questions, concerns, or data privacy requests regarding these Terms and Conditions,
        please reach us at:
      </p>
      <p style={{ ...pStyle, fontWeight: 600 }}>
        📧 justicelink.ph@gmail.com
      </p>
    </div>
  );
};

export default TermsContent;
