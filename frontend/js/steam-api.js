/**
 * Steam API Service
 * Handles all communication with the Steam Web API
 */

// CORS proxy for browser-based API calls
// Using a public CORS proxy - for production, use your own backend
const CORS_PROXY = 'https://corsproxy.io/?';

class SteamAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * Make an API request through CORS proxy
     */
    async fetchAPI(url) {
        const response = await fetch(CORS_PROXY + encodeURIComponent(url));
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        return response.json();
    }

    /**
     * Resolve a Steam vanity URL to a Steam ID 64
     * @param {string} vanityUrl - The custom URL name (e.g., "gabelogannewell")
     * @returns {Promise<string>} The 64-bit Steam ID
     */
    async resolveVanityURL(vanityUrl) {
        const url = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${this.apiKey}&vanityurl=${encodeURIComponent(vanityUrl)}`;
        const data = await this.fetchAPI(url);

        if (data.response.success === 1) {
            return data.response.steamid;
        } else if (data.response.success === 42) {
            throw new Error('User not found. Make sure you entered the correct Steam username.');
        } else {
            throw new Error('Failed to resolve vanity URL');
        }
    }

    /**
     * Check if a string is a valid Steam ID 64 (17 digits)
     */
    isSteamID64(input) {
        return /^\d{17}$/.test(input);
    }

    /**
     * Get the Steam ID from either a vanity URL or direct Steam ID
     */
    async getSteamID(input) {
        const cleanInput = input.trim();

        // Check if it's already a Steam ID 64
        if (this.isSteamID64(cleanInput)) {
            return cleanInput;
        }

        // Extract vanity URL from full profile URL
        let vanityUrl = cleanInput;
        const idMatch = cleanInput.match(/steamcommunity\.com\/id\/([^\/]+)/);
        if (idMatch) {
            vanityUrl = idMatch[1];
        }
        const profileMatch = cleanInput.match(/steamcommunity\.com\/profiles\/(\d{17})/);
        if (profileMatch) {
            return profileMatch[1];
        }

        // Resolve vanity URL
        return this.resolveVanityURL(vanityUrl);
    }

    /**
     * Get player summary (profile info)
     * @param {string} steamId - The 64-bit Steam ID
     */
    async getPlayerSummary(steamId) {
        const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${this.apiKey}&steamids=${steamId}`;
        const data = await this.fetchAPI(url);

        if (data.response.players && data.response.players.length > 0) {
            return data.response.players[0];
        }
        throw new Error('Player not found');
    }

    /**
     * Get owned games for a player
     * @param {string} steamId - The 64-bit Steam ID
     * @returns {Promise<Array>} List of owned games
     */
    async getOwnedGames(steamId) {
        const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${this.apiKey}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1&format=json`;
        const data = await this.fetchAPI(url);

        if (data.response && data.response.games) {
            return data.response.games;
        }

        // Check if profile is private
        if (!data.response || Object.keys(data.response).length === 0) {
            throw new Error('Cannot access game library. Profile may be private.');
        }

        return [];
    }

    /**
     * Get game details including genres
     * @param {number} appId - The Steam app ID
     */
    async getGameDetails(appId) {
        const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
        const data = await this.fetchAPI(url);

        if (data[appId] && data[appId].success) {
            return data[appId].data;
        }
        return null;
    }

    /**
     * Get details for multiple games (with rate limiting)
     * @param {Array<number>} appIds - List of app IDs
     * @param {Function} onProgress - Progress callback
     */
    async getMultipleGameDetails(appIds, onProgress = null) {
        const results = new Map();
        const batchSize = 5;
        const delay = 300; // ms between batches to avoid rate limiting

        for (let i = 0; i < appIds.length; i += batchSize) {
            const batch = appIds.slice(i, i + batchSize);
            const promises = batch.map(async (appId) => {
                try {
                    const details = await this.getGameDetails(appId);
                    return { appId, details };
                } catch {
                    return { appId, details: null };
                }
            });

            const batchResults = await Promise.all(promises);
            batchResults.forEach(({ appId, details }) => {
                if (details) {
                    results.set(appId, details);
                }
            });

            if (onProgress) {
                onProgress(Math.min(i + batchSize, appIds.length), appIds.length);
            }

            // Wait before next batch
            if (i + batchSize < appIds.length) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        return results;
    }

    /**
     * Validate API key by making a test request
     */
    async validateKey() {
        try {
            // Try to get player summary for a known Steam ID (Gabe Newell)
            const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${this.apiKey}&steamids=76561197960287930`;
            const data = await this.fetchAPI(url);
            return data.response && data.response.players;
        } catch {
            return false;
        }
    }
}

export default SteamAPI;
