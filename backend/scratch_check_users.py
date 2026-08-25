import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

try:
    # Query latest users
    res = supabase.table("users").select("id, email, role, status_verification, created_at").order("created_at", desc=True).limit(5).execute()
    print("Recent Users:")
    for row in res.data:
        print(row)
except Exception as e:
    print("Error:", e)
