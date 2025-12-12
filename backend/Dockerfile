# Use Ubuntu 22.04 (yt-dlp works perfectly)
FROM ubuntu:22.04

# Prevent timezone prompt
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    yt-dlp \
    curl \
    git \
    build-essential

# Install Node.js 18
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Set working directory
WORKDIR /app

# Copy package.json and install Node dependencies
COPY package*.json ./
RUN npm install

# Copy backend source
COPY . .

# Expose backend port
EXPOSE 3001

# Start backend
CMD ["node", "server.js"]
