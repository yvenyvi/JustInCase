import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

try:
    print("Deleting user ededd8ea-2ef7-4501-a403-4965769b42f6 from auth.users...")
    res = supabase.auth.admin.delete_user("ededd8ea-2ef7-4501-a403-4965769b42f6")
    print("Successfully deleted:", res)
except Exception as e:
    print("Error deleting user:", e)
