import { Song } from '@/types';

export interface Playlist {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  songCount: number;
  gradient: string;
}

export interface Artist {
  id: string;
  name: string;
  image: string;
  followers: string;
  verified: boolean;
}

export interface Genre {
  id: string;
  name: string;
  color: string;
  image: string;
}

export const playlists: Playlist[] = [
  {
    id: '1',
    name: 'Lo-Fi Beats',
    description: 'Chill beats to relax and study',
    thumbnail: 'https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?w=400',
    songCount: 45,
    gradient: 'from-purple-600 to-blue-500',
  },
  {
    id: '2',
    name: 'Bollywood Hits',
    description: 'Top trending Bollywood songs',
    thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
    songCount: 120,
    gradient: 'from-pink-500 to-orange-400',
  },
  {
    id: '3',
    name: 'Punjabi Vibes',
    description: 'High energy Punjabi tracks',
    thumbnail: 'https://images.unsplash.com/photo-1571974599782-87624638275e?w=400',
    songCount: 68,
    gradient: 'from-yellow-500 to-red-500',
  },
  {
    id: '4',
    name: 'Romantic Moods',
    description: 'Love songs for every mood',
    thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400',
    songCount: 85,
    gradient: 'from-rose-500 to-pink-600',
  },
  {
    id: '5',
    name: 'Chill Vibes',
    description: 'Easy listening for lazy days',
    thumbnail: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400',
    songCount: 52,
    gradient: 'from-cyan-500 to-teal-400',
  },
  {
    id: '6',
    name: 'Workout Mix',
    description: 'High energy workout tracks',
    thumbnail: 'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=400',
    songCount: 40,
    gradient: 'from-green-500 to-emerald-400',
  },
];

export const trendingSongs: Song[] = [
  {
    id: 'vGJTaP6anOU',
    title: 'Kesariya (Full Video)',
    artist: 'Arijit Singh',
    artistId: 'arijit-singh',
    thumbnail: 'https://i.ytimg.com/vi/vGJTaP6anOU/hqdefault.jpg',
    duration: '4:28',
    durationSeconds: 268,
  },
  {
    id: 'gvyUuxdRdR4',
    title: 'Raataan Lambiyan',
    artist: 'Jubin Nautiyal',
    artistId: 'jubin-nautiyal',
    thumbnail: 'https://i.ytimg.com/vi/gvyUuxdRdR4/hqdefault.jpg',
    duration: '3:50',
    durationSeconds: 230,
  },
  {
    id: '4Oi9pMBTjOs',
    title: 'Pasoori',
    artist: 'Ali Sethi & Shae Gill',
    artistId: 'coke-studio',
    thumbnail: 'https://i.ytimg.com/vi/4Oi9pMBTjOs/hqdefault.jpg',
    duration: '3:58',
    durationSeconds: 238,
  },
  {
    id: 'cYOxnNHg3ko',
    title: 'Tum Hi Ho',
    artist: 'Arijit Singh',
    artistId: 'arijit-singh',
    thumbnail: 'https://i.ytimg.com/vi/cYOxnNHg3ko/hqdefault.jpg',
    duration: '4:22',
    durationSeconds: 262,
  },
  {
    id: 'caXgPO5803A',
    title: 'Chaleya (Full Video)',
    artist: 'Arijit Singh & Shilpa Rao',
    artistId: 'arijit-singh',
    thumbnail: 'https://i.ytimg.com/vi/caXgPO5803A/hqdefault.jpg',
    duration: '3:45',
    durationSeconds: 225,
  },
  {
    id: 'ntWGH1dtxK0',
    title: 'Apna Bana Le',
    artist: 'Arijit Singh',
    artistId: 'arijit-singh',
    thumbnail: 'https://i.ytimg.com/vi/ntWGH1dtxK0/hqdefault.jpg',
    duration: '4:38',
    durationSeconds: 278,
  },
  {
    id: 'oDNVbcz_cQo',
    title: 'Tera Ban Jaunga',
    artist: 'Tulsi Kumar & Akhil Sachdeva',
    artistId: 't-series',
    thumbnail: 'https://i.ytimg.com/vi/oDNVbcz_cQo/hqdefault.jpg',
    duration: '3:56',
    durationSeconds: 236,
  },
  {
    id: 'K4DyBUG242c',
    title: 'Bones',
    artist: 'Imagine Dragons',
    artistId: 'imagine-dragons',
    thumbnail: 'https://i.ytimg.com/vi/K4DyBUG242c/hqdefault.jpg',
    duration: '2:45',
    durationSeconds: 165,
  },
  {
    id: '0yW7w8F2TVA',
    title: 'Tera Hone Laga Hoon',
    artist: 'Atif Aslam & Pritam',
    artistId: 'atif-aslam',
    thumbnail: 'https://i.ytimg.com/vi/0yW7w8F2TVA/hqdefault.jpg',
    duration: '4:21',
    durationSeconds: 261,
  },
  {
    id: 'IQ8G3LWmgLk',
    title: 'Tujhe Kitna Chahne Lage',
    artist: 'Arijit Singh',
    artistId: 'arijit-singh',
    thumbnail: 'https://i.ytimg.com/vi/IQ8G3LWmgLk/hqdefault.jpg',
    duration: '4:25',
    durationSeconds: 265,
  },
];

