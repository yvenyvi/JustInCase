import React, { useMemo, useState } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle, AlertTriangle, Loader2, ShieldCheck, Clock, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  PRO_BONO_TARGET_HOURS_3Y,
  checkIncomeEligibility,
  triageService,
  type TriageInput,
  type TriageLawyerMatch,
} from '../../services/triageService';
import { auditService } from '../../services/auditService';
import styles from './TriageView.module.css';

const TriageView = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    category: '',
    urgency: '' as '' | 'high' | 'medium' | 'low',
    income: '',
    province: '',
    concernSummary: '',
    opposingPartyType: '',
    hasDeadline: false,
    deadlineDate: '',
    hasDocuments: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [matches, setMatches] = useState<TriageLawyerMatch[]>([]);
  const [selectedAttorneyId, setSelectedAttorneyId] = useState<string>('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const incomeEligibility = useMemo(
    () => (formData.income ? checkIncomeEligibility(formData.income) : null),
    [formData.income],
  );

  const canGoStepTwo =
    Boolean(formData.category) &&
    Boolean(formData.urgency) &&
    Boolean(formData.income) &&
    Boolean(formData.province.trim()) &&
    incomeEligibility?.status !== 'blocked';

  const canSubmit =
    Boolean(formData.concernSummary.trim()) &&
    Boolean(formData.opposingPartyType) &&
    (!formData.hasDeadline || Boolean(formData.deadlineDate));

  const topMatch = useMemo(() => matches[0] || null, [matches]);

  const updateField = <K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => setStep((prev) => Math.min(prev + 1, 3));
  const handlePrev = () => setStep((prev) => Math.max(prev - 1, 1));

  const handleRequestConsultation = async () => {
    if (!caseId || !selectedAttorneyId) return;
    setIsRequesting(true);
    setRequestError('');
    const { data: claimed, error } = await supabase
      .from('cases')
      .update({ attorney_id: selectedAttorneyId, status: 'Pending Acceptance', attorney_assigned_at: new Date().toISOString() })
      .eq('id', caseId)
      .eq('status', 'Pending Triage')
      .is('attorney_id', null)
      .select('id');
    if (!error && claimed && claimed.length > 0) {
      await supabase.from('notifications').insert({
        user_id: selectedAttorneyId,
        title: 'New Case Pending Your Confirmation',
        body: 'A client has selected you for their legal case. Please review it in your Cases page and accept or decline.',
        link: '/legal/cases',
      });
      auditService.log('Attorney Matched', `Requested consultation with attorney ${selectedAttorneyId} for case ${caseId}`);
      setRequested(true);
    } else if (!error) {
      setRequestError('Ang kaso ay nakunan na ng ibang abogado habang ikaw ay pumipili. I-refresh ang page at subukang muli.');
    } else {
      setRequestError('Hindi naipadala ang kahilingan. Subukan ulit o i-refresh ang page.');
    }
    setIsRequesting(false);
  };

  const handleFindMatches = async () => {
    if (!user?.id) {
      setSubmitError('Kailangan mong mag-login muli para ma-save ang triage case mo.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    setWarnings([]);

    const payload: TriageInput = {
      userId: user.id,
      category: formData.category,
      urgency: formData.urgency || 'medium',
      incomeBracket: formData.income,
      province: formData.province.trim(),
      region: profile?.region || undefined,
      concernSummary: formData.concernSummary.trim(),
      opposingPartyType: formData.opposingPartyType,
      hasDeadline: formData.hasDeadline,
      deadlineDate: formData.deadlineDate || undefined,
      hasDocuments: formData.hasDocuments,
    };

    try {
      const result = await triageService.runPhaseOneTriage(payload);
      setCaseId(result.caseId);
      setMatches(result.matches);
      setSelectedAttorneyId(result.matches[0]?.attorneyId || '');
      setWarnings(result.warnings);
      auditService.log('Triage Submitted', `Submitted triage for category: "${formData.category}" (${formData.urgency} urgency)`);
      setStep(3);
    } catch (error) {
      console.error('Triage submission failed:', error);
      setSubmitError('Nagka-problema sa pag-process ng triage. Subukan ulit sa loob ng ilang sandali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.triageContainer}>
      <div className={styles.header}>
        <div className={styles.badgePrimary}>Triage System</div>
        <h1 className={styles.title}>Alamin natin ang tamang tulong para sa'yo.</h1>
        <p className={styles.subtitle}>
          Phase 1: Sagutin muna ang basic questions, saka mo ilahad ang concern details para ma-match ka sa pinaka-angkop na pro-bono lawyer.
        </p>
      </div>

      <div className={styles.formCard}>
        {/* Progress Bar */}
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${(step / 3) * 100}%` }}></div>
          </div>
          <span className={styles.progressText}>Hakbang {step} ng 3</span>
        </div>

        {/* Step 1: Basic Questions */}
        {step === 1 && (
          <div className="animate-enter">
            <h2 className={styles.questionTitle}>Basic Questions</h2>

            <div className={styles.sectionBlock}>
              <h3 className={styles.sectionTitle}>1) Ano ang uri ng iyong problemang legal?</h3>
              <div className={styles.optionsGrid}>
                {[
                  'Housing, Lupa & Eviction',
                  'Labor & Employment (Trabaho)',
                  'Family & VAWC (Violence Against Women)',
                  'Criminal Cases',
                  'Debt & Small Claims',
                  'Iba pang Civil Matters',
                ].map((cat) => (
                  <div key={cat} className={styles.optionCard}>
                    <input
                      type="radio"
                      name="category"
                      id={cat}
                      className={styles.radioInput}
                      checked={formData.category === cat}
                      onChange={() => updateField('category', cat)}
                    />
                    <label htmlFor={cat} className={styles.optionLabel}>{cat}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.sectionBlock}>
              <h3 className={styles.sectionTitle}>2) Gaano ka-urgent ito?</h3>
              <select
                className={styles.selectInput}
                value={formData.urgency}
                onChange={(event) => updateField('urgency', event.target.value as 'high' | 'medium' | 'low')}
              >
                <option value="">Pumili ng urgency</option>
                <option value="high">High - may immediate risk / deadline</option>
                <option value="medium">Medium - kailangan ng legal guidance soon</option>
                <option value="low">Low - planning and preventive legal help</option>
              </select>
            </div>
            <div className={styles.sectionBlock}>
              <h3 className={styles.sectionTitle}>3) Monthly household income</h3>
              <select
                className={styles.selectInput}
                value={formData.income}
                onChange={(event) => updateField('income', event.target.value)}
              >
                <option value="">Pumili ng income bracket</option>
                <option value="Below ₱15,000/buwan">Below ₱15,000/buwan</option>
                <option value="₱15,001 - ₱25,000/buwan">₱15,001 - ₱25,000/buwan</option>
                <option value="₱25,001 - ₱50,000/buwan">₱25,001 - ₱50,000/buwan</option>
                <option value="Higit sa ₱50,000/buwan">Higit sa ₱50,000/buwan</option>
              </select>
              {incomeEligibility && incomeEligibility.status !== 'eligible' && (
                <div
                  className={
                    incomeEligibility.status === 'blocked' ? styles.errorBanner : styles.warningBanner
                  }
                  style={{ marginTop: '0.75rem' }}
                >
                  <AlertTriangle size={18} />
                  <span>{incomeEligibility.message}</span>
                </div>
              )}
            </div>

            <div className={styles.fieldBlock}>
              <label htmlFor="province" className={styles.inputLabel}>4) Saan ang iyong kaso? (Province/City)</label>
              <input
                id="province"
                className={styles.textInput}
                value={formData.province}
                placeholder={profile?.province || 'Halimbawa: Metro Manila'}
                onChange={(event) => updateField('province', event.target.value)}
              />
            </div>

            <div className={styles.formActions}>
              <div></div> {/* Empty div for flex spacing */}
              <button onClick={handleNext} className={styles.primaryBtn} disabled={!canGoStepTwo}>
                Susunod <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Concern Details */}
        {step === 2 && (
          <div className="animate-enter">
            <h2 className={styles.questionTitle}>Concern Details</h2>

            <div className={styles.fieldBlock}>
              <label htmlFor="concernSummary" className={styles.inputLabel}>Ikwento mo ang concern mo (required)</label>
              <textarea
                id="concernSummary"
                className={styles.textArea}
                rows={5}
                value={formData.concernSummary}
                placeholder="Halimbawa: May nareceive akong eviction notice at may 7 araw na lang bago paalisin sa inuupahan..."
                onChange={(event) => updateField('concernSummary', event.target.value)}
              />
            </div>

            <div className={styles.fieldsRow}>
              <div className={styles.fieldBlock}>
                <label htmlFor="opposingPartyType" className={styles.inputLabel}>Sino ang kabilang panig?</label>
                <select
                  id="opposingPartyType"
                  className={styles.selectInput}
                  value={formData.opposingPartyType}
                  onChange={(event) => updateField('opposingPartyType', event.target.value)}
                >
                  <option value="">Pumili ng option</option>
                  <option value="individual">Individual</option>
                  <option value="employer">Employer</option>
                  <option value="landlord">Landlord/Property owner</option>
                  <option value="spouse_or_family">Spouse/Family member</option>
                  <option value="company">Company/Organization</option>
                  <option value="government">Government office</option>
                </select>
              </div>
            </div>

            <div className={styles.fieldsRow}>
              <div className={styles.fieldBlock}>
                <label className={styles.inputLabel}>May legal deadline ba?</label>
                <div className={styles.switchRow}>
                  <button
                    type="button"
                    className={`${styles.toggleBtn} ${formData.hasDeadline ? styles.toggleBtnActive : ''}`}
                    onClick={() => updateField('hasDeadline', true)}
                  >
                    Meron
                  </button>
                  <button
                    type="button"
                    className={`${styles.toggleBtn} ${!formData.hasDeadline ? styles.toggleBtnActive : ''}`}
                    onClick={() => {
                      updateField('hasDeadline', false);
                      updateField('deadlineDate', '');
                    }}
                  >
                    Wala
                  </button>
                </div>
                {formData.hasDeadline && (
                  <input
                    type="date"
                    className={styles.textInput}
                    value={formData.deadlineDate}
                    onChange={(event) => updateField('deadlineDate', event.target.value)}
                  />
                )}
              </div>

              <div className={styles.fieldBlock}>
                <label className={styles.inputLabel}>May supporting documents ka na ba?</label>
                <div className={styles.switchRow}>
                  <button
                    type="button"
                    className={`${styles.toggleBtn} ${formData.hasDocuments ? styles.toggleBtnActive : ''}`}
                    onClick={() => updateField('hasDocuments', true)}
                  >
                    Meron
                  </button>
                  <button
                    type="button"
                    className={`${styles.toggleBtn} ${!formData.hasDocuments ? styles.toggleBtnActive : ''}`}
                    onClick={() => updateField('hasDocuments', false)}
                  >
                    Wala pa
                  </button>
                </div>
              </div>
            </div>

            {submitError && (
              <div className={styles.errorBanner}>
                <AlertTriangle size={18} />
                <span>{submitError}</span>
              </div>
            )}

            <div className={styles.formActions}>
              <button onClick={handlePrev} className={styles.secondaryBtn}>
                <ArrowLeft size={18} /> Back
              </button>
              <button onClick={handleFindMatches} className={styles.primaryBtn} disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className={styles.spin} /> Matching...
                  </>
                ) : (
                  <>
                    Find Best Match <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Match Result */}
        {step === 3 && (
          <div className={`animate-enter ${styles.resultState}`}>
            <div className={styles.successIcon}>
              <CheckCircle size={64} />
            </div>
            <h2 className={styles.matchTitle}>Ito ang best matches para sa concern mo</h2>
            <p className={styles.matchDesc}>
              Base sa iyong basic questions at concern details, nag-rank kami ng volunteer attorneys gamit ang
              legal-fit, location, urgency, at pro-bono compliance signal ({PRO_BONO_TARGET_HOURS_3Y}h / 3 years).
            </p>

            {caseId && (
              <div className={styles.caseIdBanner}>
                <ShieldCheck size={16} />
                <span>Case created: {caseId}</span>
              </div>
            )}

            {warnings.length > 0 && (
              <div className={styles.warningList}>
                {warnings.map((warning) => (
                  <div key={warning} className={styles.warningItem}>
                    <AlertTriangle size={16} />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            )}

            {matches.length === 0 && (
              <div className={styles.warningList}>
                <div className={styles.warningItem}>
                  <AlertTriangle size={16} />
                  <span>Walang available na verified attorney sa kasalukuyan. Maaari kang bumalik mamaya o makipag-ugnayan sa aming support team.</span>
                </div>
              </div>
            )}

            <div className={styles.matchesList}>
              {matches.map((match) => (
                <article
                  key={match.attorneyId}
                  className={`${styles.matchCard} ${selectedAttorneyId === match.attorneyId ? styles.matchCardSelected : ''}`}
                >
                  {/* Header row: avatar + name + IBP badge */}
                  <div className={styles.cardHeader}>
                    <div className={styles.attorneyInfo}>
                      <div className={styles.avatar}>{match.name.split(' ').slice(0, 2).map((part) => part.charAt(0)).join('')}</div>
                      <div>
                        <h4>{match.name}</h4>
                        <p>{match.firmName}</p>
                      </div>
                    </div>
                    {match.ibpNumber && (
                      <div className={styles.ibpBadge}>
                        <ShieldCheck size={13} />
                        IBP {match.ibpNumber}
                      </div>
                    )}
                  </div>

                  {/* Star rating */}
                  {match.avgRating !== null ? (
                    <div className={styles.ratingRow}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={14}
                          fill={s <= Math.round(match.avgRating!) ? '#f59e0b' : 'none'}
                          color={s <= Math.round(match.avgRating!) ? '#f59e0b' : '#d1d5db'}
                        />
                      ))}
                      <span className={styles.ratingText}>
                        {match.avgRating.toFixed(1)} ({match.ratingCount} {match.ratingCount === 1 ? 'rating' : 'ratings'})
                      </span>
                    </div>
                  ) : (
                    <div className={styles.ratingRow}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={14} fill="none" color="#d1d5db" />
                      ))}
                      <span className={styles.ratingText}>No ratings yet</span>
                    </div>
                  )}

                  {/* Practice areas */}
                  {match.practiceAreas.length > 0 && (
                    <div className={styles.practiceAreaPills}>
                      {match.practiceAreas.slice(0, 5).map((area) => (
                        <span key={area} className={styles.practiceArea}>{area}</span>
                      ))}
                    </div>
                  )}

                  <div className={styles.metricsGrid}>
                    <div className={styles.metricPill}>Match Score: {match.score}%</div>
                    <div className={styles.metricPill}>Location: {match.province}</div>
                    <div className={styles.metricPill}>Active Cases: {match.activeCases}</div>
                  </div>

                  <div className={styles.reasonsList}>
                    {match.reasons.map((reason) => (
                      <p key={reason}>• {reason}</p>
                    ))}
                  </div>

                  <div className={styles.progressMeta}>
                    <div>
                      Pro bono completion ({PRO_BONO_TARGET_HOURS_3Y}h / 3y): {match.proBonoHours3y}h
                    </div>
                    <div>{match.remainingHoursToTarget}h remaining</div>
                  </div>
                  <div className={styles.progressBarSmall}>
                    <div className={styles.progressFillSmall} style={{ width: `${match.progressPercent}%` }} />
                  </div>

                  <div className={styles.cardActions}>
                    <button
                      className={styles.primaryBtnMatch}
                      onClick={() => setSelectedAttorneyId(match.attorneyId)}
                    >
                      {selectedAttorneyId === match.attorneyId ? 'Napili na' : 'Piliin ang Lawyer na Ito'}
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {selectedAttorneyId && matches.length > 0 && (
              <div className={styles.attorneyMatchBox}>
                {requested ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', width: '100%', textAlign: 'center' }}>
                    <div style={{ width: 56, height: 56, background: 'rgba(245,158,11,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Clock size={28} color="var(--color-warning)" />
                    </div>
                    <h4 style={{ margin: 0 }}>Naghihintay sa Tugon ng Abogado</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                      Napili mo na si <strong>{matches.find(m => m.attorneyId === selectedAttorneyId)?.name}</strong>. Aabisuhan ka kapag tinanggap o tinanggihan ng abogado ang iyong kaso.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className={styles.attorneyInfo}>
                      <div className={styles.avatar}>
                        {matches.find(m => m.attorneyId === selectedAttorneyId)?.name.split(' ').slice(0, 2).map(p => p.charAt(0)).join('')}
                      </div>
                      <div>
                        <h4>Selected: {matches.find(m => m.attorneyId === selectedAttorneyId)?.name}</h4>
                        <p>{matches.find(m => m.attorneyId === selectedAttorneyId)?.score}% overall confidence</p>
                      </div>
                    </div>
                    {requestError && (
                      <div className={styles.errorBanner}>
                        <AlertTriangle size={16} />
                        <span>{requestError}</span>
                      </div>
                    )}
                    <button
                      className={styles.primaryBtnMatch}
                      onClick={() => setShowConfirmModal(true)}
                      disabled={isRequesting}
                    >
                      Humingi ng Konsultasyon
                    </button>
                  </>
                )}
              </div>
            )}

            <div className={styles.formActionsCenter}>
              <button className={styles.outlineBtn} onClick={() => navigate('/public/rights')}>Tumingin muna ng Self-Help Documents</button>
            </div>
          </div>
        )}
      </div>
      {/* Confirmation modal */}
      {showConfirmModal && (() => {
        const chosen = matches.find(m => m.attorneyId === selectedAttorneyId);
        return (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '16px', padding: '2rem 1.75rem', width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-secondary)' }}>Sigurado ka ba?</h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Susuriin mo pa bago ipadala ang iyong kahilingan.</p>
              </div>

              {chosen && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1rem', backgroundColor: 'var(--color-background)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>
                    {chosen.name.split(' ').slice(0, 2).map(p => p.charAt(0)).join('')}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-secondary)' }}>{chosen.name}</p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{chosen.score}% match · {chosen.province}</p>
                  </div>
                </div>
              )}

              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                Kapag nagpadala ka ng kahilingan, matatanggap ng abogado ang notification at magpapasya kung tatanggapin o hindi ang iyong kaso.
              </p>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  style={{ flex: 1, padding: '0.65rem 1rem', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'none', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                >
                  Hindi pa, bumalik
                </button>
                <button
                  onClick={async () => { setShowConfirmModal(false); await handleRequestConsultation(); }}
                  disabled={isRequesting}
                  style={{ flex: 1, padding: '0.65rem 1rem', borderRadius: '10px', border: 'none', backgroundColor: 'var(--color-primary)', color: 'white', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  {isRequesting ? <Loader2 size={15} /> : null}
                  Oo, piliin siya
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default TriageView;
