DROP POLICY IF EXISTS "cases_attorney_update" ON public.cases;
CREATE POLICY "cases_attorney_update" ON public.cases
  FOR UPDATE TO authenticated
  USING (
    attorney_id = auth.uid()
    OR (attorney_id IS NULL AND status = 'Pending Triage')
  )
  WITH CHECK (
    attorney_id = auth.uid()
    OR attorney_id IS NULL
  );
