import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(url, key)

email = "new_admin2@justice.link"
password = "TestPassword123!"

try:
    # 1. Create in Supabase Auth
    user_resp = supabase.auth.admin.create_user({
        "email": email,
        "password": password,
        "email_confirm": True
    })
    user_id = user_resp.user.id
    
    # 2. Insert into public.users table
    admin_data = {
        "id": user_id,
        "email": email,
        "first_name": "New",
        "last_name": "Admin",
        "handle": "@new_admin",
        "role": "Super Administrator",
        "status": "offline",
        "is_didit_verified": True,
        "status_verification": "verified"
    }
    
    supabase.table("users").update(admin_data).eq("id", user_id).execute()
    print("SUCCESS: Admin account updated!")
    print(f"Email: {email}")
    print(f"Password: {password}")
except Exception as e:
    print(f"Error: {e}")
