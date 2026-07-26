import { supabase } from '../lib/supabase';

export const PRO_BONO_TARGET_HOURS_3Y = 60;

type EligibilityStatus = 'eligible' | 'warning' | 'blocked';

const INCOME_ELIGIBILITY: Record<string, EligibilityStatus> = {
  'Below ₱15,000/buwan': 'eligible',
  '₱15,001 - ₱25,000/buwan': 'eligible',
  '₱25,001 - ₱50,000/buwan': 'warning',
  'Higit sa ₱50,000/buwan': 'blocked',
};

const INCOME_ELIGIBILITY_MESSAGES: Record<string, string> = {
  warning:
    'Ang iyong income bracket ay maaaring hindi ka maging kwalipikado para sa libre na pro-bono legal aid. Maaari ka pa ring magpatuloy, ngunit depende sa discretion ng abogado.',
  blocked:
    'Batay sa iyong income bracket, hindi ka kwalipikado para sa libre na pro-bono legal aid sa JusticeLink. Ang serbisyong ito ay para lamang sa mga indibidwal na may limitadong kakayahang pinansyal.',
};

export type IncomeEligibilityResult = {
  status: EligibilityStatus;
  message?: string;
};

export const checkIncomeEligibility = (incomeBracket: string): IncomeEligibilityResult => {
  const status = INCOME_ELIGIBILITY[incomeBracket] ?? 'eligible';
  return {
    status,
    message: status !== 'eligible' ? INCOME_ELIGIBILITY_MESSAGES[status] : undefined,
  };
};

export type TriageInput = {
  userId: string;
  category: string;
  urgency: 'high' | 'medium' | 'low';
  incomeBracket: string;
  province: string;
  region?: string;
  preferredLanguage?: string;
  concernSummary: string;
  opposingPartyType: string;
  hasDeadline: boolean;
  deadlineDate?: string;
  hasDocuments: boolean;
};

export type TriageLawyerMatch = {
  attorneyId: string;
  name: string;
  firmName: string;
  categoryFit: string;
  score: number;
  reasons: string[];
  language: string;
  province: string;
  activeCases: number;
  proBonoHours3y: number;
  remainingHoursToTarget: number;
  progressPercent: number;
  ibpNumber: string;
  practiceAreas: string[];
  avgRating: number | null;
  ratingCount: number;
};

export type TriageResult = {
  caseId: string | null;
  assessmentId: string | null;
  matches: TriageLawyerMatch[];
  warnings: string[];
};

type AttorneyCandidate = {
  id: string;
  firstName: string;
  lastName: string;
  firmName: string;
  interests: string[];
  language: string;
  province: string;
  ibpNumber: string;
  region: string;
};

const FALLBACK_ATTORNEYS: AttorneyCandidate[] = [];

const getAttorneyProBonoHourMap = async (): Promise<Record<string, number>> => {
  const result: Record<string, number> = {};

  const { data, error } = await supabase
    .from('pro_bono_logs')
    .select('attorney_id,hours');

  if (error || !data) return result;

  for (const row of data) {
    const attorneyId = text((row as any).attorney_id);
    if (!attorneyId) continue;
    result[attorneyId] = (result[attorneyId] || 0) + Number((row as any).hours || 0);
  }

  return result;
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Housing, Lupa & Eviction': ['housing', 'eviction', 'lupa', 'property', 'rent', 'ari-arian'],
  'Labor & Employment (Trabaho)': ['labor', 'employment', 'trabaho', 'wage', 'paggawa', 'sahod'],
  'Family & VAWC (Violence Against Women)': ['family', 'vawc', 'women', 'children', 'pampamilya'],
  'Criminal Cases': ['criminal', 'crime', 'depensa', 'defense'],
  'Debt & Small Claims': ['debt', 'small claims', 'utang', 'collection'],
  'Iba pang Civil Matters': ['civil', 'contract', 'damages', 'other'],
};

