import os
import requests
from config import config

api_key = config.groq_api_keys[0]
resp = requests.get(
    "https://api.groq.com/openai/v1/models",
    headers={"Authorization": f"Bearer {api_key}"}
)
print("Models:", [m['id'] for m in resp.json().get('data', [])])
