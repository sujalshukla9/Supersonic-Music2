# Supersonic Music Backend

Audio streaming backend for the Supersonic Music app, using yt-dlp and ytmusicapi for reliable audio extraction.

## 🚀 Deployment to Railway (Recommended)

### Quick Deploy

1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. Go to [Railway Dashboard](https://railway.app/)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository and the `backend` folder
5. Railway will auto-detect the Dockerfile and build

### Environment Variables

Set these in Railway Dashboard → Your Service → Variables:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PORT` | No | Server port (Railway sets this automatically) | `3001` |
| `REGION` | No | Default region for content | `IN` |
| `NODE_ENV` | No | Set to `production` | `production` |
| `YT_KEY` | No | YouTube API Key (optional) | `AIza...` |
| `ALLOWED_ORIGINS` | No | CORS origins (comma-separated) | `https://your-app.vercel.app` |

### After Deployment

1. Copy your Railway service URL (e.g., `https://supersonic-backend.up.railway.app`)
2. Update your frontend `.env` file with:
   ```
   VITE_BACKEND_URL=https://your-railway-url.up.railway.app
   ```
3. Deploy your frontend to Vercel or Railway

---

## 🎯 Alternative: Deploy to Render.com

### Option 1: Quick Deploy with Blueprint

1. Push your code to Git
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click "New" → "Blueprint"
4. Connect your repository - Render will detect `render.yaml`

### Option 2: Manual Deploy

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New" → "Web Service"
3. Connect your Git repository
4. Configure:
   - **Root Directory**: `backend`
   - **Environment**: `Docker`
   - **Plan**: Free

---

## 📦 Local Development

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies (required for music_api.py)
pip install yt-dlp ytmusicapi

# Start the server
npm start

# Or with auto-reload
npm run dev
```

## 🐳 Docker (Local)

```bash
# Build the image
docker build -t supersonic-backend .

# Run the container
docker run -p 3001:3001 supersonic-backend
```

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

## ⚠️ Platform Notes

### Railway
- Generous free tier with 500 hours/month
- No sleep on free tier (unlike Render)
- Fast cold starts

### Render Free Tier
- Service spins down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds
- Database is ephemeral

## 🔒 Security

- Never commit `.env` files
- Use `.env.example` as a template
- Set `ALLOWED_ORIGINS` to your frontend domain in production

## ✨ Features

- **yt-dlp** - Reliable audio extraction with regular updates
- **ytmusicapi** - Direct YouTube Music API integration
- **Smart Autoplay** - Intelligent queue generation
- **Caching** - Audio URLs, metadata, and search results are cached
- **Health Check** - Built-in `/health` endpoint for monitoring
