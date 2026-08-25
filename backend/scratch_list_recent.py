import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

print("ALL auth.users (most recent first):")
auth_users = supabase.auth.admin.list_users()
sorted_users = sorted(auth_users, key=lambda x: x.created_at, reverse=True)
for u in sorted_users[:15]:
    print(f"  {u.created_at} | {u.email} | {u.id}")
