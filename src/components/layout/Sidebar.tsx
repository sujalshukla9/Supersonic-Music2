import { Home, Search, Library, Compass, Music2, Users, Disc3, Heart, ListMusic, Settings, X, Clock, Download } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/store/playerStore';
import { motion, AnimatePresence } from 'framer-motion';

const menuItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Search, label: 'Search', path: '/search' },
  { icon: Compass, label: 'Explore', path: '/explore' },
];

const libraryItems = [
  { icon: Heart, label: 'Favorites', path: '/favorites' },
  { icon: ListMusic, label: 'Playlists', path: '/playlists' },
  { icon: Download, label: 'Downloads', path: '/downloads' },
  { icon: Clock, label: 'History', path: '/history' },
  { icon: Users, label: 'Artists', path: '/artists' },
  { icon: Disc3, label: 'Albums', path: '/albums' },
];

export const Sidebar = () => {
  const { isSidebarOpen, toggleSidebar } = usePlayerStore();

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center glow-primary">
            <Music2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-gradient">Supersonic</span>
        </div>
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-full hover:bg-secondary transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Menu
        </p>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => window.innerWidth < 1024 && toggleSidebar()}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground transition-all duration-200",
              "hover:bg-sidebar-accent hover:text-foreground"
            )}
            activeClassName="bg-sidebar-accent text-foreground shadow-glow"
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}

        <div className="pt-6">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Library
          </p>
          {libraryItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => window.innerWidth < 1024 && toggleSidebar()}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground transition-all duration-200",
                "hover:bg-sidebar-accent hover:text-foreground"
              )}
              activeClassName="bg-sidebar-accent text-foreground"
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-sidebar-border">
        <NavLink
          to="/settings"
          onClick={() => window.innerWidth < 1024 && toggleSidebar()}
          className="flex items-center gap-3 p-2 rounded-xl hover:bg-sidebar-accent transition-colors cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">S</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">Supersonic</p>
            <p className="text-xs text-muted-foreground">Premium</p>
          </div>
          <Settings className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </NavLink>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex-col z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleSidebar}
              className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="lg:hidden fixed left-0 top-0 h-screen w-72 bg-sidebar border-r border-sidebar-border flex flex-col z-[60]"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
