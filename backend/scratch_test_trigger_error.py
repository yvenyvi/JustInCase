import os
from supabase import create_client, Client
from dotenv import load_dotenv
import json

load_dotenv()
url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

metadata = {
  "barangay": "Pungo",
  "city_municipality": "Calumpit",
  "date_of_birth": "1985-05-15",
  "email": "test_trigger_fail@justice.link",
  "expiration_date": "2026-12-31",
  "first_name": "JUAN",
  "handle": "juan_dela_cruz2",
  "id_number": "54321",
  "id_picture_url": "https://wubznedcvolfmdhtcbgh.supabase.co/storage/v1/object/public/verification-documents/legal-registration/uylance72_gmail_com/ibp-20260814T111439.jpg",
  "is_didit_verified": False,
  "last_name": "DELA CRUZ",
  "middle_name": "RAMOS",
  "phone_number": "09123456789",
  "province": "Bulacan",
  "region": "Region III (Central Luzon)",
  "role": "Volunteer Attorney",
  "roll_number": "12345",
  "selfie_url": "https://wubznedcvolfmdhtcbgh.supabase.co/storage/v1/object/public/verification-documents/legal-registration/uylance72_gmail_com/selfie-20260814T111440.jpg",
  "sex": "Male",
  "status_verification": "unverified",
  "street_address": "123 Main St"
}

try:
    print("Attempting to create user with full metadata...")
    user_resp = supabase.auth.admin.create_user({
        "email": "test_trigger_fail@justice.link",
        "password": "TestPassword123!",
        "email_confirm": True,
        "user_metadata": metadata
    })
    print("User created in auth.users:", user_resp.user.id)
    
    # Check if they exist in public.users
    res = supabase.table("users").select("*").eq("id", user_resp.user.id).execute()
    if len(res.data) > 0:
        print("Success! User ALSO exists in public.users")
    else:
        print("FAIL! User is NOT in public.users. Trigger failed silently!")
except Exception as e:
    print("Error during auth signup (trigger threw error?):", e)
