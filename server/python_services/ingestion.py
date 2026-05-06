import sys
import json
import os
import yt_dlp
import uuid
import time
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

class FoodIntel(BaseModel):
    restaurant_name: str | None = Field(description="Name of the restaurant or food spot. Prioritize text overlays.")
    cuisine: str | None = Field(description="Type of cuisine or food served.")
    area_location: str | None = Field(description="Neighborhood, city, or specific area.")
    budget_rating: str | None = Field(description="Price level, e.g., $, $$, $$$")
    vibe_tags: str | None = Field(description="Vibe tags, e.g., 'Friday night ritual', 'hidden gem'")
    confidence_score: float = Field(description="Confidence score from 0.0 to 1.0")

def ingest_reel(url: str) -> dict:
    video_id = str(uuid.uuid4())
    filename = f"{video_id}.mp4"
    
    ydl_opts = {
        'format': 'best',
        'outtmpl': filename,
        'quiet': True,
        'noprogress': True,
        'cookiefile': 'cookies.txt' if os.path.exists('cookies.txt') else None,
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
        }
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=True)
            caption_text = info_dict.get('description') or info_dict.get('title') or ""
            return {
                "video_file": filename,
                "caption_text": caption_text
            }
    except Exception as e:
        print(json.dumps({"error": f"Failed to download media: {str(e)}"}))
        sys.exit(1)

def extract_food_intel(video_file: str, caption_text: str) -> dict:
    # Try to get from environment first
    api_key = os.environ.get("GEMINI_API_KEY")
    
    # Fallback: Read directly from .env file so we don't rely on Node.js restart
    if not api_key:
        try:
            env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
            if os.path.exists(env_path):
                with open(env_path, 'r') as f:
                    for line in f:
                        if line.startswith('GEMINI_API_KEY='):
                            api_key = line.strip().split('=', 1)[1]
                            break
        except Exception:
            pass

    if not api_key:
        print(json.dumps({"error": "GEMINI_API_KEY is not set"}))
        sys.exit(1)
        
    client = genai.Client(api_key=api_key)
    
    try:
        # Upload the video file
        uploaded_file = client.files.upload(file=video_file)
        
        # Wait for processing if necessary
        while uploaded_file.state.name == "PROCESSING":
            time.sleep(2)
            uploaded_file = client.files.get(name=uploaded_file.name)
            
        if uploaded_file.state.name == "FAILED":
            raise Exception("Video processing failed on Gemini servers.")
            
        prompt = f"""
        Watch the video carefully and read the following caption. 
        Extract the food intelligence data. 
        Prioritize identifying the restaurant name from text overlays in the video if it is missing from the caption.
        
        Caption:
        {caption_text}
        """
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[uploaded_file, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=FoodIntel,
                temperature=0.2,
            ),
        )
        
        # Delete file from Gemini servers
        client.files.delete(name=uploaded_file.name)
        
        return json.loads(response.text)
        
    except Exception as e:
        print(json.dumps({"error": f"Gemini extraction failed: {str(e)}"}))
        # Ensure cleanup even on error
        try:
            if 'uploaded_file' in locals() and uploaded_file:
                client.files.delete(name=uploaded_file.name)
        except:
            pass
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Please provide a URL"}))
        sys.exit(1)
        
    url = sys.argv[1]
    
    # 1. Ingest Reel
    ingest_data = ingest_reel(url)
    video_file = ingest_data["video_file"]
    caption_text = ingest_data["caption_text"]
    
    # 2. Extract Intel
    intel = extract_food_intel(video_file, caption_text)
    
    # 3. Clean up local file
    try:
        if os.path.exists(video_file):
            os.remove(video_file)
    except Exception as e:
        pass
        
    # 4. Output final JSON
    print(json.dumps(intel))