const text = (value: unknown) => String(value || '').trim();

const normalize = (value: string) => value.toLowerCase().trim();

const computePracticeScore = (interests: string[], category: string) => {
  if (!interests.length) return 55;

  const normalizedInterests = interests.map((item) => normalize(item));
  const keywords = CATEGORY_KEYWORDS[category] || [normalize(category)];

  const matches = keywords.some((keyword) =>
    normalizedInterests.some((interest) => interest.includes(keyword)),
  );

  return matches ? 100 : 58;
};

const computeLocationScore = (
  attorneyProvince: string,
  attorneyRegion: string,
  targetProvince: string,
  targetRegion: string,
) => {
  const aProvince = normalize(attorneyProvince);
  const aRegion = normalize(attorneyRegion);
  const tProvince = normalize(targetProvince);
  const tRegion = normalize(targetRegion);

  if (aProvince && tProvince && aProvince === tProvince) return 100;
  if (aRegion && tRegion && aRegion === tRegion) return 80;
  return 55;
};

const computeLanguageScore = (attorneyLanguage: string, preferredLanguage?: string) => {
  if (!preferredLanguage) return 85;
  const lang = normalize(attorneyLanguage);
  const preferred = normalize(preferredLanguage);

  if (!preferred || preferred === 'either') return 85;
  if (lang.includes(preferred)) return 100;
  return 62;
};

const computeUrgencyScore = (urgency: TriageInput['urgency'], activeCases: number) => {
  if (urgency === 'high') {
    if (activeCases <= 5) return 100;
    if (activeCases <= 9) return 72;
    return 48;
  }

  if (urgency === 'medium') {
    if (activeCases <= 8) return 92;
    if (activeCases <= 12) return 70;
    return 55;
  }

  if (activeCases <= 10) return 88;
  return 72;
};

const computeAvailabilityScore = (activeCases: number) => {
  if (activeCases <= 4) return 100;
  if (activeCases <= 8) return 82;
  if (activeCases <= 12) return 64;
  return 45;
};

const computeProBonoScore = (hours3y: number) => {
  // Lawyers still below the 60-hour / 3-year requirement are prioritized slightly.
  const remaining = Math.max(0, PRO_BONO_TARGET_HOURS_3Y - hours3y);
  return 40 + Math.round((remaining / PRO_BONO_TARGET_HOURS_3Y) * 60);
};

const computeWeightedScore = (
  parts: {
    practice: number;
    location: number;
    urgency: number;
    availability: number;
    proBono: number;
  }
) => {
  const locationWeight = 0.15;
  const availabilityWeight = 0.15;

  const weighted =
    parts.practice * 0.4 +
    parts.location * locationWeight +
    parts.language * 0.1 +
    parts.urgency * 0.1 +
    parts.availability * availabilityWeight +
    parts.proBono * 0.1;

  return Math.round(weighted);
};

const getTopReasons = (parts: {
  practice: number;
  location: number;
  language: number;
  urgency: number;
  availability: number;
  proBono: number;
}, input: TriageInput) => {
  const reasons: string[] = [];

  if (parts.practice >= 90) reasons.push(`Strong practice-area fit for ${input.category}`);
  if (parts.location >= 85) reasons.push('Close location/jurisdiction match');
  if (parts.language >= 90 && input.preferredLanguage) reasons.push(`Can serve in your preferred language (${input.preferredLanguage})`);
  if (parts.urgency >= 90) reasons.push(`Can handle ${input.urgency} urgency cases`);
  if (parts.availability >= 85) reasons.push('Current case load allows faster response');
  if (parts.proBono >= 85) reasons.push('High pro-bono priority (60-hour / 3-year compliance)');

  if (!reasons.length) {
    reasons.push('Balanced fit across expertise, location, and availability');
  }

  return reasons.slice(0, 3);
};

