import logging
import requests
import random
from config import config

logger = logging.getLogger(__name__)

def call_gemini(
    messages: list[dict[str, str]],
    model: str = "gemini-flash-latest",
    temperature: float = 0.2,
    timeout: float = 60.0
) -> str:
    if not config.gemini_api_keys:
        raise ValueError("Gemini API keys are not configured.")

    api_key = random.choice(config.gemini_api_keys)

    # Convert OpenAI-style messages to Gemini format
    system_instruction = None
    contents = []

    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        
        if role == "system":
            if not system_instruction:
                system_instruction = {"parts": [{"text": content}]}
            else:
                system_instruction["parts"].append({"text": content})
        else:
            # Gemini roles are 'user' and 'model'
            gemini_role = "model" if role == "assistant" else "user"
            contents.append({
                "role": gemini_role,
                "parts": [{"text": content}]
            })

    payload = {
        "contents": contents,
        "generationConfig": {
            "temperature": temperature
        }
    }
    
    if system_instruction:
        payload["systemInstruction"] = system_instruction

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    try:
        response = requests.post(url, json=payload, timeout=timeout)
        response.raise_for_status()
        data = response.json()
        
        # Extract response text
        candidates = data.get("candidates", [])
        if not candidates:
            return ""
            
        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            return ""
            
        return parts[0].get("text", "")
    except requests.exceptions.RequestException as e:
        logger.error(f"Gemini API request failed: {e}")
        # Log response body if available for better debugging
        if hasattr(e, 'response') and e.response is not None:
            logger.error(f"Response body: {e.response.text}")
        raise

def call_gemini_vision(
    prompt: str,
    base64_image: str,
    mime_type: str = "image/jpeg",
    model: str = "gemini-flash-latest",
    temperature: float = 0.1,
    timeout: float = 60.0
) -> str:
    if not config.gemini_api_keys:
        raise ValueError("Gemini API keys are not configured.")

    api_key = random.choice(config.gemini_api_keys)

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": prompt},
                    {
                        "inlineData": {
                            "mimeType": mime_type,
                            "data": base64_image
                        }
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": temperature,
            "responseMimeType": "application/json"
        }
    }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    try:
        response = requests.post(url, json=payload, timeout=timeout)
        response.raise_for_status()
        data = response.json()
        
        candidates = data.get("candidates", [])
        if not candidates:
            return ""
            
        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            return ""
            
        return parts[0].get("text", "")
    except requests.exceptions.RequestException as e:
        logger.error(f"Gemini Vision API request failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            logger.error(f"Response body: {e.response.text}")
        raise

