# Supersonic Music Backend

Audio streaming backend for the Supersonic Music app, powered by yt-dlp and youtubei.js.

## 🚀 Deployment to Render.com

### Option 1: Quick Deploy with Blueprint (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click "New" → "Blueprint"
4. Connect your repository
5. Render will automatically detect `render.yaml` and configure the service

### Option 2: Manual Deploy with Docker

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New" → "Web Service"
3. Connect your Git repository
4. Configure the service:
   - **Name**: `supersonic-music-backend`
   - **Environment**: `Docker`
   - **Branch**: `main` (or your default branch)
   - **Plan**: Free (or your preferred plan)

### Environment Variables

Set these in Render Dashboard → Your Service → Environment:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PORT` | No | Server port (Render sets this automatically) | `3001` |
| `REGION` | No | Default region for content | `IN` |
| `YT_KEY` | No | YouTube Data API key (for some features) | `AIza...` |
| `NODE_ENV` | No | Set to `production` automatically | `production` |
| `ALLOWED_ORIGINS` | No | Comma-separated list of allowed origins | `https://your-app.vercel.app` |

### After Deployment

1. Copy your Render service URL (e.g., `https://supersonic-music-backend.onrender.com`)
2. Update your frontend `.env` file with:`VITE_BACKEND_URL=https://your-render-url.onrender.com`
3. Deploy your frontend to Vercel

## 📦 Local Development

```bash
# Install dependencies
npm install

# Make sure Python and yt-dlp are installed
python -m pip install yt-dlp

# Start the server
npm start

# Or with auto-reload
npm run dev
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

## ⚠️ Notes for Render Free Tier

- The service may spin down after 15 minutes of inactivity
- First request after spin-down may take 30-60 seconds
- Database is ephemeral (resets on restart) - consider adding a proper database for persistence
- yt-dlp is included in the Docker image

## 🔒 Security

- Never commit `.env` files
- Use the `.env.example` as a template
- Set `ALLOWED_ORIGINS` in production for better security
