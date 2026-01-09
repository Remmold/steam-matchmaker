/**
 * Friends Manager
 * Handles the friend list state and UI
 */

class FriendsManager {
    constructor() {
        this.friends = new Map(); // steamId -> friend data
        this.selected = new Set(); // steamIds of selected friends
        this.onUpdate = null; // Callback when friends list changes
    }

    /**
     * Add a friend to the list
     * @param {Object} friendData - { steamId, name, avatar, gameCount, games }
     */
    addFriend(friendData) {
        if (this.friends.has(friendData.steamId)) {
            throw new Error('Friend already added');
        }
        this.friends.set(friendData.steamId, friendData);
        // Auto-select new friends
        this.selected.add(friendData.steamId);
        this.triggerUpdate();
    }

    /**
     * Remove a friend from the list
     * @param {string} steamId
     */
    removeFriend(steamId) {
        this.friends.delete(steamId);
        this.selected.delete(steamId);
        this.triggerUpdate();
    }

    /**
     * Toggle selection for a friend
     */
    toggleSelection(steamId) {
        if (this.selected.has(steamId)) {
            this.selected.delete(steamId);
        } else {
            this.selected.add(steamId);
        }
        this.triggerUpdate();
    }

    /**
     * Check if a friend is selected
     */
    isSelected(steamId) {
        return this.selected.has(steamId);
    }

    /**
     * Get all friends
     * @returns {Array} List of friend data
     */
    getAllFriends() {
        return Array.from(this.friends.values());
    }

    /**
     * Get only selected friends
     * @returns {Array} List of selected friend data
     */
    getSelectedFriends() {
        return this.getAllFriends().filter(f => this.selected.has(f.steamId));
    }

    /**
     * Get selected friend count
     */
    getSelectedCount() {
        return this.selected.size;
    }

    /**
     * Get friend count
     */
    getFriendCount() {
        return this.friends.size;
    }

    /**
     * Check if a friend exists
     */
    hasFriend(steamId) {
        return this.friends.has(steamId);
    }

    /**
     * Trigger update callback
     */
    triggerUpdate() {
        if (this.onUpdate) {
            this.onUpdate(this.getAllFriends());
        }
    }

    /**
     * Render friends list to the DOM
     * @param {HTMLElement} container
     */
    render(container) {
        const friends = this.getAllFriends();

        if (friends.length === 0) {
            container.innerHTML = '<p class="empty-state">No friends added yet. Add some Steam users above!</p>';
            return;
        }

        container.innerHTML = friends.map(friend => `
            <div class="friend-card ${this.isSelected(friend.steamId) ? 'selected' : ''}" data-steam-id="${friend.steamId}">
                <label class="friend-checkbox">
                    <input type="checkbox" ${this.isSelected(friend.steamId) ? 'checked' : ''} data-steam-id="${friend.steamId}">
                    <span class="checkbox-custom"></span>
                </label>
                <img 
                    src="${friend.avatar}" 
                    alt="${friend.name}" 
                    class="friend-avatar"
                    onerror="this.src='https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg'"
                >
                <div class="friend-info">
                    <div class="friend-name">${this.escapeHtml(friend.name)}</div>
                    <div class="friend-stats">${friend.gameCount} games in library</div>
                </div>
                <button class="friend-remove" title="Remove friend" data-steam-id="${friend.steamId}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        `).join('');

        // Attach checkbox event listeners
        container.querySelectorAll('.friend-checkbox input').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const steamId = e.target.dataset.steamId;
                this.toggleSelection(steamId);
                this.render(container);
            });
        });

        // Attach remove event listeners
        container.querySelectorAll('.friend-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const steamId = e.currentTarget.dataset.steamId;
                this.removeFriend(steamId);
                this.render(container);
            });
        });
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Save friends to localStorage
     */
    save() {
        const data = this.getAllFriends();
        const selectedIds = Array.from(this.selected);
        localStorage.setItem('steam-matchmaker-friends', JSON.stringify(data));
        localStorage.setItem('steam-matchmaker-selected', JSON.stringify(selectedIds));
    }

    /**
     * Load friends from localStorage
     */
    load() {
        try {
            const data = localStorage.getItem('steam-matchmaker-friends');
            if (data) {
                const friends = JSON.parse(data);
                friends.forEach(friend => {
                    this.friends.set(friend.steamId, friend);
                });
            }
            // Load selected state
            const selectedData = localStorage.getItem('steam-matchmaker-selected');
            if (selectedData) {
                const selectedIds = JSON.parse(selectedData);
                selectedIds.forEach(id => {
                    if (this.friends.has(id)) {
                        this.selected.add(id);
                    }
                });
            } else {
                // Default: select all friends
                this.friends.forEach((_, steamId) => this.selected.add(steamId));
            }
        } catch (e) {
            console.error('Failed to load friends:', e);
        }
    }
}

export default FriendsManager;
