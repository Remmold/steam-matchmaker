"""
AI Service using Pydantic AI for game recommendations
"""

import os
from typing import List
from pydantic_ai import Agent
from pydantic_ai.models.groq import GroqModel
from models import GameRecommendation


# Create the Pydantic AI agent with structured output using Groq
recommendation_agent = Agent(
    model=GroqModel('llama-3.3-70b-versatile'),
    output_type=List[GameRecommendation],
    system_prompt="""You are a gaming expert who recommends multiplayer games.
    
Your task is to recommend exactly 5 multiplayer games that a group of friends should play together.
The games you recommend should:
1. Have strong multiplayer/co-op features
2. Match the group's genre preferences
3. Be highly rated and actively played
4. Offer good value for money
5. NOT be games they already own

For each game, provide accurate pricing (check current Steam prices), a concise overview,
and a personalized reason why this game would be perfect for this specific group.""",
)


async def get_game_recommendations(
    common_games: List[str],
    shared_genres: List[str],
    friend_names: List[str]
) -> List[GameRecommendation]:
    """
    Get AI-powered game recommendations based on the group's preferences.
    
    Args:
        common_games: List of game names the group already owns
        shared_genres: List of genres the group enjoys
        friend_names: Names of friends in the group
    
    Returns:
        List of GameRecommendation objects
    """
    # Build the prompt with context
    games_str = ', '.join(common_games[:10]) if common_games else 'various games'
    genres_str = ', '.join(shared_genres[:5]) if shared_genres else 'action, adventure, multiplayer'
    friends_str = ', '.join(friend_names)
    
    prompt = f"""A group of {len(friend_names)} friends ({friends_str}) are looking for NEW multiplayer games to play together.

Their favorite games they already own include: {games_str}
Their preferred genres are: {genres_str}

Recommend exactly 5 multiplayer games they DON'T already own that would be perfect for this group.
Make sure the games have active player bases and good multiplayer/co-op experiences."""

    # Run the agent and get structured output
    result = await recommendation_agent.run(prompt)
    
    return result.output
