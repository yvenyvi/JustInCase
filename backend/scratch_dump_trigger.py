import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

try:
    # Use RPC if there's a custom endpoint, but we don't have one.
    # Alternatively, let's just create a new python script that uses psycopg2 to connect directly to the DB if we have the connection string.
    # But we only have VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
    pass
except Exception as e:
    print(e)
