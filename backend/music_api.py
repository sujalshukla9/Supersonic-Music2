#!/usr/bin/env python3
"""
YouTube Music API wrapper for Supersonic Music Backend
Uses ytmusicapi for search, trending, and metadata
NO audio extraction - that's handled by NewPipeExtractor (Piped/Invidious)
"""

import sys
import json
from ytmusicapi import YTMusic

# Initialize YTMusic (no auth needed for search/browse)
ytmusic = YTMusic()

def search(query, filter_type='songs', limit=20):
    """Search for songs, videos, albums, artists, or playlists"""
    try:
        results = ytmusic.search(query, filter=filter_type, limit=limit)
        print(json.dumps(results))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

def get_trending(limit=25):
    """Get trending music using multiple methods"""
    try:
        # Try to get charts first
        try:
            charts = ytmusic.get_charts(country='IN')
            if charts and 'videos' in charts and charts['videos'].get('items'):
                items = charts['videos']['items'][:limit]
                print(json.dumps({"trending": items, "source": "charts"}))
                return
            if charts and 'trending' in charts and charts['trending'].get('items'):
                items = charts['trending']['items'][:limit]
                print(json.dumps({"trending": items, "source": "charts_trending"}))
                return
        except:
            pass
        
        # Fallback: search for trending songs
        results = ytmusic.search("trending hindi songs 2024", filter='songs', limit=limit)
        print(json.dumps({"trending": results, "source": "search_fallback"}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

def get_song(video_id):
    """Get detailed song information"""
    try:
        song = ytmusic.get_song(video_id)
        print(json.dumps(song))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

def get_artist(artist_id):
    """Get artist information and their songs"""
    try:
        artist = ytmusic.get_artist(artist_id)
        print(json.dumps(artist))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

def get_album(album_id):
    """Get album details with tracks"""
    try:
        album = ytmusic.get_album(album_id)
        print(json.dumps(album))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

def get_playlist(playlist_id, limit=50):
    """Get playlist details with tracks"""
    try:
        playlist = ytmusic.get_playlist(playlist_id, limit=limit)
        print(json.dumps(playlist))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

def get_watch_playlist(video_id, limit=25):
    """Get related/autoplay songs for a video"""
    try:
        watch = ytmusic.get_watch_playlist(videoId=video_id, limit=limit)
        print(json.dumps(watch))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

def get_lyrics(browse_id):
    """Get lyrics for a song"""
    try:
        lyrics = ytmusic.get_lyrics(browse_id)
        print(json.dumps(lyrics))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

def get_home():
    """Get home page content"""
    try:
        home = ytmusic.get_home(limit=10)
        print(json.dumps(home))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

def get_audio_url(video_id, quality='high'):
    """Extract audio stream URL from song data"""
    try:
        song = ytmusic.get_song(video_id)
        
        if not song:
            print(json.dumps({"error": "Song not found"}))
            return
        
        streaming_data = song.get('streamingData', {})
        adaptive_formats = streaming_data.get('adaptiveFormats', [])
        
        # Filter audio-only formats that have a direct URL (not signatureCipher)
        audio_formats = [
            f for f in adaptive_formats 
            if f.get('mimeType', '').startswith('audio/') and f.get('url')
        ]
        
        if not audio_formats:
            # No direct URL formats, try all audio formats
            all_audio = [f for f in adaptive_formats if f.get('mimeType', '').startswith('audio/')]
            if all_audio:
                print(json.dumps({"error": "Audio streams require signature decoding", "hasFormats": True}))
            else:
                print(json.dumps({"error": "No audio streams available"}))
            return
        
        # Sort by bitrate (highest first)
        audio_formats.sort(key=lambda x: x.get('bitrate', 0), reverse=True)
        
        # Select based on quality
        if quality == 'low':
            selected = audio_formats[-1]
        elif quality == 'normal':
            selected = audio_formats[len(audio_formats) // 2] if len(audio_formats) > 2 else audio_formats[0]
        else:  # high or lossless
            selected = audio_formats[0]
        
        result = {
            "url": selected.get('url'),
            "mimeType": selected.get('mimeType', 'audio/mp4'),
            "bitrate": selected.get('bitrate', 128000),
            "format": "m4a" if "mp4" in selected.get('mimeType', '') else "webm",
            "source": "ytmusicapi"
        }
        
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

def get_charts(country='IN'):
    """Get music charts for a country"""
    try:
        charts = ytmusic.get_charts(country=country)
        print(json.dumps(charts))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command provided"}))
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "search":
        query = sys.argv[2] if len(sys.argv) > 2 else ""
        filter_type = sys.argv[3] if len(sys.argv) > 3 else "songs"
        limit = int(sys.argv[4]) if len(sys.argv) > 4 else 20
        search(query, filter_type, limit)
    
    elif command == "get_trending":
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else 25
        get_trending(limit)
    
    elif command == "get_song":
        video_id = sys.argv[2] if len(sys.argv) > 2 else ""
        get_song(video_id)
    
    elif command == "get_artist":
        artist_id = sys.argv[2] if len(sys.argv) > 2 else ""
        get_artist(artist_id)
    
    elif command == "get_album":
        album_id = sys.argv[2] if len(sys.argv) > 2 else ""
        get_album(album_id)
    
    elif command == "get_playlist":
        playlist_id = sys.argv[2] if len(sys.argv) > 2 else ""
        limit = int(sys.argv[3]) if len(sys.argv) > 3 else 50
        get_playlist(playlist_id, limit)
    
    elif command == "get_watch_playlist":
        video_id = sys.argv[2] if len(sys.argv) > 2 else ""
        limit = int(sys.argv[3]) if len(sys.argv) > 3 else 25
        get_watch_playlist(video_id, limit)
    
    elif command == "get_lyrics":
        browse_id = sys.argv[2] if len(sys.argv) > 2 else ""
        get_lyrics(browse_id)
    
    elif command == "get_home":
        get_home()
    
    elif command == "get_charts":
        country = sys.argv[2] if len(sys.argv) > 2 else "IN"
        get_charts(country)
    
    elif command == "get_audio_url":
        video_id = sys.argv[2] if len(sys.argv) > 2 else ""
        quality = sys.argv[3] if len(sys.argv) > 3 else "high"
        get_audio_url(video_id, quality)
    
    else:
        print(json.dumps({"error": f"Unknown command: {command}"}))
