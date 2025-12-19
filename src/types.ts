export interface AudioMetadata {
    bitrate: number;
    hz: number;
    format: string;
}

export interface Song {
    id: string;
    title: string;
    artist: string;
    artistId?: string;
    channelId?: string;
    thumbnail: string;
    duration: string;
    durationSeconds?: number;
    color?: string;
    album?: string;
    albumId?: string;
    playedAt?: string;
    quality?: AudioMetadata;
}
