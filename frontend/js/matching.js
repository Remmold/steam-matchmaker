/**
 * Game Matching Logic
 * Finds common games and shared interests among friends
 */

class GameMatcher {
    /**
     * Find games that are common to all friends
     * @param {Array} friends - List of friend data with games
     * @returns {Array} Games owned by everyone
     */
    static findCommonGames(friends) {
        if (friends.length === 0) return [];
        if (friends.length === 1) return friends[0].games || [];

        // Get the game IDs for each friend
        const gameSetsByFriend = friends.map(friend =>
            new Set((friend.games || []).map(g => g.appid))
        );

        // Find intersection of all sets
        const commonAppIds = [...gameSetsByFriend[0]].filter(appId =>
            gameSetsByFriend.every(set => set.has(appId))
        );

        // Get full game info from first friend's list
        const gameMap = new Map(friends[0].games.map(g => [g.appid, g]));

        // Calculate total playtime across all friends for each common game
        const commonGames = commonAppIds.map(appId => {
            const game = gameMap.get(appId);
            const totalPlaytime = friends.reduce((sum, friend) => {
                const friendGame = friend.games.find(g => g.appid === appId);
                return sum + (friendGame ? friendGame.playtime_forever : 0);
            }, 0);

            return {
                ...game,
                totalPlaytime,
                averagePlaytime: Math.round(totalPlaytime / friends.length),
                ownerCount: friends.length
            };
        });

        // Sort by total playtime (most played first)
        return commonGames.sort((a, b) => b.totalPlaytime - a.totalPlaytime);
    }

    /**
     * Find games that are owned by almost everyone (N-1)
     * @param {Array} friends - List of friend data with games
     * @returns {Array} Games with ownership info
     */
    static findAlmostMatchedGames(friends) {
        if (friends.length < 3) return []; // Only makes sense with 3+ friends

        // Count how many friends own each game
        const gameOwnership = new Map(); // appId -> { game, owners: [names], missingOwners: [names] }

        friends.forEach(friend => {
            (friend.games || []).forEach(game => {
                if (!gameOwnership.has(game.appid)) {
                    gameOwnership.set(game.appid, {
                        game,
                        owners: [],
                        missingOwners: []
                    });
                }
                gameOwnership.get(game.appid).owners.push(friend.name);
            });
        });

        // Find who's missing each game
        gameOwnership.forEach((data, appId) => {
            friends.forEach(friend => {
                if (!data.owners.includes(friend.name)) {
                    data.missingOwners.push(friend.name);
                }
            });
        });

        // Filter to games owned by N-1 friends (exactly 1 person missing)
        const almostMatched = [];
        gameOwnership.forEach((data, appId) => {
            if (data.owners.length === friends.length - 1) {
                almostMatched.push({
                    ...data.game,
                    owners: data.owners,
                    missingOwners: data.missingOwners,
                    ownerCount: data.owners.length
                });
            }
        });

        // Sort by playtime
        return almostMatched.sort((a, b) =>
            (b.playtime_forever || 0) - (a.playtime_forever || 0)
        );
    }

    /**
     * Analyze shared genres across all friends
     * @param {Array} friends - List of friend data with games
     * @param {Map} gameDetails - Map of appId -> game details with genres
     * @returns {Array} Sorted list of genres with counts
     */
    static analyzeSharedGenres(friends, gameDetails = null) {
        const genreCounts = new Map(); // genre -> { count, friendsWithGenre: Set }

        friends.forEach(friend => {
            const friendGenres = new Set();

            (friend.games || []).forEach(game => {
                // If we have detailed genre info, use it
                if (gameDetails && gameDetails.has(game.appid)) {
                    const details = gameDetails.get(game.appid);
                    (details.genres || []).forEach(genre => {
                        friendGenres.add(genre.description);
                    });
                }

                // Also use basic genre tags from game name (heuristic)
                const gameName = (game.name || '').toLowerCase();
                const basicGenres = this.inferGenresFromName(gameName);
                basicGenres.forEach(g => friendGenres.add(g));
            });

            // Count genres per friend
            friendGenres.forEach(genre => {
                if (!genreCounts.has(genre)) {
                    genreCounts.set(genre, { count: 0, friends: new Set() });
                }
                const data = genreCounts.get(genre);
                data.count++;
                data.friends.add(friend.name);
            });
        });

        // Filter to genres all friends share and sort by count
        const sharedGenres = [];
        genreCounts.forEach((data, genre) => {
            if (data.friends.size === friends.length) {
                sharedGenres.push({
                    genre,
                    count: data.count,
                    friends: Array.from(data.friends)
                });
            }
        });

        return sharedGenres.sort((a, b) => b.count - a.count);
    }

    /**
     * Infer basic genres from game name (fallback when no API data)
     */
    static inferGenresFromName(name) {
        const genres = [];
        const keywords = {
            'Action': ['action', 'shooter', 'fps', 'combat', 'fight', 'battle', 'war'],
            'Adventure': ['adventure', 'explore', 'quest'],
            'RPG': ['rpg', 'role-playing', 'fantasy', 'dragon', 'sword'],
            'Strategy': ['strategy', 'tactics', 'rts', 'civilization', 'command'],
            'Simulation': ['simulator', 'simulation', 'tycoon', 'manager'],
            'Sports': ['sports', 'football', 'soccer', 'basketball', 'racing', 'nba', 'fifa'],
            'Puzzle': ['puzzle', 'tetris', 'match'],
            'Horror': ['horror', 'scary', 'zombie', 'dead', 'evil'],
            'Multiplayer': ['multiplayer', 'online', 'coop', 'co-op', 'versus'],
            'Indie': ['indie']
        };

        Object.entries(keywords).forEach(([genre, words]) => {
            if (words.some(word => name.includes(word))) {
                genres.push(genre);
            }
        });

        return genres;
    }

    /**
     * Get Steam game header image URL
     */
    static getGameImageUrl(appId) {
        return `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/header.jpg`;
    }

    /**
     * Format playtime in hours
     */
    static formatPlaytime(minutes) {
        if (!minutes) return 'Never played';
        const hours = Math.round(minutes / 60);
        if (hours < 1) return 'Less than 1 hour';
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
}

export default GameMatcher;
