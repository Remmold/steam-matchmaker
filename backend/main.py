"""
Steam Game Matchmaker - Backend API
FastAPI server for AI-powered game recommendations
"""

import os
from dotenv import load_dotenv

# Load environment variables BEFORE importing ai_service
# (ai_service creates the agent at import time and needs GROQ_API_KEY)
load_dotenv(dotenv_path="../.env")
os.environ["GROQ_API_KEY"] = os.getenv("GROQ_API_KEY", "")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import RecommendationRequest, RecommendationResponse, GameRecommendation
from ai_service import get_game_recommendations

app = FastAPI(
    title="Steam Game Matchmaker API",
    description="AI-powered game recommendations for Steam friend groups",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ok", "message": "Steam Game Matchmaker API"}


@app.post("/api/recommendations", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    """
    Get AI-powered game recommendations based on group preferences.
    
    - **common_games**: List of game names the group already owns
    - **shared_genres**: List of genres the group enjoys  
    - **friend_names**: Names of friends in the group
    """
    try:
        recommendations = await get_game_recommendations(
            common_games=request.common_games,
            shared_genres=request.shared_genres,
            friend_names=request.friend_names
        )
        
        return RecommendationResponse(
            recommendations=recommendations,
            success=True
        )
    except Exception as e:
        print(f"Error getting recommendations: {e}")
        return RecommendationResponse(
            recommendations=[],
            success=False,
            error=str(e)
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
