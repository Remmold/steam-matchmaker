"""
Pydantic models for the AI recommendation API
"""

from pydantic import BaseModel, Field
from typing import List, Optional


class GameRecommendation(BaseModel):
    """A single game recommendation from the AI"""
    name: str = Field(description="The name of the game")
    price: str = Field(description="Approximate USD price or 'Free to Play'")
    overview: str = Field(description="2-3 sentence description of the game")
    reason: str = Field(description="Why this game is perfect for this specific group")
    player_count: str = Field(description="e.g. '2-4 players', 'up to 8 players'")
    tags: List[str] = Field(description="Game category tags like 'Co-op', 'FPS', 'Survival'")


class RecommendationRequest(BaseModel):
    """Request body for getting AI recommendations"""
    common_games: List[str] = Field(description="List of game names the group already owns")
    shared_genres: List[str] = Field(description="List of genres the group enjoys")
    friend_names: List[str] = Field(description="Names of friends in the group")


class RecommendationResponse(BaseModel):
    """Response containing AI game recommendations"""
    recommendations: List[GameRecommendation]
    success: bool = True
    error: Optional[str] = None
