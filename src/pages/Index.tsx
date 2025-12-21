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
        <RecentlyPlayedSection />
        <RecommendationsSection />
        <ForYouSection />
        <TrendingSection />
        <PlaylistSection />
        <ArtistsSection />
      </div>
    </>
  );
};

export default Index;
