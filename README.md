# Steam Game Matchmaker 🎮

Find the perfect games to play with your Steam friends!

![Steam Game Matchmaker](https://img.shields.io/badge/Steam-Game%20Matchmaker-blue)

## Features

- **Add Friends** - By Steam username or Steam ID 64
- **Find Common Games** - Games everyone in the group owns
- **Almost Matched** - Games owned by N-1 friends (great for gift ideas!)
- **Shared Interests** - Analyze common gaming genres
- **AI Recommendations** - Get personalized game suggestions powered by Groq AI (llama-3.3-70b-versatile)

## Quick Start

1. Get a Steam API key from [Steam Developer](https://steamcommunity.com/dev/apikey)
2. Open `index.html` in your browser (or run with a local server)
3. Enter your API key
4. Add your friends' Steam usernames
5. Click "Find Common Games"

### Running with a Local Server

```bash
# Using Python
python -m http.server 8080

# Using Node.js (npx)
npx serve

# Using PHP
php -S localhost:8080
```

Then open `http://localhost:8080` in your browser.

## Requirements

- Steam Web API key (free from [Steam Developer](https://steamcommunity.com/dev/apikey))
- Groq API key (free from [Groq Console](https://console.groq.com))
- Friends must have **public Steam profiles** for the app to access their game libraries

## How It Works

1. **Username Resolution** - Converts Steam usernames to Steam ID 64
2. **Game Library Fetch** - Gets each friend's owned games via Steam API
3. **Matching Algorithm** - Finds intersection of all game libraries
4. **Genre Analysis** - Identifies shared gaming interests

## Tech Stack

### Frontend
- Vanilla JavaScript (ES6 Modules)
- CSS3 (Glassmorphism, Gradients, Animations)
- Steam Web API

### Backend
- FastAPI (Python)
- Pydantic AI with Groq (llama-3.3-70b-versatile)
- CORS Proxy for browser-based API calls

### Deployment
- Docker & Docker Compose
- Nginx (reverse proxy & static file serving)
- GitHub Actions CI/CD

## Project Structure

```
steam-game-matchmaking/
├── frontend/
│   ├── index.html          # Main HTML
│   ├── style.css           # Premium dark theme
│   └── js/
│       ├── main.js         # App controller
│       ├── steam-api.js    # Steam API service
│       ├── friends.js      # Friend list manager
│       └── matching.js     # Game matching logic
├── backend/
│   ├── main.py             # FastAPI server
│   ├── ai_service.py       # Groq AI integration
│   ├── models.py           # Pydantic models
│   └── pyproject.toml      # Python dependencies
├── .env                    # Environment variables
├── Dockerfile             # Container image definition
├── docker-compose.yml     # Service orchestration
├── nginx.conf             # Nginx configuration
└── .github/
    └── workflows/
        └── deploy.yml     # CI/CD pipeline
```

## Environment Variables

Create a `.env` file in the project root:

```bash
# Steam API Key - Get from: https://steamcommunity.com/dev/apikey
STEAM_API_KEY=your_steam_api_key_here

# Groq API Key - Get from: https://console.groq.com
GROQ_API_KEY=your_groq_api_key_here
```

## Deployment

### Local Development

**Frontend Only:**
```bash
# Using Python
cd frontend
python -m http.server 8080

# Using Node.js
npx serve frontend
```

**Full Stack with Docker:**
```bash
# Build and run
docker-compose up --build

# Access at http://localhost:8002
```

### Production (Azure VM)

The application automatically deploys to Azure VM via GitHub Actions when pushing to the `main` branch.

**Required GitHub Secrets:**
- `AZURE_VM_HOST`: Azure VM hostname or IP
- `AZURE_VM_USER`: SSH username
- `AZURE_VM_SSH_KEY`: Private SSH key
- `STEAM_API_KEY`: Steam Web API key
- `GROQ_API_KEY`: Groq API key

## Privacy Note

This app uses a public CORS proxy to make API requests from the browser. For production use, you should set up your own backend proxy to protect your API key.

## License

MIT