const getAttorneyActiveCaseCounts = async () => {
  const result: Record<string, number> = {};

  const { data, error } = await supabase
    .from('cases')
    .select('attorney_id,status')
    .not('attorney_id', 'is', null);

  if (error || !data) {
    return result;
  }

  for (const row of data) {
    const attorneyId = text((row as any).attorney_id);
    const status = normalize(text((row as any).status));
    if (!attorneyId) continue;

    const isClosed = status.includes('closed');
    if (!isClosed) {
      result[attorneyId] = (result[attorneyId] || 0) + 1;
    }
  }

  return result;
};

const getAttorneyRatingMap = async (): Promise<Record<string, { avg: number; count: number }>> => {
  const result: Record<string, { avg: number; count: number }> = {};
  const { data, error } = await supabase
    .from('cases')
    .select('attorney_id, feedback_rating')
    .not('attorney_id', 'is', null)
    .not('feedback_rating', 'is', null);
  if (error || !data) return result;
  for (const row of data) {
    const id = text((row as any).attorney_id);
    const rating = Number((row as any).feedback_rating);
    if (!id || isNaN(rating)) continue;
    if (!result[id]) result[id] = { avg: 0, count: 0 };
    result[id].count++;
    result[id].avg += (rating - result[id].avg) / result[id].count;
  }
  return result;
};

const fetchAttorneyCandidates = async (): Promise<{ candidates: AttorneyCandidate[]; warning?: string }> => {
  const { data, error } = await supabase
    .from('users')
    .select('id,first_name,last_name,firm_name,interests,province,region,ibp_number,languages')
    .eq('role', 'Volunteer Attorney')
    .eq('status_verification', 'verified');

  if (error) {
    return {
      candidates: FALLBACK_ATTORNEYS,
      warning: 'Attorney directory is currently using fallback data while live matching access is being configured.',
    };
  }

  if (!data || data.length === 0) {
    return {
      candidates: [],
      warning: 'Walang available na verified attorney sa kasalukuyan. Subukan muli mamaya.',
    };
  }

  const candidates: AttorneyCandidate[] = data.map((row: any) => ({
    id: text(row.id),
    firstName: text(row.first_name),
    lastName: text(row.last_name),
    firmName: text(row.firm_name) || 'JusticeLink Partner Attorney',
    interests: Array.isArray(row.interests) ? row.interests.map((item: unknown) => text(item)).filter(Boolean) : [],
    language: row.languages || 'Filipino, English',
    province: text(row.province),
    region: text(row.region),
    ibpNumber: text(row.ibp_number),
  }));

  return { candidates };
};

const buildCaseTitle = (input: TriageInput) => {
  const date = new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date());
  return `${input.category} Concern (${date})`;
};

const buildCaseDescription = (input: TriageInput) => {
  const deadline = input.hasDeadline && input.deadlineDate ? `Deadline: ${input.deadlineDate}` : 'No immediate deadline provided';

  return [
    `Concern: ${input.concernSummary}`,
    `Opposing party: ${input.opposingPartyType}`,
    `Urgency: ${input.urgency}`,
    `Location: ${input.province}`,
    `Income bracket: ${input.incomeBracket}`,
    deadline,
  ].join('\n');
};

