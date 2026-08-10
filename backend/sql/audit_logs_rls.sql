-- Allow authenticated users to read audit_logs
BEGIN;
DROP POLICY IF EXISTS "authenticated users can read audit logs" ON public.audit_logs;
CREATE POLICY "authenticated users can read audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (true);
COMMIT;
