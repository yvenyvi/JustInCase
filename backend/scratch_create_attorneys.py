import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(url, key)

attorneys = [
    {
        "email": "test_accept@justice.link",
        "first_name": "Test",
        "last_name": "Accept",
        "handle": "@test_accept",
        "ibp_number": "IBP-123",
        "roll_number": "ROLL-123"
    },
    {
        "email": "test_reject@justice.link",
        "first_name": "Test",
        "last_name": "Reject",
        "handle": "@test_reject",
        "ibp_number": "IBP-999",
        "roll_number": "ROLL-999"
    }
]

for atty in attorneys:
    email = atty["email"]
    try:
        # Create user in Auth
        user_resp = supabase.auth.admin.create_user({
            "email": email,
            "password": "TestPassword123!",
            "email_confirm": True
        })
        user_id = user_resp.user.id
        
        # Insert or update in public.users
        admin_data = {
            "id": user_id,
            "email": email,
            "first_name": atty["first_name"],
            "last_name": atty["last_name"],
            "handle": atty["handle"],
            "role": "Volunteer Attorney",
            "status": "offline",
            "is_didit_verified": True,
            "status_verification": "unverified",
            "ibp_number": atty["ibp_number"],
            "roll_number": atty["roll_number"]
        }
        
        try:
            supabase.table("users").insert(admin_data).execute()
        except Exception:
            supabase.table("users").update(admin_data).eq("id", user_id).execute()
            
        print(f"SUCCESS: Created unverified attorney {email}")
    except Exception as e:
        print(f"Error creating {email}: {e}")