const saveCaseAndAssessment = async (
  input: TriageInput,
  topScore: number,
): Promise<{ caseId: string | null; assessmentId: string | null; warning?: string }> => {
  try {
    const casePayload = {
      title: buildCaseTitle(input),
      description: buildCaseDescription(input),
      status: 'Pending Triage',
      client_id: input.userId,
      category: input.category,
    };

    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .insert(casePayload)
      .select('id')
      .single();

    if (caseError || !caseData?.id) {
      return {
        caseId: null,
        assessmentId: null,
        warning: 'Triage answers were processed, but case saving is pending due to database access policy.',
      };
    }

    const summary = `Initial triage completed. Category: ${input.category}. Urgency: ${input.urgency}. Top match confidence: ${topScore}%.`;

    const { userId: _userId, ...storedInput } = input;

    const { data: assessmentData, error: assessmentError } = await supabase
      .from('triage_assessments')
      .insert({
        case_id: caseData.id,
        issue_type: input.category,
        match_percentage: topScore,
        summary,
        triage_input: storedInput,
      })
      .select('id')
      .single();

    if (assessmentError) {
      return {
        caseId: caseData.id,
        assessmentId: null,
        warning: 'Case was saved, but triage assessment record is pending due to table access policy.',
      };
    }

    // Notify attorneys whose interests match this case category
    const { data: matchingAttorneys } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'Volunteer Attorney')
      .eq('status_verification', 'verified')
      .contains('interests', [input.category]);

    if (matchingAttorneys?.length) {
      await Promise.all(
        matchingAttorneys.map(a =>
          supabase.from('notifications').insert({
            user_id: a.id,
            title: 'New Pro-Bono Case Available',
            body: `A new case matching your practice area (${input.category}) is available in the Pro-Bono Hub.`,
            link: '/legal/probono',
          })
        )
      );
    }

    return { caseId: caseData.id, assessmentId: assessmentData?.id || null };
  } catch {
    return {
      caseId: null,
      assessmentId: null,
      warning: 'Case saving failed unexpectedly. Matching results are still shown for continuity.',
    };
  }
};

