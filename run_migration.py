import httpx
import json
import os

PAT = os.environ.get("SUPABASE_PAT")
PROJECT_REF = "wubznedcvolfmdhtcbgh"

# Read the SQL file
with open('backend/sql/migration_notifications.sql', 'r') as f:
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
