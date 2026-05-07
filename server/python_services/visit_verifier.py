"""
Phase 8 - Component 1: Vision-Based Visit Verification
Uses Gemini Flash to identify a restaurant from a user-submitted photo.
Accepts: image file path via stdin JSON
Returns: { identified_name, confidence, cues, success }
"""
import sys
import json
import os
from pathlib import Path
from google import genai
from google.genai import types

def load_api_key() -> str:
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        env_path = Path(__file__).parent.parent / ".env"
        if env_path.exists():
            with open(env_path, "r") as f:
                for line in f:
                    if line.startswith("GEMINI_API_KEY="):
                        key = line.strip().split("=", 1)[1]
                        break
    return key

def verify_visit(image_path: str) -> dict:
    api_key = load_api_key()
    if not api_key:
        return {"success": False, "error": "Gemini API key not configured"}

    if not os.path.exists(image_path):
        return {"success": False, "error": f"Image not found: {image_path}"}

    try:
        client = genai.Client(api_key=api_key)

        # Upload image to Gemini Files API
        with open(image_path, "rb") as f:
            image_bytes = f.read()

        image_part = types.Part.from_bytes(
            data=image_bytes,
            mime_type="image/jpeg"
        )

        prompt = """You are a restaurant identification expert. Analyze this image carefully.

Look for evidence of a specific restaurant or food establishment:
- Signage or logo visible anywhere
- Menu boards or printed menus
- Food that is characteristic of a specific well-known restaurant
- Restaurant decor or branded items
- Location identifiers

Return ONLY valid JSON in this exact format:
{
  "identified": true/false,
  "restaurant_name": "Name of restaurant or null if unidentifiable",
  "confidence": 0.0 to 1.0,
  "cues": "Brief description of what visual evidence you used",
  "cuisine_visible": "Type of cuisine visible in image or null"
}

Be conservative with confidence — only report high confidence (>0.7) if you can clearly see identifiable branding or text."""

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[image_part, prompt]
        )

        text = response.text.strip()
        # Strip markdown code fences if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()

        result = json.loads(text)
        return {
            "success": True,
            "identified": result.get("identified", False),
            "restaurant_name": result.get("restaurant_name"),
            "confidence": float(result.get("confidence", 0.0)),
            "cues": result.get("cues", ""),
            "cuisine_visible": result.get("cuisine_visible")
        }

    except Exception as e:
        error_msg = str(e)
        # Known Gemini availability issue
        if "503" in error_msg or "UNAVAILABLE" in error_msg:
            return {"success": False, "error": "GEMINI_503", "message": "Gemini is temporarily unavailable"}
        return {"success": False, "error": error_msg}

if __name__ == "__main__":
    try:
        input_data = sys.stdin.read().strip()
        if not input_data:
            print(json.dumps({"success": False, "error": "No input provided"}))
            sys.exit(1)

        payload = json.loads(input_data)
        image_path = payload.get("image_path")

        if not image_path:
            print(json.dumps({"success": False, "error": "image_path required"}))
            sys.exit(1)

        result = verify_visit(image_path)
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)
