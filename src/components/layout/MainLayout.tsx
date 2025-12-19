import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MiniPlayer } from '@/components/player/MiniPlayer';
import { FullPlayer } from '@/components/player/FullPlayer';
import { RightPlayer } from '@/components/player/RightPlayer';
import { usePlayerStore } from '@/store/playerStore';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { currentSong, isRightPanelOpen } = usePlayerStore();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      {/* Main content area with responsive padding */}
      <div className={`lg:pl-64 transition-all duration-300 ${isRightPanelOpen && currentSong ? 'xl:pr-[380px]' : ''}`}>
        <Header />
        <main className={`p-4 sm:p-6 ${currentSong ? (isRightPanelOpen ? 'pb-6' : 'pb-28 sm:pb-32') : ''}`}>
          {children}
        </main>
      </div>

      {/* Right side player for landscape/desktop */}
      <RightPlayer />

      {/* Bottom player for mobile/tablet */}
      <MiniPlayer />
      <FullPlayer />
    </div>
  );
};
