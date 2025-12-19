import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import Search from "./pages/Search";
import { MainLayout } from './components/layout/MainLayout';
import Explore from "./pages/Explore";
import Favorites from "./pages/Favorites";
import Playlists from "./pages/Playlists";
import Artists from "./pages/Artists";
import ArtistDetails from "./pages/ArtistDetails";
import Albums from "./pages/Albums";
import AlbumDetails from "./pages/AlbumDetails";
import Genre from "./pages/Genre";
import NotFound from "./pages/NotFound";
import History from "./pages/History";
import Settings from "./pages/Settings";
import Downloads from "./pages/DownloadsPage";
import { useSettingsStore } from "./store/settingsStore";
import { useEffect } from "react";

const queryClient = new QueryClient();

const ThemeInitializer = () => {
  const { initializeSettings } = useSettingsStore();

  useEffect(() => {
    initializeSettings();
  }, []); // Run only on mount to initialize theme and accent color

  return null;
}

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ThemeInitializer />
          <MainLayout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/search" element={<Search />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/playlists" element={<Playlists />} />
              <Route path="/history" element={<History />} />
              <Route path="/downloads" element={<Downloads />} />
              <Route path="/artists" element={<Artists />} />
              <Route path="/artist/:id" element={<ArtistDetails />} />
              <Route path="/albums" element={<Albums />} />
              <Route path="/album/:id" element={<AlbumDetails />} />
              <Route path="/genre/:genreName" element={<Genre />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </MainLayout>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
