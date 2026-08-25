import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

try:
    print("Searching public.users for 'uylance72'...")
    res = supabase.table("users").select("*").or_("email.ilike.%uylance72%,handle.ilike.%uylance72%").execute()
    
    if len(res.data) > 0:
        for row in res.data:
            print(f"Found in public.users: Email: {row.get('email')}, Handle: {row.get('handle')}, Role: {row.get('role')}, Status: {row.get('status_verification')}")
    else:
        print("Not found in public.users.")

    print("\nListing all users in auth.users...")
    auth_users = supabase.auth.admin.list_users()
    found_in_auth = False
    for user in auth_users:
        if user.email and "uylance72" in user.email.lower():
            print(f"Found in auth.users: {user.email} (ID: {user.id})")
            found_in_auth = True
    
    if not found_in_auth:
        print("Not found in auth.users.")

except Exception as e:
    print("Error:", e)
