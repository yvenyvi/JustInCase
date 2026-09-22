-- Allow a case owner to reject an attorney-submitted time log.
-- Accepting a log is already covered by the existing UPDATE policy.
BEGIN;

ALTER TABLE public.pro_bono_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pro_bono_logs_delete" ON public.pro_bono_logs;
CREATE POLICY "pro_bono_logs_delete" ON public.pro_bono_logs
  FOR DELETE TO authenticated
  USING (
    attorney_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.cases
      WHERE cases.id = pro_bono_logs.case_id
        AND cases.client_id = auth.uid()
    )
  );

COMMIT;
