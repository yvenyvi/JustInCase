import os
from supabase import create_client, Client
from dotenv import load_dotenv
import json

load_dotenv()
url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

try:
    user_id = "ededd8ea-2ef7-4501-a403-4965769b42f6"
    res = supabase.auth.admin.get_user_by_id(user_id)
    print("User Meta Data:")
    print(json.dumps(res.user.user_metadata, indent=2))
except Exception as e:
    print("Error:", e)
