#!/bin/bash
set -e

echo "Starting Steam Game Matchmaker..."

# Start nginx in the background
nginx

# Start FastAPI backend
cd /app/backend
exec python -m uvicorn main:app --host 127.0.0.1 --port 8001
