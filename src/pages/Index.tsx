import { HeroBanner } from '@/components/sections/HeroBanner';
import { PlaylistSection } from '@/components/sections/PlaylistSection';
import { TrendingSection } from '@/components/sections/TrendingSection';
import { ArtistsSection } from '@/components/sections/ArtistsSection';
import { RecentlyPlayedSection } from '@/components/sections/RecentlyPlayedSection';
import { RecommendationsSection } from '@/components/sections/RecommendationsSection';
import { ForYouSection } from '@/components/sections/ForYouSection';
import { Helmet } from 'react-helmet-async';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Supersonic Music - Stream Your Favorite Music</title>
        <meta name="description" content="Discover millions of songs, playlists, and artists. Stream trending music from around the world with Supersonic Music." />
      </Helmet>

      <div className="space-y-4 sm:space-y-8">
        <HeroBanner />
        {/* Recently Played - only shows if user has history */}
        <RecentlyPlayedSection />
        {/* Trending - main content section that always shows */}
        <TrendingSection />
        {/* Quick Picks - personalized or default recommendations */}
        <RecommendationsSection />
        {/* For You - personalized content based on habits */}
        <ForYouSection />
        {/* Featured Playlists - uses mock data, always shows */}
        <PlaylistSection />
        {/* Top Artists - uses mock data, always shows */}
        <ArtistsSection />
      </div>
    </>
  );
};

export default Index;
