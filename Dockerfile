# Multi-stage build for Steam Game Matchmaker
FROM python:3.11-slim as backend-builder

# Set working directory
WORKDIR /app/backend

# Copy backend files
COPY backend/pyproject.toml ./
COPY backend/*.py ./

# Install dependencies using pip
RUN pip install --no-cache-dir fastapi uvicorn[standard] pydantic-ai python-dotenv groq


# Production stage
FROM python:3.11-slim

# Install nginx for serving frontend and reverse proxy
RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*

# Copy backend from builder
WORKDIR /app/backend
COPY --from=backend-builder /app/backend /app/backend

# Copy frontend files
COPY frontend /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Start script
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

CMD ["/docker-entrypoint.sh"]
