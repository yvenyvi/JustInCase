# Supabase migration history

The recent migration files in this folder use the same version IDs as the
corresponding migrations recorded in the linked Supabase project. Two schema
changes that were already present remotely (`user_documents` and the case
status notification function) have also been recorded as idempotent migrations.

The remote project still has these older applied migrations for which this
checkout has no SQL files:

- `20260501090730` `fix_legal_user_trigger_missing_fields`
- `20260501114954` `add_pending_acceptance_case_status`
- `20260502071314` `messaging_rls_and_trigger`
- `20260502073644` `fix_messaging_rls_recursion`
- `20260502073838` `create_notifications_table`
- `20260502091421` `fix_messages_send_and_realtime`
- `20260502091732` `message_attachments`
- `20260502124326` `add_case_closure_fields`
- `20260502152229` `ai_chat_rls`
- `20260503064424` `audit_logs_rls_and_policies`
- `20260503065505` `create_system_settings`
- `20260524121931` `add_avatar_url_and_storage_bucket`
- `20260524122024` `add_feedback_rating_to_cases`
- `20260525115141` `add_avatars_bucket_and_column`
- `20260525121544` `enable_rls_pro_bono_logs`
- `20260525121553` `enable_rls_case_studies`
- `20260525121938` `add_feedback_rating_to_cases`
- `20260525154529` `drop_audit_logs_ip_address`
- `20260525154554` `add_terms_accepted_at`
- `20260526041817` `add_terms_accepted_at`
- `20260526041852` `clear_orphaned_feedback_rating`
- `20260529100623` `attorney_timeout_escalation`
- `20260529100852` `add_languages_column_to_users`
- `20260529105835` `pro_bono_logs_citizen_rls`
- `20260529111549` `add_client_comment_to_cases`

Do not fabricate empty migrations or reset/push the linked database to address
this gap. Recover the original SQL from version control or a trusted backup
before attempting a full local/remote history reconciliation.

On 2026-09-30, the linked staging database was verified to be missing the
`public.users.terms_accepted_at` column despite the two historical migration
records above. A single additive convergence migration,
`20260930133105_ensure_terms_accepted_at.sql`, was applied to staging through
Supabase MCP and recorded remotely. This restores the expected column without
resetting or reconciling the older missing migration history. The missing SQL
files still need recovery before a general `supabase db push` or reset.

The terms update is restricted to `public.accept_terms()`, a security-definer
RPC that derives the target user from `auth.uid()`. Its execution is revoked
from `PUBLIC` and `anon` and granted only to `authenticated`, avoiding a broad
self-update policy on user profiles. This RPC is recorded in
`20260930133621_accept_terms_rpc.sql`.
