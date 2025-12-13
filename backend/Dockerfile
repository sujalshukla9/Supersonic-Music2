# Use Node.js 20 Alpine with Python support
FROM node:20-alpine

# Install Python and pip for music_api.py (uses yt-dlp and ytmusicapi)
RUN apk add --no-cache python3 py3-pip ffmpeg

# Create a virtual environment for Python dependencies
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
RUN pip install --no-cache-dir yt-dlp ytmusicapi

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies (production only)
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Expose port (Render will set PORT env variable)
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3001}/health || exit 1

# Start the server
CMD ["node", "server.js"]
