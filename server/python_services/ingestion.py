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
    # For Instagram - special handling since it requires authentication
    if "instagram.com" in url:
        print("📸 Instagram detected - extracting URL context for Gemini...")
        return {
            "video_file": None,
            "caption_text": "",
            "title": "",
            "uploader": "",
            "instagram_url": url,
            "instagram_mode": True
        }
    
    # For other platforms (TikTok, YouTube), use yt-dlp
    video_id = str(uuid.uuid4())
    filename = f"{video_id}.mp4"
    
    # Try multiple download strategies for non-Instagram videos
    ydl_opts_strategies = [
        {
            # Strategy 1: With cookies (if user provided them)
            'format': 'best[ext=mp4]',
            'outtmpl': filename,
            'quiet': False,
            'noprogress': False,
            'cookiefile': 'cookies.txt' if os.path.exists('cookies.txt') else None,
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        },
        {
            # Strategy 2: Without cookies, but with spoofed mobile headers
            'format': 'best[ext=mp4]/best',
            'outtmpl': filename,
            'quiet': False,
            'noprogress': False,
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
            },
            'socket_timeout': 30
        }
    ]
    
    last_error = None
    for strategy_idx, ydl_opts in enumerate(ydl_opts_strategies):
        try:
            print(f"🎬 Attempting download strategy {strategy_idx + 1}...")
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info_dict = ydl.extract_info(url, download=True)
                caption_text = info_dict.get('description') or info_dict.get('title') or ""
                
                # Check if video file was actually downloaded
                if os.path.exists(filename):
                    print(f"✅ Successfully downloaded video (strategy {strategy_idx + 1})")
                    return {
                        "video_file": filename,
                        "caption_text": caption_text,
                        "title": info_dict.get('title', ''),
                        "uploader": info_dict.get('uploader', ''),
                        "instagram_mode": False
                    }
        except Exception as e:
            last_error = str(e)
            print(f"⚠️ Strategy {strategy_idx + 1} failed: {e}")
            continue
    
    # All strategies failed
    error_msg = f"Could not access video. Last error: {last_error}"
    print(json.dumps({"error": error_msg}))
    sys.exit(1)

def extract_food_intel(video_file: str, caption_text: str, title: str = "", uploader: str = "", instagram_url: str = "", instagram_mode: bool = False) -> dict:
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
        # SPECIAL CASE: Instagram URL without video access
        if instagram_mode and instagram_url:
            print("🧠 Analyzing Instagram reel with Gemini AI...")
            
            prompt = f"""
            Analyze this Instagram reel URL to extract restaurant details.
            URL: {instagram_url}
            
            Based on Instagram reel patterns and URL structure, extract restaurant information:
            - Restaurant name (look for mentions, hashtags, or common patterns)
            - Cuisine type (from context clues)
            - Location/area (Bangalore area preferred)
            - Price level (estimate from typical food content)
            - Vibe/atmosphere description
            
            If you cannot extract clear restaurant data, return confidence_score as 0.0 and restaurant_name as "Unknown".
            
            IMPORTANT: Only extract information if you can reasonably infer it. Return JSON with these exact fields:
            {{
                "restaurant_name": "...",
                "cuisine": "...",
                "area_location": "...",
                "budget_rating": "...",
                "vibe_tags": "...",
                "confidence_score": 0.0-1.0
            }}
            """
            
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=FoodIntel,
                    temperature=0.3,
                ),
            )
            
            result = json.loads(response.text)
            print(f"✅ Gemini extraction complete. Confidence: {result.get('confidence_score', 0)}")
            return result
        
        # VIDEO FILE ANALYSIS
        if video_file and os.path.exists(video_file):
            print("🎬 Sending video to Gemini for analysis...")
            # Upload the video file
            uploaded_file = client.files.upload(file=video_file)
            
            # Wait for processing if necessary
            while uploaded_file.state.name == "PROCESSING":
                time.sleep(2)
                uploaded_file = client.files.get(name=uploaded_file.name)
                
            if uploaded_file.state.name == "FAILED":
                raise Exception("Video processing failed on Gemini servers.")
                
            prompt = f"""
            Watch the video carefully and extract restaurant details.
            Extract all visible text, signage, menu items, and context clues.
            
            Caption/Description:
            {caption_text}
            
            Title: {title}
            Uploader: {uploader}
            
            Return structured JSON with restaurant details.
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
        else:
            # No video file - use Gemini on metadata only
            print("📝 Analyzing metadata with Gemini...")
            prompt = f"""
            Based on this video metadata, extract restaurant details:
            
            Title: {title}
            Description: {caption_text}
            Uploader: {uploader}
            
            Extract food intelligence. Return structured JSON.
            """
            
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=FoodIntel,
                    temperature=0.2,
                ),
            )
            
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
    
    # 1. Ingest Reel (handles Instagram specially)
    ingest_data = ingest_reel(url)
    video_file = ingest_data.get("video_file")
    caption_text = ingest_data.get("caption_text", "")
    title = ingest_data.get("title", "")
    uploader = ingest_data.get("uploader", "")
    instagram_url = ingest_data.get("instagram_url", "")
    instagram_mode = ingest_data.get("instagram_mode", False)
    
    # 2. Extract Intel using Gemini
    intel = extract_food_intel(video_file, caption_text, title, uploader, instagram_url, instagram_mode)
    
    # 3. Clean up local file if it exists
    try:
        if video_file and os.path.exists(video_file):
            os.remove(video_file)
    except Exception as e:
        pass
        
    # 4. Output final JSON
    print(json.dumps(intel))
