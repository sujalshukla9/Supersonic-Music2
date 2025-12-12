# -------- BASE IMAGE --------
FROM node:18-bullseye

# -------- INSTALL PYTHON + PIP + FFMPEG + YT-DLP --------
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg && \
    pip3 install --upgrade yt-dlp && \
    rm -rf /var/lib/apt/lists/*

# -------- SET WORKDIR --------
WORKDIR /app

# -------- COPY PACKAGE FILES --------
COPY package*.json ./

# -------- INSTALL NODE DEPENDENCIES --------
RUN npm install

# -------- COPY ALL FILES --------
COPY . .

# -------- EXPOSE PORT --------
EXPOSE 3001

# -------- START COMMAND --------
CMD ["node", "server.js"]
