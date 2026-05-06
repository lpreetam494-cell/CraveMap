import requests
import json

url = "https://www.instagram.com/reel/DS7sfwhjj7i/?igsh=OWFvYnF5ejdrd2pk"

headers = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

payload = {
    "url": url
}

try:
    response = requests.post("https://api.cobalt.tools/api/json", json=payload, headers=headers)
    print("Status:", response.status_code)
    print("Response:", json.dumps(response.json(), indent=2))
except Exception as e:
    print("Error:", str(e))
