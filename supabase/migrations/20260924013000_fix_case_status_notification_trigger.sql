-- case_status is an enum. Cast it to text before pattern matching or grouping
-- values so closing a case cannot fail inside the notification trigger.
CREATE OR REPLACE FUNCTION public.trigger_notify_on_case_status()
RETURNS TRIGGER AS $$
DECLARE
    v_attorney_name VARCHAR;
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        IF NEW.status::text = 'In Progress'
           AND NEW.attorney_id IS NOT NULL
           AND OLD.status::text = 'Pending Triage' THEN
            SELECT first_name || ' ' || last_name
            INTO v_attorney_name
            FROM public.users
            WHERE id = NEW.attorney_id;

            INSERT INTO public.notifications (user_id, title, body, type, reference_id)
            VALUES (
                NEW.client_id,
                'Case Accepted!',
                'Atty. ' || v_attorney_name || ' has accepted your case: ' || NEW.title,
                'case_accepted',
                NEW.id
            );
        ELSIF NEW.status::text LIKE 'Closed%'
              OR NEW.status::text IN ('Dropped', 'Withdrawn') THEN
            INSERT INTO public.notifications (user_id, title, body, type, reference_id)
            VALUES (
                NEW.client_id,
                'Case Closed',
                'Your case "' || NEW.title || '" is now marked as ' || NEW.status::text || '.',
                'case_closed',
                NEW.id
            );
        ELSE
            INSERT INTO public.notifications (user_id, title, body, type, reference_id)
            VALUES (
                NEW.client_id,
                'Case Status Updated',
                'Your case "' || NEW.title || '" is now marked as ' || NEW.status::text || '.',
                'case_update',
                NEW.id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Fail deployment if application and database status vocabularies drift.
DO $$
DECLARE
    expected text[] := ARRAY[
        'Pending Triage',
        'Pending Acceptance',
        'In Progress',
        'Hearing Scheduled',
        'Demand Sent',
        'Closed - Won',
        'Closed - Lost',
        'Withdrawn',
        'Dropped'
    ];
    actual text[];
BEGIN
    SELECT array_agg(e.enumlabel ORDER BY e.enumsortorder)
    INTO actual
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'case_status';

    IF actual IS DISTINCT FROM expected THEN
        RAISE EXCEPTION 'case_status enum mismatch. Expected %, found %', expected, actual;
    END IF;
END;
$$;
