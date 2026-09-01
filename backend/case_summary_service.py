import logging
import httpx
from config import config
from groq_client import call_groq
from gemini_client import call_gemini

logger = logging.getLogger(__name__)

def generate_case_journey_summary(case_id: str) -> str:
    """
    Fetches case details, audit logs, pro bono logs, and messages for a given case,
    and calls the AI to generate a detailed, clear summary of the case's entire journey.
    Saves the generated summary to the database.
    """
    headers = {
        "apikey": config.supabase_service_role_key,
        "Authorization": f"Bearer {config.supabase_service_role_key}"
    }

    # 1. Fetch Case Details
    case_url = f"{config.supabase_url}/rest/v1/cases?id=eq.{case_id}&select=id,title,status,description,created_at,closing_notes,closed_at,attorney_id,client_id,attorney:users!cases_attorney_id_fkey(first_name,last_name),client:users!cases_client_id_fkey(first_name,last_name)"
    try:
        resp = httpx.get(case_url, headers=headers, timeout=10.0)
        resp.raise_for_status()
        cases = resp.json()
        if not cases:
            raise ValueError(f"Case {case_id} not found.")
        case = cases[0]
    except Exception as e:
        logger.error(f"Error fetching case details: {e}")
        raise RuntimeError(f"Failed to fetch case details: {e}")

    # Format Client and Attorney names
    client_name = "Unknown Client"
    if case.get("client"):
        c_info = case["client"]
        client_name = f"{c_info.get('first_name', '')} {c_info.get('last_name', '')}".strip()

    attorney_name = "Unassigned"
    if case.get("attorney"):
        a_info = case["attorney"]
        attorney_name = f"Atty. {a_info.get('first_name', '')} {a_info.get('last_name', '')}".strip()

    # 2. Fetch Audit Logs
    audit_url = f"{config.supabase_url}/rest/v1/audit_logs?detail=like.*{case_id}*&order=created_at.asc"
    audit_events = []
    try:
        resp = httpx.get(audit_url, headers=headers, timeout=10.0)
        resp.raise_for_status()
        logs = resp.json()
        for log in logs:
            audit_events.append({
                "action": log.get("action_type"),
                "detail": log.get("detail"),
                "time": log.get("created_at")
            })
    except Exception as e:
        logger.warning(f"Error fetching audit logs: {e}")

    # 3. Fetch Pro Bono Logs (Time Logs)
    pro_bono_url = f"{config.supabase_url}/rest/v1/pro_bono_logs?case_id=eq.{case_id}&order=created_at.asc"
    time_logs = []
    try:
        resp = httpx.get(pro_bono_url, headers=headers, timeout=10.0)
        resp.raise_for_status()
        logs = resp.json()
        for log in logs:
            time_logs.append({
                "hours": log.get("hours"),
                "description": log.get("description"),
                "is_verified": log.get("is_verified"),
                "time": log.get("created_at")
            })
    except Exception as e:
        logger.warning(f"Error fetching pro bono logs: {e}")

    # 4. Fetch Messages
    messages = []
    try:
        thread_url = f"{config.supabase_url}/rest/v1/message_threads?case_id=eq.{case_id}"
        resp = httpx.get(thread_url, headers=headers, timeout=10.0)
        resp.raise_for_status()
        threads = resp.json()
        if threads:
            thread_id = threads[0].get("id")
            msg_url = f"{config.supabase_url}/rest/v1/messages?thread_id=eq.{thread_id}&order=created_at.asc"
            resp = httpx.get(msg_url, headers=headers, timeout=10.0)
            resp.raise_for_status()
            raw_msgs = resp.json()
            
            client_id = case.get("client_id")
            attorney_id = case.get("attorney_id")
            
            for msg in raw_msgs:
                sender_role = "System"
                sender_id = msg.get("sender_id")
                if sender_id == client_id:
                    sender_role = "Client"
                elif sender_id == attorney_id:
                    sender_role = "Attorney"
                
                messages.append({
                    "sender": sender_role,
                    "content": msg.get("content"),
                    "time": msg.get("created_at")
                })
    except Exception as e:
        logger.warning(f"Error fetching messages: {e}")

    # 5. Format journey details for AI prompt
    timeline_desc = ""
    if audit_events:
        timeline_desc += "Timeline of events:\n"
        for idx, event in enumerate(audit_events, 1):
            timeline_desc += f"- [{event['time']}] {event['action']}: {event['detail']}\n"
    else:
        timeline_desc += "No timeline events recorded.\n"

    time_logs_desc = ""
    if time_logs:
        time_logs_desc += "Work logged by attorney:\n"
        for idx, log in enumerate(time_logs, 1):
            status = "Verified" if log["is_verified"] else "Pending verification"
            time_logs_desc += f"- [{log['time']}] {log['hours']} hours: {log['description']} ({status})\n"
    else:
        time_logs_desc += "No hours logged.\n"

    chat_desc = ""
    if messages:
        chat_desc += "Key communication points (Messages):\n"
        for msg in messages:
            chat_desc += f"- [{msg['time']}] {msg['sender']}: {msg['content']}\n"
    else:
        chat_desc += "No consultation messages exchanged.\n"

    # AI Prompt Construction
    prompt = f"""You are an expert legal case analyst for JusticeLink Philippines.
Write a concise, professional, and easily understandable summary of this legal case's journey.
Keep the summary short (maximum 3-4 short paragraphs or bulleted sections). DO NOT write a long essay.

Structure your response using plain text formatting (this will be displayed in a basic text view without markdown parsing). Use line breaks and bullet points (•) to make it easy to read.
Include only the most important highlights:
THE CONCERN: A brief 1-2 sentence summary of the client's initial issue.
THE ACTION: A bulleted list of the most critical milestones, attorney work done, and key consultation points.
THE OUTCOME: The final case outcome and closing notes.

Case Details:
- Title: {case.get('title')}
- Client: {client_name}
- Attorney: {attorney_name}
- Created At: {case.get('created_at')}
- Closed At: {case.get('closed_at') or 'N/A'}
- Final Status: {case.get('status')}
- Client Intake / Original Concern: {case.get('description')}
- Closing Notes / Reason: {case.get('closing_notes') or 'None provided'}

Activity Logs:
{timeline_desc}

Attorney Logs:
{time_logs_desc}

Consultation Summary:
{chat_desc}

Write in a professional, empathetic, and clear Taglish (or English). Avoid legal jargon.
CRITICAL: Do not use markdown bolding (**text**) or markdown headers (# Header). Use plain ALL CAPS for section headers, and standard bullet points (•).
Respond ONLY with the summary text itself, with no conversational filler.
"""

    # 6. Call LLM
    try:
        if config.groq_api_keys:
            summary = call_groq(
                messages=[{"role": "user", "content": prompt}],
                model=config.groq_model,
                temperature=0.3,
                timeout=50.0
            )
        elif config.gemini_api_keys:
            summary = call_gemini(
                messages=[{"role": "user", "content": prompt}],
                model="gemini-flash-latest",
                temperature=0.3,
                timeout=50.0
            )
        else:
            raise ValueError("No LLM API keys configured.")
    except Exception as e:
        logger.error(f"Failed to generate summary with Groq, trying Gemini fallback: {e}")
        if config.gemini_api_keys:
            try:
                summary = call_gemini(
                    messages=[{"role": "user", "content": prompt}],
                    model="gemini-flash-latest",
                    temperature=0.3,
                    timeout=50.0
                )
            except Exception as gemini_err:
                logger.error(f"Fallback to Gemini also failed: {gemini_err}")
                raise gemini_err
        else:
            raise e

    # 7. Update Case with the AI Summary
    update_url = f"{config.supabase_url}/rest/v1/cases?id=eq.{case_id}"
    update_headers = {
        **headers,
        "Prefer": "return=representation"
    }
    try:
        resp = httpx.patch(update_url, headers=update_headers, json={"ai_summary": summary}, timeout=10.0)
        resp.raise_for_status()
        logger.info(f"Successfully saved AI summary for case {case_id}.")
    except Exception as e:
        logger.error(f"Error saving AI summary to database: {e}")
        # We still return the summary even if saving failed, so the client receives it
        
    return summary
