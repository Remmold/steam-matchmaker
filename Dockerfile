# Production build for Steam Game Matchmaker
FROM python:3.11-slim

# Install nginx for serving frontend and reverse proxy
RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app/backend

# Copy backend files
COPY backend/pyproject.toml ./
COPY backend/*.py ./

# Install Python dependencies
RUN pip install --no-cache-dir fastapi uvicorn[standard] pydantic-ai python-dotenv groq

# Copy frontend files
COPY frontend /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy and setup entrypoint script
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

# Expose port
EXPOSE 80

CMD ["/docker-entrypoint.sh"]