export const triageService = {
  async getMatchesForCase(caseId: string, userId: string): Promise<TriageLawyerMatch[]> {
    const [assessmentRes, userRes] = await Promise.all([
      supabase
        .from('triage_assessments')
        .select('triage_input, issue_type')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabase.from('users').select('province, region').eq('id', userId).single(),
    ]);

    const stored = (assessmentRes.data?.triage_input as Omit<TriageInput, 'userId'> | null) ?? null;

    // Fall back to extracting from case description for legacy cases that predate triage_input storage.
    let resolvedInput: TriageInput;
    if (stored) {
      resolvedInput = { ...stored, userId };
    } else {
      const caseRes = await supabase.from('cases').select('title, description').eq('id', caseId).single();
      const title = (caseRes.data?.title as string) || '';
      const category = title.replace(/ Concern \([^)]*\)$/, '').trim() || 'Iba pang Civil Matters';
      const desc = (caseRes.data?.description as string) || '';
      const urgencyMatch = desc.match(/Urgency:\s*(high|medium|low)/i);
      const urgency = ((urgencyMatch?.[1] || 'medium').toLowerCase()) as 'high' | 'medium' | 'low';
      resolvedInput = {
        userId,
        category,
        urgency,
        incomeBracket: 'Below ₱15,000/buwan',
        province: (userRes.data?.province as string) || '',
        region: (userRes.data?.region as string) || '',
        concernSummary: '',
        opposingPartyType: 'individual',
        hasDeadline: false,
        hasDocuments: false,
      };
    }

    const { candidates } = await fetchAttorneyCandidates();
    const [activeCaseCounts, proBonoHourMap, ratingMap] = await Promise.all([
      getAttorneyActiveCaseCounts(),
      getAttorneyProBonoHourMap(),
      getAttorneyRatingMap(),
    ]);

    return candidates
      .map((attorney) => {
        const activeCases = activeCaseCounts[attorney.id] || 0;
        const proBonoHours3y = proBonoHourMap[attorney.id] || 0;

        const scoreParts = {
          practice: computePracticeScore(attorney.interests, resolvedInput.category),
          location: computeLocationScore(attorney.province, attorney.region, resolvedInput.province, resolvedInput.region || ''),
          language: computeLanguageScore(attorney.language, resolvedInput.preferredLanguage),
          urgency: computeUrgencyScore(resolvedInput.urgency, activeCases),
          availability: computeAvailabilityScore(activeCases),
          proBono: computeProBonoScore(proBonoHours3y),
        };

        const score = computeWeightedScore(scoreParts);
        const remainingHours = Math.max(0, PRO_BONO_TARGET_HOURS_3Y - proBonoHours3y);
        const progressPercent = Math.min(100, Math.round((proBonoHours3y / PRO_BONO_TARGET_HOURS_3Y) * 100));
        const ratingEntry = ratingMap[attorney.id];

        return {
          attorneyId: attorney.id,
          name: `${attorney.firstName || 'Atty.'} ${attorney.lastName || ''}`.trim(),
          firmName: attorney.firmName,
          categoryFit: resolvedInput.category,
          score,
          reasons: getTopReasons(scoreParts, resolvedInput),
          language: attorney.language || 'English',
          province: attorney.province || 'Location unavailable',
          activeCases,
          proBonoHours3y,
          remainingHoursToTarget: remainingHours,
          progressPercent,
          ibpNumber: attorney.ibpNumber,
          practiceAreas: attorney.interests,
          avgRating: ratingEntry ? ratingEntry.avg : null,
          ratingCount: ratingEntry ? ratingEntry.count : 0,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  },

  async runPhaseOneTriage(input: TriageInput): Promise<TriageResult> {
    const warnings: string[] = [];

    const { candidates, warning: candidateWarning } = await fetchAttorneyCandidates();
    if (candidateWarning) warnings.push(candidateWarning);

    if (candidates.length === 0) {
      const persisted = await saveCaseAndAssessment(input, 0);
      if (persisted.warning) warnings.push(persisted.warning);
      return { caseId: persisted.caseId, assessmentId: persisted.assessmentId, matches: [], warnings };
    }

    const [activeCaseCounts, proBonoHourMap, ratingMap] = await Promise.all([
      getAttorneyActiveCaseCounts(),
      getAttorneyProBonoHourMap(),
      getAttorneyRatingMap(),
    ]);

    const matches: TriageLawyerMatch[] = candidates
      .map((attorney) => {
        const activeCases = activeCaseCounts[attorney.id] || 0;
        const proBonoHours3y = proBonoHourMap[attorney.id] || 0;

        const scoreParts = {
          practice: computePracticeScore(attorney.interests, input.category),
          location: computeLocationScore(attorney.province, attorney.region, input.province, input.region || ''),
          language: computeLanguageScore(attorney.language, input.preferredLanguage),
          urgency: computeUrgencyScore(input.urgency, activeCases),
          availability: computeAvailabilityScore(activeCases),
          proBono: computeProBonoScore(proBonoHours3y),
        };

        const score = computeWeightedScore(scoreParts);
        const remainingHours = Math.max(0, PRO_BONO_TARGET_HOURS_3Y - proBonoHours3y);
        const progressPercent = Math.min(
          100,
          Math.round((proBonoHours3y / PRO_BONO_TARGET_HOURS_3Y) * 100),
        );
        const ratingEntry = ratingMap[attorney.id];

        return {
          attorneyId: attorney.id,
          name: `${attorney.firstName || 'Atty.'} ${attorney.lastName || ''}`.trim(),
          firmName: attorney.firmName,
          categoryFit: input.category,
          score,
          reasons: getTopReasons(scoreParts, input),
          language: attorney.language || 'English',
          province: attorney.province || 'Location unavailable',
          activeCases,
          proBonoHours3y,
          remainingHoursToTarget: remainingHours,
          progressPercent,
          ibpNumber: attorney.ibpNumber,
          practiceAreas: attorney.interests,
          avgRating: ratingEntry ? ratingEntry.avg : null,
          ratingCount: ratingEntry ? ratingEntry.count : 0,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const topScore = matches[0]?.score || 0;
    const persisted = await saveCaseAndAssessment(input, topScore);
    if (persisted.warning) warnings.push(persisted.warning);

    return {
      caseId: persisted.caseId,
      assessmentId: persisted.assessmentId,
      matches,
      warnings,
    };
  },
};
