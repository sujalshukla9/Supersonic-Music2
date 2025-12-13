
import sys
import json
import yt_dlp
from ytmusicapi import YTMusic

def get_audio_url(video_id):
    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        # Use IPv4 to avoid 429
        'source_address': '0.0.0.0', 
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Add https:// to ID if not present
            url = f"https://www.youtube.com/watch?v={video_id}"
            info = ydl.extract_info(url, download=False)
            return {
                "url": info['url'],
                "title": info.get('title'),
                "duration": info.get('duration'),
                "thumbnail": info.get('thumbnail'),
                "artist": info.get('uploader'),
                "channelId": info.get('channel_id'),
                "mimeType": "audio/webm", 
                "bitrate": 128000
            }
    except Exception as e:
        return {"error": str(e)}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command provided"}))
        return

    command = sys.argv[1]
    
    # Initialize YTMusic
    # Using 'en' language and 'IN' region as per the server's default or 'US'
    ytmusic = YTMusic(language='en', location='IN') 

    try:
        result = None
        
        if command == "search":
            query = sys.argv[2]
            filter_type = sys.argv[3] if len(sys.argv) > 3 else None
            # filter can be songs, videos, albums, artists, playlists
            if filter_type == "all":
                filter_type = None
            
            result = ytmusic.search(query, filter=filter_type)
            
        elif command == "get_artist":
            channel_id = sys.argv[2]
            result = ytmusic.get_artist(channel_id)
            
        elif command == "get_album":
            browse_id = sys.argv[2]
            result = ytmusic.get_album(browse_id)
            
        elif command == "get_song":
            video_ids = sys.argv[2].split(',')
            if len(video_ids) == 1:
                result = ytmusic.get_song(video_ids[0])
            else:
                result = []
                for vid in video_ids:
                    if vid.strip():
                        try:
                            res = ytmusic.get_song(vid.strip())
                            result.append(res)
                        except:
                            pass
            
        elif command == "get_lyrics":
            # get_lyrics requires a browseId, not videoId. 
            # Usually we get browseId from get_watch_playlist
            browse_id = sys.argv[2] 
            result = ytmusic.get_lyrics(browse_id)
            
        elif command == "get_watch_playlist":
            video_id = sys.argv[2]
            limit = int(sys.argv[3]) if len(sys.argv) > 3 else 20
            # get_watch_playlist returns a dict with 'tracks' and 'lyrics' (browseId)
            result = ytmusic.get_watch_playlist(videoId=video_id, limit=limit)
            
        elif command == "get_playlist":
            playlist_id = sys.argv[2]
            limit = int(sys.argv[3]) if len(sys.argv) > 3 else 50
            result = ytmusic.get_playlist(playlistId=playlist_id, limit=limit)
            
        elif command == "get_charts":
            # country = sys.argv[2] if len(sys.argv) > 2 else 'IN'
            result = ytmusic.get_charts(country='IN')

        elif command == "extract_audio":
            video_id = sys.argv[2]
            result = get_audio_url(video_id)
            
        else:
            result = {"error": f"Unknown command: {command}"}

        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
