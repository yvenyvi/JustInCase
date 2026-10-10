import os
from pathlib import Path

import httpx

PAT = os.environ.get("SUPABASE_PAT")
PROJECT_REF = "wubznedcvolfmdhtcbgh"

# Read the SQL file
sql_path = Path(__file__).resolve().parents[1] / 'backend' / 'sql' / 'migration_notifications.sql'
with sql_path.open('r', encoding='utf-8') as f:
    sql_query = f.read()

# Make the request to Supabase Management API
url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/query"
headers = {
    "Authorization": f"Bearer {PAT}",
    "Content-Type": "application/json"
}

response = httpx.post(url, headers=headers, json={"query": sql_query})

if response.status_code in [200, 201]:
    print("Migration successful!")
    print(response.json())
else:
    print(f"Failed with status {response.status_code}")
    print(response.text)
