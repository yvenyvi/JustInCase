import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

try:
    # We can query postgres using the rpc or a REST endpoint, but wait! Supabase python client doesn't support raw SQL easily unless we use RPC.
    # Let's just try to insert the user into public.users manually and see what error it gives!
    
    metadata = {
      "barangay": "Pungo",
      "city_municipality": "Calumpit",
      "date_of_birth": "1985-05-15",
      "email": "uylance72@gmail.com",
      "expiration_date": "2026-12-31",
      "first_name": "JUAN",
      "handle": "juan_dela_cruz",
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
      "status_verification": "pending",
      "street_address": "123 Main St",
    }
    
    admin_data = {
        "id": "ededd8ea-2ef7-4501-a403-4965769b42f6",
        **metadata
    }
    
    print("Trying manual insert...")
    res = supabase.table("users").insert(admin_data).execute()
    print("Manual insert success:", res)

except Exception as e:
    print("Error during manual insert:", e)