export const topArtists: Artist[] = [
  {
    id: 'arijit-singh',
    name: 'Arijit Singh',
    image: 'https://i.ytimg.com/vi/cYOxnNHg3ko/hqdefault.jpg',
    followers: '78.5M',
    verified: true,
  },
  {
    id: 'jubin-nautiyal',
    name: 'Jubin Nautiyal',
    image: 'https://i.ytimg.com/vi/gvyUuxdRdR4/hqdefault.jpg',
    followers: '45.2M',
    verified: true,
  },
  {
    id: 'shreya-ghoshal',
    name: 'Shreya Ghoshal',
    image: 'https://i.ytimg.com/vi/5y3ycXe6rqk/hqdefault.jpg',
    followers: '52.8M',
    verified: true,
  },
  {
    id: 'atif-aslam',
    name: 'Atif Aslam',
    image: 'https://i.ytimg.com/vi/0yW7w8F2TVA/hqdefault.jpg',
    followers: '38.9M',
    verified: true,
  },
  {
    id: 'neha-kakkar',
    name: 'Neha Kakkar',
    image: 'https://i.ytimg.com/vi/5sNpJqaYH40/hqdefault.jpg',
    followers: '42.1M',
    verified: true,
  },
  {
    id: 'ap-dhillon',
    name: 'AP Dhillon',
    image: 'https://i.ytimg.com/vi/xDBX5gP0TA4/hqdefault.jpg',
    followers: '28.6M',
    verified: true,
  },
];

export const genres: Genre[] = [
  { id: 'g1', name: 'Bollywood', color: 'from-pink-500 to-rose-500', image: 'https://i.ytimg.com/vi/vGJTaP6anOU/hqdefault.jpg' },
  { id: 'g2', name: 'Punjabi', color: 'from-orange-500 to-amber-500', image: 'https://i.ytimg.com/vi/xDBX5gP0TA4/hqdefault.jpg' },
  { id: 'g3', name: 'Indie', color: 'from-red-600 to-rose-600', image: 'https://i.ytimg.com/vi/4Oi9pMBTjOs/hqdefault.jpg' },
  { id: 'g4', name: 'Hip-Hop', color: 'from-cyan-500 to-blue-500', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200' },
  { id: 'g5', name: 'Lo-Fi', color: 'from-purple-500 to-indigo-500', image: 'https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?w=200' },
  { id: 'g6', name: 'Devotional', color: 'from-amber-600 to-yellow-500', image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=200' },
  { id: 'g7', name: 'Classical', color: 'from-emerald-500 to-teal-500', image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=200' },
  { id: 'g8', name: 'Romantic', color: 'from-violet-500 to-purple-600', image: 'https://i.ytimg.com/vi/cYOxnNHg3ko/hqdefault.jpg' },
];
