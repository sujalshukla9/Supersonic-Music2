# Use Node.js 20 Alpine as base image
FROM node:20-alpine

# Install Python, pip, and other dependencies required for yt-dlp
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    curl \
    && ln -sf python3 /usr/bin/python

# Install yt-dlp via pip
RUN pip3 install --no-cache-dir --break-system-packages yt-dlp

# Verify yt-dlp installation
RUN python -m yt_dlp --version

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create a directory for the database file
RUN mkdir -p /app/data

# Expose port (Render will set PORT env variable)
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3001}/health || exit 1

# Start the server
CMD ["node", "server.js"]
