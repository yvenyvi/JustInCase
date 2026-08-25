import httpx
import os
from dotenv import load_dotenv

load_dotenv()
PAT = os.environ.get("SUPABASE_PAT")
PROJECT_REF = "wubznedcvolfmdhtcbgh"

url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
headers = {
    "Authorization": f"Bearer {PAT}",
    "Content-Type": "application/json"
}

# Get the trigger function source
sql = """
SELECT p.proname, p.prosrc
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname ILIKE '%handle%'
UNION ALL
SELECT p.proname, p.prosrc
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname ILIKE '%user%' AND n.nspname IN ('public', 'auth')
LIMIT 20;
"""

response = httpx.post(url, headers=headers, json={"query": sql})
print(f"Status: {response.status_code}")
print(response.text[:3000])
