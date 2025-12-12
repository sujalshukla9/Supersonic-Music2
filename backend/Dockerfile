FROM node:18

# Install Python + PIP
RUN apt-get update && \
    apt-get install -y python3 python3-pip && \
    pip3 install yt-dlp

# Set work directory
WORKDIR /app

# Copy backend files
COPY . .

# Install Node dependencies
RUN npm install

# Expose backend port
EXPOSE 3001

# Start server
CMD ["node", "server.js"]
