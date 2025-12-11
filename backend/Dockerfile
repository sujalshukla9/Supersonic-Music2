# ---- Base Image ----
FROM node:18-bullseye

# ---- Install Python + Pip + FFmpeg ----
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg && \
    pip3 install yt-dlp

# ---- Create App Directory ----
WORKDIR /app

# ---- Copy Backend Files ----
COPY package.json package-lock.json ./
COPY . .

# ---- Install Node Dependencies ----
RUN npm install

# ---- Expose Port ----
EXPOSE 3001

# ---- Start Server ----
CMD ["node", "server.js"]
