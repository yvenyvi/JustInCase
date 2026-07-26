import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  User, 
  Briefcase, 
  UserPlus, 
  Upload, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  FileText,
  IdCard,
  X,
  Camera,
  MapPin,
  Map,
  Scan,
  RefreshCw,
  Info,
  ShieldCheck,
  Search,
  ExternalLink,
  CheckCircle2,
  Circle,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  Phone,
  QrCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthLayout from './AuthLayout';
import Button from '../../components/Button';
import LocationSelector from '../../components/shared/LocationSelector';
import { supabase } from '../../lib/supabase';
import styles from './auth.module.css';

type Role = 'public' | 'legal';
type Step = 1 | 2 | 3 | 4;

type FormFieldErrorMap = {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  streetAddress?: string;
  ibpNumber?: string;
  rollNumber?: string;
};

type NormalizedOcrData = {
  fullName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dob: string;
  idNumber: string;
  address: {
    region: string;
    province: string;
    city: string;
    barangay: string;
  };
};

const Register = () => {
  const navigate = useNavigate();
  const apiBaseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
  const [step, setStep] = useState<Step>(1);
  const [role, setRole] = useState<Role>('public');
  const [file, setFile] = useState<File | null>(null);
  const [subStep, setSubStep] = useState(1); // 1: Scan, 2: Selfie, 3: Confirm
  const [isScanning, setIsScanning] = useState(false);
  const [isSelfieCaptured, setIsSelfieCaptured] = useState(false);

  const [ibpIdPreview, setIbpIdPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [ibpIdFile, setIbpIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  const MAX_FILE_SIZE_MB = 5;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  const handleIbpIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
        setErrorMessage(`IBP ID image is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB}MB.`);
        e.target.value = '';
        return;
      }
      setErrorMessage('');
      setIbpIdFile(selectedFile);
      setIbpIdPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSelfieChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
        setErrorMessage(`Selfie image is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB}MB.`);
        e.target.value = '';
        return;
      }
      setErrorMessage('');
      setSelfieFile(selectedFile);
      setSelfiePreview(URL.createObjectURL(selectedFile));
    }
  };

  // AI Verification State
  const [aiStep, setAiStep] = useState(1); // 1: Input, 2: Proof, 3: Processing, 4: Result
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiLogs, setAiLogs] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [attemptId, setAttemptId] = useState<string>('');
  const [diditUrl, setDiditUrl] = useState<string>('');
  const [diditStatus, setDiditStatus] = useState<'idle' | 'pending' | 'verified' | 'failed'>('idle');
  const [isStartingDidit, setIsStartingDidit] = useState(false);
  const [isCheckingDidit, setIsCheckingDidit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrorMap>({});
  const [emailVerificationNotice, setEmailVerificationNotice] = useState<string>('');
  const [verificationResult, setVerificationResult] = useState<{
    rollMatch: boolean;
    nameMatch: boolean;
    faceMatch: number;
    authentic: boolean;
  } | null>(null);
  const [diditImageUrls, setDiditImageUrls] = useState<{ idPictureUrl?: string; selfieUrl?: string }>({});

  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    email: '',
    password: '',
    idNumber: '',
    ibpNumber: '',
    rollNumber: '',
    ibpChapter: '',
    // Address extracted from ID
    region: '',
    province: '',
    city: '',
    barangay: ''
  });

  const [location, setLocation] = useState({
    region: '', province: '', city: '', barangay: '',
    regionCode: '', provinceCode: '', cityCode: '', barangayCode: ''
  });

  const [personalInfo, setPersonalInfo] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    dob: '',
    validId: '',
    phone: '',
    streetAddress: ''
  });

  const _makeHandle = (first?: string, last?: string, email?: string) => {
    const parts: string[] = [];
    if (first && first.trim()) parts.push(first.trim());
    if (last && last.trim()) parts.push(last.trim());
    let base = parts.join('-').toLowerCase();
    if (!base && email) base = (email.split('@')[0] || '').toLowerCase();
    // sanitize to alphanumeric and underscore
    base = base.replace(/[^a-z0-9_\-]+/g, '_').replace(/_+/g, '_').replace(/^-+|-+$/g, '').slice(0, 50);
    return base || `user_${Math.random().toString(36).slice(2, 8)}`;
  };

  const pickFirstText = (...values: unknown[]): string => {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return '';
  };

  const normalizeOcrData = (raw: unknown): NormalizedOcrData | null => {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const source = raw as Record<string, unknown>;
    const rawAddress = source.address;
    const address = rawAddress && typeof rawAddress === 'object'
      ? (rawAddress as Record<string, unknown>)
      : {};

    console.log('[OCR] Normalizing raw data:', JSON.stringify(raw, null, 2));

    const fullName = pickFirstText(source.fullName, source.full_name, source.name);
    let firstName = pickFirstText(source.firstName, source.first_name);
    let middleName = pickFirstText(source.middleName, source.middle_name);
    let lastName = pickFirstText(source.lastName, source.last_name);

    if (fullName && (!firstName || !lastName)) {
      const parts = fullName.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        if (!firstName) {
          firstName = parts[0];
        }
        if (!lastName) {
          lastName = parts[parts.length - 1];
        }
        if (!middleName && parts.length > 2) {
          middleName = parts.slice(1, -1).join(' ');
        }
      }
    }

    const result = {
      fullName,
      firstName,
      middleName,
      lastName,
      dob: pickFirstText(source.dob, source.date_of_birth),
      idNumber: pickFirstText(source.idNumber, source.id_number, source.document_number),
      address: {
        region: pickFirstText(address.region, address.state),
        province: pickFirstText(address.province, address.state_province),
        city: pickFirstText(address.city, address.municipality, address.town),
        barangay: pickFirstText(address.barangay, address.district, address.village),
      },
    };
    
    console.log('[OCR] Normalized data result:', JSON.stringify(result, null, 2));
    return result;
  };

  const applyExtractedOcrData = (rawOcrData: unknown) => {
    const normalizedOcrData = normalizeOcrData(rawOcrData);
    console.log('[OCR] Applying extracted data (detailed):', JSON.stringify(normalizedOcrData, null, 2));
    if (!normalizedOcrData) {
      return;
    }

    setPersonalInfo((prev) => ({
      ...prev,
      firstName: normalizedOcrData.firstName || prev.firstName,
      middleName: normalizedOcrData.middleName || prev.middleName,
      lastName: normalizedOcrData.lastName || prev.lastName,
      dob: normalizedOcrData.dob || prev.dob,
      validId: normalizedOcrData.idNumber || prev.validId,
    }));

    setFormData((prev) => ({
      ...prev,
      name: normalizedOcrData.fullName || prev.name,
      dob: normalizedOcrData.dob || prev.dob,
      idNumber: normalizedOcrData.idNumber || prev.idNumber,
      region: normalizedOcrData.address.region || prev.region,
      province: normalizedOcrData.address.province || prev.province,
      city: normalizedOcrData.address.city || prev.city,
      barangay: normalizedOcrData.address.barangay || prev.barangay,
    }));

    setLocation((prev) => ({
      ...prev,
      region: normalizedOcrData.address.region || prev.region,
      province: normalizedOcrData.address.province || prev.province,
      city: normalizedOcrData.address.city || prev.city,
      barangay: normalizedOcrData.address.barangay || prev.barangay,
    }));
  };

  useEffect(() => {
    if (step === 2 && role === 'public' && diditStatus === 'verified') {
      setStep(3);
    }
  }, [diditStatus, step, role]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const returnedStatus = (url.searchParams.get('status') || '').toLowerCase();
    const approvedStatuses = new Set(['approved', 'verified', 'success', 'passed', 'completed']);
    const saved = sessionStorage.getItem('jl_reg_form');

    if (!saved) {
      // If Didit redirected back with a successful status but no recoverable draft,
      // still unlock step 3 so users don't get stuck in step 2.
      if (approvedStatuses.has(returnedStatus)) {
        setDiditStatus('verified');
        setStep(3);
      }

      if (url.searchParams.has('verificationSessionId') || url.searchParams.has('status')) {
        url.searchParams.delete('verificationSessionId');
        url.searchParams.delete('status');
        window.history.replaceState({}, '', `${url.pathname}${url.search}`);
      }
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      if (!parsed.attemptId) {
        return;
      }

      setStep(2);
      setRole(parsed.role || 'public');
      setAttemptId(parsed.attemptId);
      setFormData(prev => ({ ...prev, email: parsed.email || prev.email, password: parsed.password || prev.password }));

      const syncDiditDecision = async () => {
        // Prefer Didit's return status when available to avoid waiting for webhook timing.
        if (approvedStatuses.has(returnedStatus)) {
          setDiditStatus('verified');
          setErrorMessage('');
          setStep(3);
        }

        setIsCheckingDidit(true);
        try {
          const response = await fetch(`${apiBaseUrl}/api/public-registration/status/${parsed.attemptId}`);
          const payload = await response.json();
          console.log('[OCR] Fetched status payload:', payload);
          applyExtractedOcrData(payload?.ocrData);
          if (payload?.imageUrls) {
            setDiditImageUrls(payload.imageUrls);
          }

          if (response.ok && payload.verified) {
            setDiditStatus('verified');
            setStep(3);
            setErrorMessage('');
          } else if (payload.status === 'failed') {
            setDiditStatus('failed');
            setErrorMessage('Verification failed. Please try again.');
          } else {
            setDiditStatus('pending');
          }
        } catch (e) {
          setErrorMessage('Unable to retrieve Didit decision.');
        } finally {
          setIsCheckingDidit(false);
          sessionStorage.removeItem('jl_reg_form');

          if (url.searchParams.has('verificationSessionId') || url.searchParams.has('status')) {
            url.searchParams.delete('verificationSessionId');
            url.searchParams.delete('status');
            window.history.replaceState({}, '', `${url.pathname}${url.search}`);
          }
        }
      };

      syncDiditDecision();
    } catch (e) {
      // ignore parse errors
    }
  }, [apiBaseUrl]);

  const passwordRequirements = [
    { key: 'length', label: 'Minimum of 8 characters', valid: formData.password.length >= 8 },
    { key: 'upper', label: 'At least one (1) upper letter', valid: /[A-Z]/.test(formData.password) },
    { key: 'lower', label: 'At least one (1) lower letter', valid: /[a-z]/.test(formData.password) },
    { key: 'number', label: 'At least one (1) number', valid: /\d/.test(formData.password) },
    { key: 'special', label: 'At least one (1) special character', valid: /[^A-Za-z0-9]/.test(formData.password) }
  ];

  const isPasswordStrong = passwordRequirements.every((item) => item.valid);

  const validateStepOne = (): FormFieldErrorMap => {
    const nextErrors: FormFieldErrorMap = {};
    const email = formData.email.trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!isPasswordStrong) {
      nextErrors.password = 'Password does not meet all required rules.';
    }

    return nextErrors;
  };

  const validateStepThree = (): FormFieldErrorMap => {
    const nextErrors: FormFieldErrorMap = {};

    if (!personalInfo.firstName.trim()) {
      nextErrors.firstName = 'First name is required.';
    }

    if (!personalInfo.lastName.trim()) {
      nextErrors.lastName = 'Last name is required.';
    }

    if (!personalInfo.phone.trim()) {
      nextErrors.phone = 'Mobile number is required.';
    }

    if (!personalInfo.streetAddress.trim()) {
      nextErrors.streetAddress = 'Street address is required.';
    }

    if (role === 'legal') {
      if (!formData.ibpNumber.trim()) {
        nextErrors.ibpNumber = 'IBP number is required for legal registration.';
      }

      if (!formData.rollNumber.trim()) {
        nextErrors.rollNumber = 'Roll number is required for legal registration.';
      }
    }

    return nextErrors;
  };

  const handleNext = () => setStep((prev) => (prev < 4 ? prev + 1 : prev) as Step);
  const handleBack = () => {
    if (step === 3 && role === 'legal' && subStep > 1) {
      setSubStep(subStep - 1);
    } else if (step > 1) {
      setStep((prev) => (prev - 1) as Step);
    }
  };

  const handleStepOneContinue = () => {
    const nextErrors = validateStepOne();
    setFieldErrors(nextErrors);
    setErrorMessage('');
    const email = formData.email.trim().toLowerCase();

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setFormData((prev) => ({ ...prev, email }));
    setStep(2);
  };

  const startDiditVerification = async () => {
    setErrorMessage('');
    setIsStartingDidit(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/public-registration/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email.trim().toLowerCase(),
          returnUrl: window.location.origin + '/register'
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.detail || 'Could not start Didit verification.');
      }

      setAttemptId(payload.attemptId);
      setDiditUrl(payload.verificationUrl);
      setDiditStatus('pending');

      if (payload.verificationUrl) {
        // Persist the registration context so it can be restored after verification redirect.
        sessionStorage.setItem('jl_reg_form', JSON.stringify({
          email: formData.email,
          password: formData.password,
          role: role,
          attemptId: payload.attemptId
        }));
        
        window.location.assign(payload.verificationUrl);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not start Didit verification.');
      setIsStartingDidit(false);
    }
  };

  const checkDiditStatus = async () => {
    if (!attemptId) {
      setErrorMessage('Start a Didit verification session first.');
      return;
    }

    setErrorMessage('');
    setIsCheckingDidit(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/public-registration/status/${attemptId}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.detail || 'Could not fetch verification status.');
      }

      applyExtractedOcrData(payload?.ocrData);

      if (payload.verified) {
        setDiditStatus('verified');
      } else if (payload.status === 'failed') {
        setDiditStatus('failed');
      } else {
        setDiditStatus('pending');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not fetch verification status.');
    } finally {
      setIsCheckingDidit(false);
    }
  };

  const continueFromVerification = () => {
    if (role === 'public' && diditStatus !== 'verified') {
      setErrorMessage('Didit verification must be completed before proceeding.');
      return;
    }

    if (role === 'legal' && (!ibpIdFile || !selfieFile)) {
      setErrorMessage('Please upload both your IBP ID and selfie before continuing.');
      return;
    }

    setErrorMessage('');
    setStep(3);
  };

  const uploadLegalVerificationAsset = async (
    file: File,
    kind: 'ibp' | 'selfie',
    normalizedEmail: string,
  ): Promise<string | null> => {
    const form = new FormData();
    form.append('email', normalizedEmail);
    form.append('kind', kind);
    form.append('file', file, file.name);

    const response = await fetch(`${apiBaseUrl}/api/legal-registration/upload-proof`, {
      method: 'POST',
      body: form,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.detail || `Unable to upload ${kind} document.`);
    }

    return payload?.url || null;
  };

  useEffect(() => {
    if (role !== 'public' || step !== 3 || !attemptId) {
      return;
    }

    const hydrateOcrData = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/public-registration/status/${attemptId}`);
        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        applyExtractedOcrData(payload?.ocrData);
        if (payload?.imageUrls) {
          setDiditImageUrls(payload.imageUrls);
        }
      } catch {
        // Keep step flow responsive even if OCR refresh fetch fails.
      }
    };

    hydrateOcrData();
  }, [apiBaseUrl, attemptId, role, step]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      simulateScan();
    }
  };

  const simulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setSubStep(2);
    }, 2000);
  };

  const captureSelfie = () => {
    setIsSelfieCaptured(true);
    setTimeout(() => {
      setSubStep(3);
    }, 1500);
  };

  const runAiVerification = async () => {
    setIsAiScanning(true);
    setAiStep(3);
    setAiProgress(0);
    setAiLogs([]);

    const steps = [
      { log: "Initializing AI Vision Engine...", progress: 10 },
      { log: "Extracting Bar Roll Number from ID...", progress: 25 },
      { log: "Connecting to SC Lawyers' List Database...", progress: 40 },
      { log: "Verifying Name & Admittance Year...", progress: 55 },
      { log: "Analyzing Judiciary Portal Screenshot...", progress: 70 },
      { log: "Matching Biometrics (Selfie vs. ID Photo)...", progress: 85 },
      { log: "Finalizing Fraud Risk Assessment...", progress: 100 },
    ];

    for (const s of steps) {
      await new Promise(r => setTimeout(r, 800));
      setAiLogs(prev => [...prev, s.log]);
      setAiProgress(s.progress);
    }

    setIsAiScanning(false);
    setVerificationResult({
      rollMatch: true,
      nameMatch: true,
      faceMatch: 97.4,
      authentic: true
    });
    setAiStep(4);
  };

  const handleRegister = async () => {
    const nextErrors = validateStepThree();
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setErrorMessage('');

    const normalizedEmail = formData.email.trim().toLowerCase();

    if (role === 'legal') {
      if (!ibpIdFile || !selfieFile) {
        setErrorMessage('Please upload both your IBP ID and selfie to continue legal registration.');
        return;
      }

      setIsSubmitting(true);
      try {
        const [ibpIdUrl, selfieUrl] = await Promise.all([
          uploadLegalVerificationAsset(ibpIdFile, 'ibp', normalizedEmail),
          uploadLegalVerificationAsset(selfieFile, 'selfie', normalizedEmail),
        ]);

        const handle = _makeHandle(personalInfo.firstName, personalInfo.lastName, normalizedEmail);

        const { error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: {
              first_name: personalInfo.firstName,
              middle_name: personalInfo.middleName,
              last_name: personalInfo.lastName,
              suffix: personalInfo.suffix,
              phone_number: personalInfo.phone,
              street_address: personalInfo.streetAddress,
              region: location.region,
              province: location.province,
              city_municipality: location.city,
              barangay: location.barangay,
              date_of_birth: personalInfo.dob || null,
              ibp_number: formData.ibpNumber.trim(),
              roll_number: formData.rollNumber.trim(),
              id_picture_url: ibpIdUrl,
              selfie_url: selfieUrl,
              is_didit_verified: false,
              status_verification: 'unverified',
              role: 'Volunteer Attorney',
              handle,
            },
          },
        });

        if (error) {
          throw new Error(error.message);
        }

        setEmailVerificationNotice(`A verification email was sent to ${normalizedEmail}. Please verify your email, then wait for admin approval of your legal credentials.`);
        setStep(4);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Legal registration failed.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!attemptId || diditStatus !== 'verified') {
      setErrorMessage('Please complete Didit verification before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalizeResponse = await fetch(`${apiBaseUrl}/api/public-registration/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          email: normalizedEmail,
          password: formData.password,
          phoneNumber: personalInfo.phone || null,
          address: {
            ...location,
            streetAddress: personalInfo.streetAddress
          }
        })
      });

      const finalizePayload = await finalizeResponse.json();
      if (!finalizeResponse.ok) {
        throw new Error(finalizePayload?.detail || 'Final verification step failed.');
      }

      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            first_name: personalInfo.firstName,
            middle_name: personalInfo.middleName,
            last_name: personalInfo.lastName,
            suffix: personalInfo.suffix,
            phone_number: personalInfo.phone,
            street_address: personalInfo.streetAddress,
            region: location.region,
            province: location.province,
            city_municipality: location.city,
            barangay: location.barangay,
            is_didit_verified: true,
            status_verification: 'verified',
            role: 'Citizen',
            date_of_birth: personalInfo.dob || null,
            handle: _makeHandle(personalInfo.firstName, personalInfo.lastName, normalizedEmail),
            id_picture_url: diditImageUrls.idPictureUrl || null,
            selfie_url: diditImageUrls.selfieUrl || null,
          }
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      setEmailVerificationNotice(`A verification email was sent to ${normalizedEmail}. Please confirm your email before logging in.`);
      setStep(4);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderVerificationProgress = () => (
    <div className={styles.verifSteps}>
      <div className={`${styles.verifStep} ${subStep >= 1 ? styles.verifStepActive : ''}`} />
      <div className={`${styles.verifStep} ${subStep >= 2 ? styles.verifStepActive : ''}`} />
      <div className={`${styles.verifStep} ${subStep >= 3 ? styles.verifStepActive : ''}`} />
    </div>
  );

  const renderStepIndicator = () => {
    const steps = role === 'public'
      ? ['Account Setup', 'Didit Verification', 'Personal Info', 'Email Verification']
      : ['Account Setup', 'Verification', 'Personal Info', 'For Review'];

    return (
      <div className={styles.stepper}>
        <div className={styles.stepperWrap}>
          <div className={styles.stepperItems}>
            {steps.map((label, idx) => {
              const stepNumber = idx + 1;
              const isActive = step === stepNumber;
              const isCompleted = step > stepNumber;

              return (
                <div key={idx} className={styles.stepContainer}>
                  <div className={`${styles.stepSegment} ${isActive ? styles.stepSegmentActive : (isCompleted ? styles.stepSegmentCompleted : '')}`} />
                  <div className={`${styles.step} ${isActive ? styles.stepActive : (isCompleted ? styles.stepCompleted : '')}`}>
                    <span className={styles.stepLabel} style={{ whiteSpace: 'nowrap' }}>{label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AuthLayout 
      visualImage="/auth_bg.jpg"
      quote={step === 1 
        ? "Justice is the first virtue of social institutions, as truth is of systems of thought."
        : step === 2 
        ? "In a government of laws, existence of the government will be imperilled if it fails to observe the law scrupulously."
        : step === 3
        ? "Equal justice under law is not merely a caption on the facade of the Supreme Court building, it is perhaps the most inspiring ideal of our society."
        : "The first duty of society is justice."
      }
      author={step === 1 ? "John Rawls" : step === 2 ? "Justice Louis D. Brandeis" : step === 3 ? "Justice Lewis F. Powell Jr." : "Alexander Hamilton"}
    >
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          {step > 1 && step < 4 && (
            <button 
              type="button" 
              onClick={handleBack}
              className={styles.backButton}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.25rem' }}
            >
              <ChevronLeft size={24} />
            </button>
          )}
          <h1 className={styles.title} style={{ margin: 0 }}>
            {step === 1 ? 'Join JusticeLink' : step === 2 ? 'Verify Identity' : step === 3 ? 'Personal Details' : 'Verify Your Email'}
          </h1>
        </div>
        <p className={styles.subtitle}>
          {step === 1 
            ? 'Empowering Filipinos with legal support' 
            : step === 2
            ? (role === 'public' ? 'Use Didit to complete OCR and face match verification.' : 'Upload your professional documents to proceed')
            : step === 3
            ? 'Please confirm your details'
            : 'Check your inbox to activate your account.'
          }
        </p>
        {errorMessage && (
          <div style={{ marginTop: '0.75rem', color: '#fecaca', fontSize: '0.85rem' }}>{errorMessage}</div>
        )}
      </div>

      {renderStepIndicator()}

      <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
        {step === 1 && (
          <>
            <div className={styles.roleSelector}>
              <div 
                className={`${styles.roleOption} ${role === 'public' ? styles.roleActive : ''}`}
                onClick={() => setRole('public')}
              >
                <User className={styles.roleIcon} size={24} />
                <div className={styles.roleLabel}>I Need Help</div>
              </div>
              <div 
                className={`${styles.roleOption} ${role === 'legal' ? styles.roleActive : ''}`}
                onClick={() => setRole('legal')}
              >
                <Briefcase className={styles.roleIcon} size={24} />
                <div className={styles.roleLabel}>I'm a Lawyer</div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="email">Email Address</label>
              <div className={styles.inputWrapper}>
                  <input
                    id="email"
                    type="email"
                    placeholder="juandelacruz@email.com"
                    className={`${styles.input} ${fieldErrors.email ? styles.inputError : ''}`}
                    value={formData.email || ''}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, email: e.target.value }));
                      if (fieldErrors.email) {
                        setFieldErrors((prev) => ({ ...prev, email: undefined }));
                      }
                    }}
                  />
                <Mail className={styles.inputIcon} size={18} />
              </div>
              {fieldErrors.email && <p className={styles.fieldError}><AlertCircle size={14} /> {fieldErrors.email}</p>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="password">Password</label>
              <div className={styles.inputWrapper}>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    className={`${styles.input} ${fieldErrors.password ? styles.inputError : ''}`}
                    value={formData.password || ''}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, password: e.target.value }));
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => ({ ...prev, password: undefined }));
                      }
                    }}
                  />
                <Lock className={styles.inputIcon} size={18} />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && <p className={styles.fieldError}><AlertCircle size={14} /> {fieldErrors.password}</p>}
              {formData.password.length > 0 && passwordRequirements.some(req => !req.valid) && (
                <div className={styles.passwordHint}>
                  <div className={styles.passwordHintTitle}>Your password needs:</div>
                  <div className={styles.passwordHintList}>
                    {passwordRequirements.filter(req => !req.valid).map((requirement, idx) => (
                      <div
                        key={`${requirement.key}-${idx}`}
                        className={styles.passwordHintItem}
                        style={{ color: '#fca5a5' }}
                      >
                        <AlertCircle size={12} />
                        <span>{requirement.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button 
              type="button" 
              variant="primary" 
              size="lg" 
              className={styles.submitButton}
              onClick={handleStepOneContinue}
              icon={ChevronRight}
            >
              Continue to Verification
            </Button>
          </>
        )}

        {step === 2 && (
          <div className={styles.fadeSlide} style={{ textAlign: 'center', padding: '2rem 0' }}>
            {role === 'public' ? (
              <>
                <h3 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '1rem' }}>Verify easily with Didit</h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                  Start your Didit session and complete OCR + face match in the opened page.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={startDiditVerification}
                    disabled={isStartingDidit}
                    icon={ExternalLink}
                    size="lg"
                  >
                    {isStartingDidit ? 'Starting Didit Session...' : 'Start Didit Verification'}
                  </Button>

                  <div style={{ padding: '0.5rem 0', textAlign: 'center' }}>
                    <div style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                      Session status: <strong>{diditStatus.toUpperCase()}</strong>
                    </div>
                    {attemptId && (
                      <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                        Attempt ID: {attemptId}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '1rem' }}>Manual Verification Required</h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                  Please upload a clear selfie and a picture of your valid IBP ID. <br/>
                  Our admins will verify your details against the Supreme Court database.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>1. Upload IBP ID Image</label>
                    <div 
                      className={styles.uploadArea} 
                      onClick={() => document.getElementById('ibp-upload')?.click()}
                      style={ibpIdPreview ? { padding: 0, overflow: 'hidden' } : {}}
                    >
                      {ibpIdPreview ? (
                        <div style={{ position: 'relative', width: '100%', height: '200px' }}>
                          <img 
                            src={ibpIdPreview} 
                            alt="IBP ID Preview" 
                            style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: 'rgba(0,0,0,0.2)' }} 
                          />
                          <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '0.5rem', fontSize: '0.8rem', textAlign: 'center' }}>
                            Click to change image
                          </div>
                        </div>
                      ) : (
                        <>
                          <IdCard className={styles.uploadIcon} size={32} />
                          <div className={styles.uploadText}>Click to upload IBP ID</div>
                          <div className={styles.uploadSubtext}>.jpg, .jpeg, or .png only</div>
                        </>
                      )}
                      <input
                        id="ibp-upload"
                        type="file"
                        hidden
                        accept=".jpg,.jpeg,.png"
                        onChange={handleIbpIdChange}
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>2. Upload Live Selfie</label>
                    <div 
                      className={styles.uploadArea} 
                      onClick={() => document.getElementById('selfie-upload')?.click()}
                      style={selfiePreview ? { padding: 0, overflow: 'hidden' } : {}}
                    >
                      {selfiePreview ? (
                        <div style={{ position: 'relative', width: '100%', height: '200px' }}>
                          <img 
                            src={selfiePreview} 
                            alt="Selfie Preview" 
                            style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: 'rgba(0,0,0,0.2)' }} 
                          />
                          <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '0.5rem', fontSize: '0.8rem', textAlign: 'center' }}>
                            Click to change image
                          </div>
                        </div>
                      ) : (
                        <>
                          <Camera className={styles.uploadIcon} size={32} />
                          <div className={styles.uploadText}>Click to upload selfie</div>
                          <div className={styles.uploadSubtext}>.jpg, .jpeg, or .png only</div>
                        </>
                      )}
                      <input
                        id="selfie-upload"
                        type="file"
                        hidden
                        accept=".jpg,.jpeg,.png"
                        onChange={handleSelfieChange}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {role === 'legal' && (
              <div style={{ marginTop: '2rem' }}>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={continueFromVerification}
                  disabled={!ibpIdFile || !selfieFile}
                  style={{ width: '100%', border: '1px dashed rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}
                >
                  Continue to Personal Details
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className={styles.fadeSlide}>
            <div style={{ backgroundColor: 'rgba(252, 163, 17, 0.1)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Info size={20} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
              <p style={{ color: 'var(--color-primary)', fontSize: '0.85rem', lineHeight: '1.4' }}>
                {role === 'public' 
                  ? 'Didit extracted the following data. Please confirm and complete any missing details before finalizing your registration.'
                  : 'Please enter your personal and professional details. These must match your uploaded IBP ID for successful verification.'}
              </p>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label className={styles.label} htmlFor="firstName" style={{ margin: 0 }}>First Name</label>
                  {role === 'public' && <span className={styles.autofillBadgeInline}>Extracted</span>}
                </div>
                <div className={styles.inputWrapper}>
                  <input id="firstName" type="text" value={personalInfo.firstName || ''} onChange={(e) => {
                    setPersonalInfo((prev) => ({ ...prev, firstName: e.target.value }));
                    if (fieldErrors.firstName) {
                      setFieldErrors((prev) => ({ ...prev, firstName: undefined }));
                    }
                  }} placeholder={role === 'legal' ? 'E.g. Maria' : ''} className={`${styles.input} ${role === 'public' ? styles.inputAutofilled : ''} ${fieldErrors.firstName ? styles.inputError : ''}`} />
                  <User className={styles.inputIcon} size={18} />
                </div>
                {fieldErrors.firstName && <p className={styles.fieldError}><AlertCircle size={14} /> {fieldErrors.firstName}</p>}
              </div>
              <div className={styles.formGroup}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label className={styles.label} htmlFor="middleName" style={{ margin: 0 }}>Middle Name</label>
                  {role === 'public' && <span className={styles.autofillBadgeInline}>Extracted</span>}
                </div>
                <div className={styles.inputWrapper}>
                  <input id="middleName" type="text" value={personalInfo.middleName || ''} onChange={(e) => setPersonalInfo((prev) => ({ ...prev, middleName: e.target.value }))} placeholder={role === 'legal' ? 'E.g. Clara' : ''} className={`${styles.input} ${role === 'public' ? styles.inputAutofilled : ''}`} />
                  <User className={styles.inputIcon} size={18} />
                </div>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label className={styles.label} htmlFor="lastName" style={{ margin: 0 }}>Last Name</label>
                  {role === 'public' && <span className={styles.autofillBadgeInline}>Extracted</span>}
                </div>
                <div className={styles.inputWrapper}>
                  <input id="lastName" type="text" value={personalInfo.lastName || ''} onChange={(e) => {
                    setPersonalInfo((prev) => ({ ...prev, lastName: e.target.value }));
                    if (fieldErrors.lastName) {
                      setFieldErrors((prev) => ({ ...prev, lastName: undefined }));
                    }
                  }} placeholder={role === 'legal' ? 'E.g. Santos' : ''} className={`${styles.input} ${role === 'public' ? styles.inputAutofilled : ''} ${fieldErrors.lastName ? styles.inputError : ''}`} />
                  <User className={styles.inputIcon} size={18} />
                </div>
                {fieldErrors.lastName && <p className={styles.fieldError}><AlertCircle size={14} /> {fieldErrors.lastName}</p>}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="suffix">Suffix (Optional)</label>
                <div className={styles.inputWrapper}>
                  <select id="suffix" className={styles.input} value={personalInfo.suffix || ''} onChange={(e) => setPersonalInfo((prev) => ({ ...prev, suffix: e.target.value }))}>
                    <option value="">None</option>
                    <option value="Jr.">Jr.</option>
                    <option value="Sr.">Sr.</option>
                    <option value="II">II</option>
                    <option value="III">III</option>
                    <option value="IV">IV</option>
                  </select>
                </div>
              </div>
            </div>

            {role === 'legal' && (
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="ibpNumber">IBP Number</label>
                  <div className={styles.inputWrapper}>
                    <input
                      id="ibpNumber"
                      type="text"
                      placeholder="E.g. 123456"
                      className={`${styles.input} ${fieldErrors.ibpNumber ? styles.inputError : ''}`}
                      value={formData.ibpNumber}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, ibpNumber: e.target.value }));
                        if (fieldErrors.ibpNumber) {
                          setFieldErrors((prev) => ({ ...prev, ibpNumber: undefined }));
                        }
                      }}
                    />
                    <FileText className={styles.inputIcon} size={18} />
                  </div>
                  {fieldErrors.ibpNumber && <p className={styles.fieldError}><AlertCircle size={14} /> {fieldErrors.ibpNumber}</p>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="rollNumber">Roll Number</label>
                  <div className={styles.inputWrapper}>
                    <input
                      id="rollNumber"
                      type="text"
                      placeholder="E.g. 98765"
                      className={`${styles.input} ${fieldErrors.rollNumber ? styles.inputError : ''}`}
                      value={formData.rollNumber}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, rollNumber: e.target.value }));
                        if (fieldErrors.rollNumber) {
                          setFieldErrors((prev) => ({ ...prev, rollNumber: undefined }));
                        }
                      }}
                    />
                    <FileText className={styles.inputIcon} size={18} />
                  </div>
                  {fieldErrors.rollNumber && <p className={styles.fieldError}><AlertCircle size={14} /> {fieldErrors.rollNumber}</p>}
                </div>
              </div>
            )}

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label className={styles.label} htmlFor="dob" style={{ margin: 0 }}>Date of Birth</label>
                  {role === 'public' && <span className={styles.autofillBadgeInline}>Extracted</span>}
                </div>
                <div className={styles.inputWrapper}>
                  <input id="dob" type="date" value={personalInfo.dob || ''} onChange={(e) => setPersonalInfo((prev) => ({ ...prev, dob: e.target.value }))} className={`${styles.input} ${role === 'public' ? styles.inputAutofilled : ''}`} />
                </div>
              </div>
              {role === 'public' && (
                <div className={styles.formGroup}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label className={styles.label} htmlFor="validId" style={{ margin: 0 }}>Valid ID Number</label>
                    <span className={styles.autofillBadgeInline}>Extracted</span>
                  </div>
                  <div className={styles.inputWrapper}>
                    <input id="validId" type="text" value={personalInfo.validId || ''} onChange={(e) => setPersonalInfo((prev) => ({ ...prev, validId: e.target.value }))} className={`${styles.input} ${styles.inputAutofilled}`} />
                    <IdCard className={styles.inputIcon} size={18} />
                  </div>
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="phone">Mobile Number</label>
                <div className={styles.inputWrapper}>
                  <input id="phone" type="tel" placeholder="+63 917 123 4567" className={`${styles.input} ${fieldErrors.phone ? styles.inputError : ''}`} value={personalInfo.phone || ''} onChange={(e) => {
                    setPersonalInfo((prev) => ({ ...prev, phone: e.target.value }));
                    if (fieldErrors.phone) {
                      setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                    }
                  }} />
                  <Phone className={styles.inputIcon} size={18} />
                </div>
                {fieldErrors.phone && <p className={styles.fieldError}><AlertCircle size={14} /> {fieldErrors.phone}</p>}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Location / Region</label>
              <LocationSelector 
                variant="auth"          
                initialNames={
                  role === 'public'
                    ? {
                        region: location.region,
                        province: location.province,
                        city: location.city,
                        barangay: location.barangay,
                      }
                    : undefined
                }
                onLocationChange={setLocation} 
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="streetAddress">House No., Street / Purok</label>
              <div className={styles.inputWrapper}>
                <input id="streetAddress" type="text" placeholder="123 Main St., Purok 4" className={`${styles.input} ${fieldErrors.streetAddress ? styles.inputError : ''}`} value={personalInfo.streetAddress || ''} onChange={(e) => {
                  setPersonalInfo((prev) => ({ ...prev, streetAddress: e.target.value }));
                  if (fieldErrors.streetAddress) {
                    setFieldErrors((prev) => ({ ...prev, streetAddress: undefined }));
                  }
                }} />
              </div>
              {fieldErrors.streetAddress && <p className={styles.fieldError}><AlertCircle size={14} /> {fieldErrors.streetAddress}</p>}
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <Button 
                type="button" 
                variant="outline" 
                size="lg" 
                style={{ flex: 1, border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                onClick={() => setStep(2)}
                icon={ChevronLeft}
              >
                Back
              </Button>
              <Button 
                type="button" 
                variant="primary" 
                size="lg" 
                style={{ flex: 2 }}
                onClick={handleRegister}
                icon={CheckCircle2}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : (role === 'public' ? 'Complete Registration' : 'Submit for Verification')}
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className={styles.fadeSlide} style={{ textAlign: 'center', padding: '2rem 0' }}>
            <CheckCircle2 size={52} color="#10b981" style={{ marginBottom: '1rem' }} />
            <h3 style={{ color: '#fff', marginBottom: '0.75rem' }}>
              {role === 'public' ? 'Email Verification Required' : 'Legal Registration Submitted'}
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '1.5rem' }}>
              {emailVerificationNotice || (role === 'public'
                ? 'We sent a verification email to your account.'
                : 'Your legal aide account was created. Verify your email and wait for admin approval.')}
            </p>
            <Button type="button" variant="primary" onClick={() => navigate('/login')}>
              Go to Login
            </Button>
          </div>
        )}
      </form>

      <div className={styles.switchAuth}>
        Already have an account? 
        <Link to="/login" className={styles.switchLink}>Sign In</Link>
      </div>
    </AuthLayout>
  );
};

export default Register;
