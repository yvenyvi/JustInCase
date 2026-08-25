import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(url, key)

try:
    # Try the AuditLogs query
    res1 = supabase.table("audit_logs").select("id, user_id, action_type, detail, ip_address, created_at").limit(5).execute()
    print("AuditLogs query OK:", len(res1.data))
except Exception as e:
    print("AuditLogs query ERROR:", e)

try:
    # Try the AdminDashboard query
    res2 = supabase.table("audit_logs").select("id, action_type, detail, created_at, user_id").limit(5).execute()
    print("AdminDashboard query OK:", len(res2.data))
except Exception as e:
    print("AdminDashboard query ERROR:", e)
