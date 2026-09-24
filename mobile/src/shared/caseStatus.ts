export const CASE_STATUSES = [
  'Pending Triage',
  'Pending Acceptance',
  'In Progress',
  'Hearing Scheduled',
  'Demand Sent',
  'Closed - Won',
  'Closed - Lost',
  'Withdrawn',
  'Dropped',
] as const;

export type CaseStatus = typeof CASE_STATUSES[number];

export const CLOSED_CASE_STATUSES: readonly CaseStatus[] = [
  'Closed - Won',
  'Closed - Lost',
  'Withdrawn',
  'Dropped',
];

export const COMPLETED_CASE_STATUSES: readonly CaseStatus[] = [
  'Closed - Won',
  'Closed - Lost',
];

export const isCaseStatus = (value: unknown): value is CaseStatus =>
  typeof value === 'string' && CASE_STATUSES.includes(value as CaseStatus);

export const isClosedCaseStatus = (value: string): value is CaseStatus =>
  CLOSED_CASE_STATUSES.includes(value as CaseStatus);

export const isCompletedCaseStatus = (value: string): value is CaseStatus =>
  COMPLETED_CASE_STATUSES.includes(value as CaseStatus);
