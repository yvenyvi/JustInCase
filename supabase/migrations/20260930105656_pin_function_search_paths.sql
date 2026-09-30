-- Pin name resolution for existing public functions so caller-controlled
-- schemas (including temporary objects) cannot shadow their dependencies.
ALTER FUNCTION public.touch_ai_conversation_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.touch_document_template_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_auth_user_insert() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_thread_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.match_rights_articles(vector, double precision, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.trigger_notify_on_message() SET search_path = public, pg_temp;
ALTER FUNCTION public.trigger_notify_on_pro_bono_log() SET search_path = public, pg_temp;
