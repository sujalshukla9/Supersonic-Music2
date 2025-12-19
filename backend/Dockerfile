# =============================================================
# Supersonic Music Backend - Dockerfile for Railway
# =============================================================

FROM node:20-slim

# Set environment variables
ENV NODE_ENV=production \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create Python virtual environment
RUN python3 -m venv /opt/venv

# Install Python packages
RUN pip3 install --no-cache-dir --upgrade pip \
    && pip3 install --no-cache-dir yt-dlp ytmusicapi

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy application files
COPY server.js .
COPY music_api.py .
COPY get_audio.py .

# Expose port (Railway will override this)
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3001}/health || exit 1

# Start command
CMD ["node", "server.js"]
