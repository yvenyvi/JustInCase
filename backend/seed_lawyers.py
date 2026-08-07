import os
import uuid
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(url, key)

lawyers = [
    {
        "id": str(uuid.uuid4()),
        "email": "atty.cruz@example.com",
        "handle": "atty_cruz",
        "first_name": "Juan",
        "last_name": "Cruz",
        "role": "Volunteer Attorney",
        "firm_name": "Cruz & Associates Law Office",
        "city_municipality": "Quezon City",
        "selfie_url": "https://i.pravatar.cc/150?u=cruz",
        "status_verification": "verified"
    },
    {
        "id": str(uuid.uuid4()),
        "email": "atty.santos@example.com",
        "handle": "atty_santos",
        "first_name": "Maria",
        "last_name": "Santos",
        "role": "Volunteer Attorney",
        "firm_name": "Santos Legal Group",
        "city_municipality": "Manila",
        "selfie_url": "https://i.pravatar.cc/150?u=santos",
        "status_verification": "verified"
    },
    {
        "id": str(uuid.uuid4()),
        "email": "atty.reyes@example.com",
        "handle": "atty_reyes",
        "first_name": "Antonio",
        "last_name": "Reyes",
        "role": "Volunteer Attorney",
        "firm_name": "Reyes Law Firm",
        "city_municipality": "Makati",
        "selfie_url": "https://i.pravatar.cc/150?u=reyes",
        "status_verification": "verified"
    }
]

for lawyer in lawyers:
    try:
        res = supabase.table('users').insert(lawyer).execute()
        print(f"Inserted {lawyer['first_name']} {lawyer['last_name']}")
    except Exception as e:
        print(f"Failed to insert {lawyer['first_name']}: {e}")

print("Done seeding lawyers.")
