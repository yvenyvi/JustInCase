import {
  CASE_STATUSES,
  isCaseStatus,
  isClosedCaseStatus,
  isCompletedCaseStatus,
} from '../src/shared/caseStatus';

describe('case status enum contract', () => {
  it('matches the database case_status enum exactly', () => {
    expect(CASE_STATUSES).toEqual([
      'Pending Triage',
      'Pending Acceptance',
      'In Progress',
      'Hearing Scheduled',
      'Demand Sent',
      'Closed - Won',
      'Closed - Lost',
      'Withdrawn',
      'Dropped',
    ]);
    CASE_STATUSES.forEach(status => expect(isCaseStatus(status)).toBe(true));
    expect(isCaseStatus('Accepted')).toBe(false);
    expect(isCaseStatus('Resolved')).toBe(false);
  });

  it('classifies terminal outcomes without unsupported aliases', () => {
    expect(isCompletedCaseStatus('Closed - Won')).toBe(true);
    expect(isCompletedCaseStatus('Closed - Lost')).toBe(true);
    expect(isClosedCaseStatus('Withdrawn')).toBe(true);
    expect(isClosedCaseStatus('Dropped')).toBe(true);
    expect(isClosedCaseStatus('In Progress')).toBe(false);
  });
});
