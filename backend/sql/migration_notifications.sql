-- Migration: Comprehensive Notifications System
-- Run this to update the notifications table and add automated triggers

-- 1. Update Schema
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS reference_id UUID;

-- 2. Trigger Function: Notify on new message
CREATE OR REPLACE FUNCTION public.trigger_notify_on_message()
RETURNS TRIGGER AS $$
DECLARE
    v_thread_name VARCHAR;
    v_recipient_id UUID;
    v_sender_name VARCHAR;
BEGIN
    -- Find the recipient in the thread (the participant who is NOT the sender)
    -- We assume 1-on-1 threads for now. We select the first one.
    SELECT user_id INTO v_recipient_id
    FROM public.thread_participants
    WHERE thread_id = NEW.thread_id AND user_id != NEW.sender_id
    LIMIT 1;

    IF v_recipient_id IS NOT NULL THEN
        -- Get sender name
        SELECT first_name INTO v_sender_name FROM public.users WHERE id = NEW.sender_id;
        
        -- Get thread name
        SELECT name INTO v_thread_name FROM public.message_threads WHERE id = NEW.thread_id;
        IF v_thread_name IS NULL THEN
            v_thread_name := 'your case';
        END IF;

        -- Insert notification
        INSERT INTO public.notifications (user_id, title, body, type, reference_id)
        VALUES (
            v_recipient_id,
            'New Message',
            v_sender_name || ' sent you a message: "' || substring(NEW.content from 1 for 50) || '..."',
            'message',
            NEW.thread_id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_on_message ON public.messages;
CREATE TRIGGER trg_notify_on_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.trigger_notify_on_message();


-- 3. Trigger Function: Notify on case status update (e.g., Accepted)
CREATE OR REPLACE FUNCTION public.trigger_notify_on_case_status()
RETURNS TRIGGER AS $$
DECLARE
    v_attorney_name VARCHAR;
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- If case was accepted/in progress and now has an attorney
        IF NEW.status = 'In Progress' AND NEW.attorney_id IS NOT NULL AND OLD.status = 'Pending Triage' THEN
            SELECT first_name || ' ' || last_name INTO v_attorney_name FROM public.users WHERE id = NEW.attorney_id;
            
            INSERT INTO public.notifications (user_id, title, body, type, reference_id)
            VALUES (
                NEW.client_id,
                'Case Accepted!',
                'Atty. ' || v_attorney_name || ' has accepted your case: ' || NEW.title,
                'case_accepted',
                NEW.id
            );
        ELSIF NEW.status = 'Closed - Won' OR NEW.status = 'Closed - Lost' THEN
            INSERT INTO public.notifications (user_id, title, body, type, reference_id)
            VALUES (
                NEW.client_id,
                'Case Closed',
                'Your case "' || NEW.title || '" has been marked as closed.',
                'case_closed',
                NEW.id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_on_case_status ON public.cases;
CREATE TRIGGER trg_notify_on_case_status
AFTER UPDATE ON public.cases
FOR EACH ROW
EXECUTE FUNCTION public.trigger_notify_on_case_status();


-- 4. Trigger Function: Notify on pro_bono_logs insert (Verification requested)
CREATE OR REPLACE FUNCTION public.trigger_notify_on_pro_bono_log()
RETURNS TRIGGER AS $$
DECLARE
    v_client_id UUID;
    v_case_title VARCHAR;
BEGIN
    -- Get client_id and case title
    SELECT client_id, title INTO v_client_id, v_case_title
    FROM public.cases
    WHERE id = NEW.case_id;

    IF v_client_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, body, type, reference_id)
        VALUES (
            v_client_id,
            'Verify Attorney Hours',
            'Your attorney logged ' || NEW.hours || ' hours on your case "' || v_case_title || '". Please verify.',
            'verify_hours',
            NEW.case_id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_on_pro_bono_log ON public.pro_bono_logs;
CREATE TRIGGER trg_notify_on_pro_bono_log
AFTER INSERT ON public.pro_bono_logs
FOR EACH ROW
EXECUTE FUNCTION public.trigger_notify_on_pro_bono_log();
