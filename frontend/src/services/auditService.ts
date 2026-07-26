import { supabase } from '../lib/supabase';

export type AuditActionType =
  | 'User Login'
  | 'Case Accepted'
  | 'Case Assigned'
  | 'Case Rejected'
  | 'Case Closed'
  | 'Case Withdrawn'
  | 'Triage Submitted'
  | 'Attorney Matched'
  | 'Message Sent'
  | 'File Uploaded'
  | 'Profile Updated'
  | 'Service Log Submitted'
  | 'Service Log Verified'
  | 'Service Log Disputed'
  | 'Attorney Verified'
  | 'Attorney Rejected'
  | 'Account Suspended'
  | 'Account Unsuspended'
  | 'Account Deleted'
  | 'User Created'
  | 'Case Feedback Submitted';

export const auditService = {
  async log(actionType: AuditActionType, detail: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action_type: actionType,
        detail,
      });
    } catch {
      // Audit logging must never break the main flow
    }
  },
};
