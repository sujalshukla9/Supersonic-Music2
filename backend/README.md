# Supersonic Music Backend

Audio streaming backend for the Supersonic Music app, using yt-dlp and ytmusicapi for reliable audio extraction.

## 🚀 Deployment to Ubuntu Server

### Quick Deploy

1. Upload your backend files to your Ubuntu server
2. Navigate to the backend directory
3. Run the deployment script:

```bash
sudo bash deploy-ubuntu.sh
```

### Manual Setup on Ubuntu

```bash
# 1. Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install Python3, pip, and FFmpeg
sudo apt-get install -y python3 python3-pip python3-venv ffmpeg

# 3. Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# 4. Install Python dependencies
pip3 install yt-dlp ytmusicapi

# 5. Install Node.js dependencies
npm install

# 6. Copy and edit environment file
cp .env.example .env
nano .env

# 7. Start the server
npm start
```

### Using Docker on Ubuntu

```bash
# Using Ubuntu-optimized Dockerfile
docker build -f Dockerfile.ubuntu -t supersonic-backend .
docker run -d -p 3001:3001 --name supersonic supersonic-backend

# Or using Alpine Dockerfile (smaller image)
docker build -t supersonic-backend .
docker run -d -p 3001:3001 --name supersonic supersonic-backend
```

### PM2 (Recommended for Production)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Activate Python venv first
source venv/bin/activate

# Start with PM2
pm2 start server.js --name supersonic-backend

# Save PM2 processes
pm2 save

# Set up PM2 startup script
pm2 startup
```

### Nginx Reverse Proxy (Optional)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🚀 Deployment to Railway (Alternative)

### Quick Deploy

1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. Go to [Railway Dashboard](https://railway.app/)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository and the `backend` folder
5. Railway will auto-detect the Dockerfile and build

---

## Environment Variables

Set these in your `.env` file or server environment:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PORT` | No | Server port | `3001` |
| `REGION` | No | Default region for content | `IN` |
| `NODE_ENV` | No | Set to `production` | `production` |
| `YT_KEY` | No | YouTube API Key (optional) | `AIza...` |
| `ALLOWED_ORIGINS` | No | CORS origins (comma-separated) | `https://your-app.com` |

---

## 📦 Local Development

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies (required for music_api.py)
pip3 install yt-dlp ytmusicapi

# Start the server
npm start

# Or with auto-reload
npm run dev
```

---

## 🔧 API Endpoints

### Streaming
- `GET /audio/:videoId` - Get audio URL
- `GET /stream/:videoId` - Proxy stream (better for CORS)

### Discovery
- `GET /search?q=query` - Search videos
- `GET /search/suggestions?q=query` - Autocomplete suggestions
- `GET /trending` - Trending music
- `GET /home` - Home feed
- `GET /explore` - Explore page

### Content
- `GET /video/:videoId` - Video details
- `GET /artist/:channelId` - Artist info
- `GET /autoplay/:videoId` - Smart autoplay queue
- `GET /related/:videoId` - Related videos

### User Data
- `GET /history` - Play history
- `POST /history` - Add to history
- `GET /favorites` - Liked songs
- `POST /favorites/toggle` - Like/unlike
- `GET /playlists` - User playlists

---

## ⚠️ Troubleshooting

### "python: command not found"
Ubuntu uses `python3` instead of `python`. The server has been updated to use `python3`.

### "yt_dlp module not found"
Make sure you've activated the virtual environment:
```bash
source venv/bin/activate
# or if using system-wide install:
pip3 install yt-dlp ytmusicapi
```

### Port already in use
```bash
# Find process using port 3001
sudo lsof -i :3001
# Kill the process
sudo kill -9 <PID>
```

### Permission denied errors
```bash
# Fix file permissions
sudo chown -R $USER:$USER /path/to/backend
chmod +x deploy-ubuntu.sh
```

---

## 🔒 Security

- Never commit `.env` files
- Use `.env.example` as a template
- Set `ALLOWED_ORIGINS` to your frontend domain in production
- Use a reverse proxy (Nginx) with SSL in production
- Run as non-root user

---

## ✨ Features

- **yt-dlp** - Reliable audio extraction with regular updates
- **ytmusicapi** - Direct YouTube Music API integration
- **Smart Autoplay** - Intelligent queue generation
- **Caching** - Audio URLs, metadata, and search results are cached
- **Health Check** - Built-in `/health` endpoint for monitoring
