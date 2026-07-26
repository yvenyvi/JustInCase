import { CaseActivity, TriageAlert } from '../types';

export const recentActivities: CaseActivity[] = [
  { title: 'Eviction Defense - Dela Cruz Family', status: 'In Progress', date: 'Oct 24', color: 'var(--color-warning)' },
  { title: 'Wage Theft Claim - Maria Santos', status: 'In Progress', date: 'Oct 22', color: 'var(--color-primary)' },
  { title: 'Barangay Mediation - Reyes', status: 'Closed - Won', date: 'Oct 15', color: 'var(--color-success)' },
];

export const pendingTriageAlerts: TriageAlert[] = [
  { type: 'Housing / Eviction', match: '98%' },
  { type: 'Labor Law', match: '85%' }
];
