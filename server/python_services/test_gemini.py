import sys
import json
from google import genai

api_key = "AIzaSyBIAx5gHmymJHmMbAwhL3lpMwWlAFho2Kk"
try:
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents='Test message, reply with OK'
    )
    print("SUCCESS: ", response.text)
except Exception as e:
    print("ERROR: ", str(e))
