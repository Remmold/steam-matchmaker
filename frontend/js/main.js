/**
 * Steam Game Matchmaker
 * Main application entry point
 */

import SteamAPI from './steam-api.js';
import FriendsManager from './friends.js';
import GameMatcher from './matching.js';
import CONFIG from './config.js';

// Backend API URL for AI recommendations
const BACKEND_URL = 'http://localhost:8000';

class App {
    constructor() {
        this.steamAPI = null;
        this.friendsManager = new FriendsManager();

        // Store latest matching results for AI
        this.lastCommonGames = [];
        this.lastSharedGenres = [];

        // DOM Elements
        this.elements = {
            apiSetup: document.getElementById('apiSetup'),
            apiKeyInput: document.getElementById('apiKeyInput'),
            saveApiKeyBtn: document.getElementById('saveApiKey'),
            apiStatus: document.getElementById('apiStatus'),
            mainContent: document.getElementById('mainContent'),
            friendInput: document.getElementById('friendInput'),
            searchFriendBtn: document.getElementById('searchFriendBtn'),
            addFriendError: document.getElementById('addFriendError'),
            // Search preview elements
            searchPreview: document.getElementById('searchPreview'),
            previewAvatar: document.getElementById('previewAvatar'),
            previewName: document.getElementById('previewName'),
            previewStats: document.getElementById('previewStats'),
            addPreviewBtn: document.getElementById('addPreviewBtn'),
            cancelPreviewBtn: document.getElementById('cancelPreviewBtn'),
            // Other elements
            friendsList: document.getElementById('friendsList'),
            matchSection: document.getElementById('matchSection'),
            findMatchesBtn: document.getElementById('findMatchesBtn'),
            resultsSection: document.getElementById('resultsSection'),
            commonGamesGrid: document.getElementById('commonGamesGrid'),
            almostMatchedSection: document.getElementById('almostMatchedSection'),
            almostMatchedGrid: document.getElementById('almostMatchedGrid'),
            sharedGenres: document.getElementById('sharedGenres'),
            // AI Recommendations
            getAiRecsBtn: document.getElementById('getAiRecsBtn'),
            aiRecommendations: document.getElementById('aiRecommendations'),
            // Loading
            loadingOverlay: document.getElementById('loadingOverlay'),
            loadingText: document.getElementById('loadingText')
        };

        // Store pending friend data from search
        this.pendingFriend = null;

        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        // Check for API key in config file first (bypasses frontend input)
        if (CONFIG.STEAM_API_KEY && CONFIG.STEAM_API_KEY.length > 0) {
            this.setApiKey(CONFIG.STEAM_API_KEY);
            // Hide the API setup section entirely
            this.elements.apiSetup.style.display = 'none';
            console.log('API key loaded from config.js');
        } else {
            // Fall back to localStorage
            const savedKey = localStorage.getItem('steam-api-key');
            if (savedKey) {
                this.setApiKey(savedKey);
                this.elements.apiKeyInput.value = '••••••••••••••••';
                this.showApiSuccess('API key loaded from storage');
            }
        }

        // Load saved friends
        this.friendsManager.load();
        this.friendsManager.onUpdate = () => {
            this.friendsManager.save();
            this.updateUI();
        };

        // Bind events
        this.bindEvents();

        // Initial render
        this.updateUI();
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // API Key
        this.elements.saveApiKeyBtn.addEventListener('click', () => this.handleSaveApiKey());
        this.elements.apiKeyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSaveApiKey();
        });

        // Search Friend
        this.elements.searchFriendBtn.addEventListener('click', () => this.handleSearchFriend());
        this.elements.friendInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearchFriend();
        });

        // Add/Cancel Preview
        this.elements.addPreviewBtn.addEventListener('click', () => this.handleConfirmAdd());
        this.elements.cancelPreviewBtn.addEventListener('click', () => this.handleCancelPreview());

        // Find Matches
        this.elements.findMatchesBtn.addEventListener('click', () => this.handleFindMatches());

        // AI Recommendations
        if (this.elements.getAiRecsBtn) {
            this.elements.getAiRecsBtn.addEventListener('click', () => this.handleGetAIRecommendations());
        }
    }

    /**
     * Set the API key and initialize the API
     */
    setApiKey(key) {
        this.steamAPI = new SteamAPI(key);
        this.elements.mainContent.style.display = 'block';
    }

    /**
     * Handle saving the API key
     */
    async handleSaveApiKey() {
        const key = this.elements.apiKeyInput.value.trim();

        if (!key || key === '••••••••••••••••') {
            this.showApiError('Please enter a valid API key');
            return;
        }

        this.showLoading('Validating API key...');

        try {
            const tempAPI = new SteamAPI(key);
            const isValid = await tempAPI.validateKey();

            if (isValid) {
                localStorage.setItem('steam-api-key', key);
                this.setApiKey(key);
                this.elements.apiKeyInput.value = '••••••••••••••••';
                this.showApiSuccess('API key saved successfully!');
            } else {
                this.showApiError('Invalid API key. Please check and try again.');
            }
        } catch (error) {
            this.showApiError('Failed to validate API key: ' + error.message);
        }

        this.hideLoading();
    }

    /**
     * Handle searching for a friend (shows preview)
     */
    async handleSearchFriend() {
        const input = this.elements.friendInput.value.trim();

        if (!input) {
            this.showFriendError('Please enter a Steam username or ID');
            return;
        }

        if (!this.steamAPI) {
            this.showFriendError('Please set your API key first');
            return;
        }

        this.setSearchLoading(true);
        this.showFriendError('');
        this.hidePreview();

        try {
            // Resolve Steam ID
            const steamId = await this.steamAPI.getSteamID(input);

            // Check if already added
            if (this.friendsManager.hasFriend(steamId)) {
                throw new Error('This friend is already in your list');
            }

            // Get player info
            const player = await this.steamAPI.getPlayerSummary(steamId);

            // Get owned games
            const games = await this.steamAPI.getOwnedGames(steamId);

            // Store pending friend data
            this.pendingFriend = {
                steamId,
                name: player.personaname,
                avatar: player.avatarmedium,
                gameCount: games.length,
                games
            };

            // Show preview
            this.showPreview(this.pendingFriend);

        } catch (error) {
            this.showFriendError(error.message);
        }

        this.setSearchLoading(false);
    }

    /**
     * Show the search preview card
     */
    showPreview(friend) {
        this.elements.previewAvatar.src = friend.avatar;
        this.elements.previewAvatar.alt = friend.name;
        this.elements.previewName.textContent = friend.name;
        this.elements.previewStats.textContent = `${friend.gameCount} games in library`;
        this.elements.searchPreview.style.display = 'block';
    }

    /**
     * Hide the search preview card
     */
    hidePreview() {
        this.elements.searchPreview.style.display = 'none';
        this.pendingFriend = null;
    }

    /**
     * Handle confirming the add (from preview)
     */
    handleConfirmAdd() {
        if (this.pendingFriend) {
            this.friendsManager.addFriend(this.pendingFriend);
            this.elements.friendInput.value = '';
            this.hidePreview();
            this.updateUI();
        }
    }

    /**
     * Handle canceling the preview
     */
    handleCancelPreview() {
        this.hidePreview();
    }

    /**
     * Handle finding common games
     */
    async handleFindMatches() {
        const friends = this.friendsManager.getSelectedFriends();

        if (friends.length < 2) {
            alert('Select at least 2 friends to find common games');
            return;
        }

        this.showLoading('Finding common games...');

        try {
            // Find common games
            const commonGames = GameMatcher.findCommonGames(friends);

            // Find almost matched games
            const almostMatched = GameMatcher.findAlmostMatchedGames(friends);

            // Analyze genres (basic, without API calls for speed)
            const sharedGenres = GameMatcher.analyzeSharedGenres(friends);

            // Store for AI recommendations
            this.lastCommonGames = commonGames;
            this.lastSharedGenres = sharedGenres;

            // Render results
            this.renderResults(commonGames, almostMatched, sharedGenres);

            // Reset AI recommendations
            if (this.elements.aiRecommendations) {
                this.elements.aiRecommendations.innerHTML = '<p class="empty-state">Click the button above to get AI-powered game suggestions!</p>';
            }

            // Show results section
            this.elements.resultsSection.style.display = 'grid';

            // Scroll to results
            this.elements.resultsSection.scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            console.error('Error finding matches:', error);
            alert('Error finding matches: ' + error.message);
        }

        this.hideLoading();
    }

    /**
     * Handle getting AI recommendations
     */
    async handleGetAIRecommendations() {
        const friends = this.friendsManager.getSelectedFriends();
        if (friends.length < 2) {
            alert('Please find common games first before getting AI recommendations');
            return;
        }

        // Set button loading state
        const btn = this.elements.getAiRecsBtn;
        const btnText = btn.querySelector('.btn-text');
        const btnLoader = btn.querySelector('.btn-loader');
        btn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-block';

        try {
            const friendNames = friends.map(f => f.name);
            const commonGameNames = this.lastCommonGames.slice(0, 10).map(g => g.name);
            const genreNames = this.lastSharedGenres.slice(0, 5).map(g => g.genre);

            // Call backend API
            const response = await fetch(`${BACKEND_URL}/api/recommendations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    common_games: commonGameNames,
                    shared_genres: genreNames,
                    friend_names: friendNames
                })
            });

            if (!response.ok) {
                throw new Error(`Backend error: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Unknown error');
            }

            // Transform snake_case to camelCase for frontend
            const recommendations = data.recommendations.map(rec => ({
                name: rec.name,
                price: rec.price,
                overview: rec.overview,
                reason: rec.reason,
                playerCount: rec.player_count,
                tags: rec.tags
            }));

            this.renderAIRecommendations(recommendations);
        } catch (error) {
            console.error('AI recommendation error:', error);
            this.elements.aiRecommendations.innerHTML = `
                <div class="ai-error">
                    <p>Failed to get AI recommendations: ${error.message}</p>
                    <p>Make sure the backend is running: cd backend && python main.py</p>
                </div>
            `;
        }

        // Reset button state
        btn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }

    /**
     * Render AI recommendations as collapsible cards
     */
    renderAIRecommendations(recommendations) {
        if (!recommendations || recommendations.length === 0) {
            this.elements.aiRecommendations.innerHTML = '<p class="empty-state">No recommendations found. Try again!</p>';
            return;
        }

        this.elements.aiRecommendations.innerHTML = recommendations.map((rec, index) => `
            <div class="rec-card" data-index="${index}">
                <div class="rec-header">
                    <div class="rec-toggle">▶</div>
                    <div class="rec-title">${this.escapeHtml(rec.name)}</div>
                    <span class="rec-price">${this.escapeHtml(rec.price)}</span>
                    <span class="rec-players">${this.escapeHtml(rec.playerCount || '')}</span>
                </div>
                <div class="rec-body">
                    <p class="rec-overview">${this.escapeHtml(rec.overview)}</p>
                    <div class="rec-reason">
                        <div class="rec-reason-label">Why This Game?</div>
                        <div class="rec-reason-text">${this.escapeHtml(rec.reason)}</div>
                    </div>
                    <div class="rec-tags">
                        ${(rec.tags || []).map(tag => `<span class="rec-tag">${this.escapeHtml(tag)}</span>`).join('')}
                    </div>
                </div>
            </div>
        `).join('');

        // Add click handlers for collapsible cards
        this.elements.aiRecommendations.querySelectorAll('.rec-header').forEach(header => {
            header.addEventListener('click', () => {
                const card = header.closest('.rec-card');
                card.classList.toggle('open');
            });
        });

        // Auto-expand first card
        const firstCard = this.elements.aiRecommendations.querySelector('.rec-card');
        if (firstCard) {
            firstCard.classList.add('open');
        }
    }

    /**
     * Render the results
     */
    renderResults(commonGames, almostMatched, sharedGenres) {
        // Common Games
        if (commonGames.length > 0) {
            this.elements.commonGamesGrid.innerHTML = commonGames
                .slice(0, 50) // Limit to 50 games
                .map(game => this.renderGameCard(game))
                .join('');
        } else {
            this.elements.commonGamesGrid.innerHTML = '<p class="empty-state">No games that everyone owns. Maybe check out the "Almost There" section below!</p>';
        }

        // Almost Matched Games
        if (almostMatched.length > 0) {
            this.elements.almostMatchedSection.style.display = 'block';
            this.elements.almostMatchedGrid.innerHTML = almostMatched
                .slice(0, 20) // Limit to 20 games
                .map(game => this.renderGameCard(game, true))
                .join('');
        } else {
            this.elements.almostMatchedSection.style.display = 'none';
        }

        // Shared Genres
        if (sharedGenres.length > 0) {
            this.elements.sharedGenres.innerHTML = sharedGenres
                .slice(0, 15)
                .map(genre => `
                    <div class="genre-tag">
                        ${this.escapeHtml(genre.genre)}
                        <span class="genre-count">${genre.count}</span>
                    </div>
                `).join('');
        } else {
            this.elements.sharedGenres.innerHTML = '<p class="empty-state">No shared genres identified</p>';
        }
    }

    /**
     * Render a game card
     */
    renderGameCard(game, showOwnership = false) {
        const imageUrl = GameMatcher.getGameImageUrl(game.appid);
        const playtime = GameMatcher.formatPlaytime(game.averagePlaytime || game.playtime_forever);

        // Simple dark placeholder as data URI to prevent flashing
        const placeholderBg = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="460" height="215" viewBox="0 0 460 215"%3E%3Crect fill="%23121824" width="460" height="215"/%3E%3Ctext x="50%25" y="50%25" fill="%2364748b" font-family="sans-serif" font-size="14" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';

        let ownershipHtml = '';
        if (showOwnership && game.missingOwners) {
            ownershipHtml = `
                <div class="game-owners">
                    ${game.missingOwners.map(name =>
                `<span class="owner-badge missing-badge">Missing: ${this.escapeHtml(name)}</span>`
            ).join('')}
                </div>
            `;
        }

        return `
            <div class="game-card">
                <img 
                    src="${imageUrl}" 
                    alt="${this.escapeHtml(game.name)}" 
                    class="game-image"
                    loading="lazy"
                    onerror="this.onerror=null; this.src='${placeholderBg}';"
                >
                <div class="game-info">
                    <div class="game-name" title="${this.escapeHtml(game.name)}">${this.escapeHtml(game.name)}</div>
                    <div class="game-playtime">${playtime}</div>
                    ${ownershipHtml}
                </div>
            </div>
        `;
    }

    /**
     * Update the UI based on current state
     */
    updateUI() {
        // Render friends list
        this.friendsManager.render(this.elements.friendsList);

        // Show/hide match button based on selected friends
        const selectedCount = this.friendsManager.getSelectedCount();
        this.elements.matchSection.style.display = selectedCount >= 2 ? 'block' : 'none';

        // Hide results when friends change
        this.elements.resultsSection.style.display = 'none';
    }

    /**
     * Show loading overlay
     */
    showLoading(text = 'Loading...') {
        this.elements.loadingText.textContent = text;
        this.elements.loadingOverlay.style.display = 'flex';
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        this.elements.loadingOverlay.style.display = 'none';
    }

    /**
     * Show API key error
     */
    showApiError(message) {
        this.elements.apiStatus.textContent = message;
        this.elements.apiStatus.classList.add('error');
    }

    /**
     * Show API key success
     */
    showApiSuccess(message) {
        this.elements.apiStatus.textContent = message;
        this.elements.apiStatus.classList.remove('error');
    }

    /**
     * Show friend add error
     */
    showFriendError(message) {
        this.elements.addFriendError.textContent = message;
    }

    /**
     * Set search button loading state
     */
    setSearchLoading(loading) {
        const btn = this.elements.searchFriendBtn;
        const text = btn.querySelector('.btn-text');
        const loader = btn.querySelector('.btn-loader');

        btn.disabled = loading;
        text.style.display = loading ? 'none' : 'inline';
        loader.style.display = loading ? 'inline-block' : 'none';
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
