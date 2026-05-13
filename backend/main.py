import os
import requests
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from google import genai

load_dotenv()
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
NEWSDATA_API_KEY = os.environ.get("NEWSDATA_API_KEY")


def _cors_allow_origins() -> list[str]:
    raw = os.environ.get("CORS_ORIGINS", "").strip()
    if not raw:
        return ["*"]
    return [o.strip() for o in raw.split(",") if o.strip()]


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_allow_origins(),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}

# Mapping internal names to NewsData.io categories
CATEGORIES = ["technology", "business", "science", "health", "entertainment"]

@app.get("/api/news")
def get_news(category: str = Query("technology")):
    # 1. Fetch from NewsData.io
    url = f"https://newsdata.io/api/1/latest?apikey={NEWSDATA_API_KEY}&language=en&category={category}"
    
    try:
        response = requests.get(url)
        data = response.json()
        
        if data.get("status") == "success":
            # 2. Limit to exactly 3 articles per category for the "Lite" experience
            results = data.get("results", [])[:3]
            articles = []
            
            for article in results:
                articles.append({
                    "title": article.get("title"),
                    "description": article.get("description"),
                    "link": article.get("link"),
                    "source": article.get("source_id"),
                    "image": article.get("image_url")
                })
            
            # 3. Optional: Have Gemini generate a 1-sentence "Daily Vibe" for this category
            summary = ""
            try:
                vibe_check = client.models.generate_content(
                    model="gemini-3-flash-preview",
                    contents=f"Summarize the general mood of these news titles in one short sentence: {[a['title'] for a in articles]}",
                )
                summary = (vibe_check.text or "").strip()
            except Exception:
                pass

            return {
                "category": category,
                "summary": summary or None,
                "articles": articles,
            }
        return {"error": "Failed to fetch news"}
    except Exception as e:
        return {"error": str(e)}