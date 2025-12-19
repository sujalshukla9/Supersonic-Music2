
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { BACKEND_URL } from '@/config/api';
import {
    Palette,
    Volume2,
    Wifi,
    Bell,
    Shield,
    Database,
    Info,
    ChevronRight,
    Monitor,
    Moon,
    Sun,
    Laptop,
    Check,
    Smartphone,
    Trash2,
    Headphones,
    Music,
    Zap,
    AudioWaveform
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/store/settingsStore';

const THEME_OPTIONS = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Laptop },
];

const ACCENT_COLORS = [
    { id: 'violet', label: 'Violet', class: 'bg-violet-500', from: 'from-violet-500', to: 'to-purple-600' },
    { id: 'blue', label: 'Blue', class: 'bg-blue-500', from: 'from-blue-500', to: 'to-cyan-500' },
    { id: 'emerald', label: 'Emerald', class: 'bg-emerald-500', from: 'from-emerald-500', to: 'to-teal-500' },
    { id: 'rose', label: 'Rose', class: 'bg-rose-500', from: 'from-rose-500', to: 'to-pink-500' },
    { id: 'amber', label: 'Amber', class: 'bg-amber-500', from: 'from-amber-500', to: 'to-orange-500' },
];

const Settings = () => {
    const {
        theme,
        accentColor,
        audioQuality,
        autoPlay,
        crossfade,
        normalizeVolume,
        bassBoost,
        downloadQuality,
        dataSaver,
        setTheme,
        setAccentColor,
        setSetting
    } = useSettingsStore();

    const [activeTab, setActiveTab] = useState('appearance');
    const [isClearing, setIsClearing] = useState(false);

    const [cacheStats, setCacheStats] = useState({
        audio: 0,
        metadata: 0,
        search: 0,
        artist: 0,
        trending: 0,
        totalSize: '0 B'
    });

    const fetchCacheStats = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/cache/stats`);
            if (res.ok) {
                const data = await res.json();

                // Estimate size (URL entries are small, typically < 2KB)
                // This is purely server-side memory usage estimation
                const totalItems = (data.audio || 0) + (data.metadata || 0) + (data.search || 0) + (data.artist || 0);
                const estimatedBytes = totalItems * 2048 + (data.trending || 0) * 5120; // ~2KB per item

                let formattedSize = '0 B';
                if (estimatedBytes > 1024 * 1024) formattedSize = `${(estimatedBytes / (1024 * 1024)).toFixed(2)} MB`;
                else if (estimatedBytes > 1024) formattedSize = `${(estimatedBytes / 1024).toFixed(2)} KB`;
                else formattedSize = `${estimatedBytes} B`;

                setCacheStats({ ...data, totalSize: formattedSize });
            }
        } catch (e) {
            console.error('Failed to fetch cache stats', e);
        }
    };

    useEffect(() => {
        fetchCacheStats();
    }, []);

    const handleClearCache = async () => {
        setIsClearing(true);
        try {
            await fetch(`${BACKEND_URL}/cache/clear`, { method: 'POST' });
            await new Promise(r => setTimeout(r, 800)); // Visual delay
            await fetchCacheStats();
        } catch (e) {
            console.error('Failed to clear cache', e);
        } finally {
            setIsClearing(false);
        }
    };

    const tabs = [
        { id: 'appearance', label: 'Appearance', icon: Palette, description: 'Theme, accent color' },
        { id: 'audio', label: 'Audio', icon: Headphones, description: 'Quality, playback' },
        { id: 'data', label: 'Storage', icon: Database, description: 'Cache, downloads' },
        { id: 'about', label: 'About', icon: Info, description: 'Version, legal' },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'appearance':
                return (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Palette className="w-5 h-5 text-primary" />
                                App Theme
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {THEME_OPTIONS.map((option) => (
                                    <button
                                        key={option.id}
                                        onClick={() => setTheme(option.id as any)}
                                        className={cn(
                                            "relative group flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all duration-200",
                                            theme === option.id
                                                ? "border-primary bg-primary/5 text-primary"
                                                : "border-border/50 bg-card hover:bg-secondary/50 hover:border-border"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                                            theme === option.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                        )}>
                                            <option.icon className="w-6 h-6" />
                                        </div>
                                        <span className="font-semibold">{option.label}</span>
                                        {theme === option.id && (
                                            <div className="absolute top-4 right-4">
                                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                                                    <Check className="w-3 h-3" />
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-primary" />
                                Accent Color
                            </h3>
                            <div className="p-6 rounded-2xl bg-card border border-border/50">
                                <div className="flex flex-wrap gap-4">
                                    {ACCENT_COLORS.map((color) => (
                                        <button
                                            key={color.id}
                                            onClick={() => setAccentColor(color.id)}
                                            className={cn(
                                                "group relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300",
                                                `bg-gradient-to-br ${color.from} ${color.to}`,
                                                accentColor === color.id ? "scale-110 shadow-lg ring-4 ring-offset-4 ring-offset-background ring-primary/20" : "hover:scale-105 opacity-80 hover:opacity-100"
                                            )}
                                        >
                                            {accentColor === color.id && (
                                                <Check className="w-6 h-6 text-white drop-shadow-md" />
                                            )}
                                            <span className="sr-only">{color.label}</span>
                                        </button>
                                    ))}
                                </div>
                                <p className="mt-4 text-sm text-muted-foreground">
                                    Choose a color that matches your vibe. This will be applied across the entire application.
                                </p>
                            </div>
                        </div>
                    </div>
                );

            case 'audio':
                return (
                    <div className="space-y-6 overflow-visible">
                        <section className="p-6 rounded-2xl bg-card border border-border/50">
                            <h3 className="text-xl font-bold flex items-center gap-2 mb-6">
                                <Music className="w-5 h-5 text-primary" />
                                Audio Quality
                            </h3>

                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-secondary/30">
                                    <div className="space-y-1">
                                        <label className="font-semibold block">Streaming Quality</label>
                                        <p className="text-sm text-muted-foreground">Adjust audio bitrate</p>
                                    </div>
                                    <Select
                                        value={audioQuality}
                                        onValueChange={(value) => setSetting('audioQuality', value)}
                                    >
                                        <SelectTrigger className="w-full sm:w-[180px]">
                                            <SelectValue placeholder="Select quality" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Low (96kbps)</SelectItem>
                                            <SelectItem value="normal">Normal (160kbps)</SelectItem>
                                            <SelectItem value="high">High (320kbps)</SelectItem>
                                            <SelectItem value="lossless">Lossless (FLAC)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-secondary/30">
                                    <div className="space-y-0.5 flex-1">
                                        <label className="font-semibold block">Normalize Volume</label>
                                        <p className="text-sm text-muted-foreground">Set the same volume level for all tracks</p>
                                    </div>
                                    <Switch
                                        checked={normalizeVolume}
                                        onCheckedChange={(checked) => setSetting('normalizeVolume', checked)}
                                    />
                                </div>

                                <div className="p-4 rounded-xl bg-secondary/30 space-y-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <label className="font-semibold flex items-center gap-2">
                                                <AudioWaveform className="w-4 h-4 text-primary" />
                                                Bass Boost
                                            </label>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Enhance low frequencies for deeper bass
                                            </p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-sm font-bold flex-shrink-0 ${bassBoost > 0 ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                                            {bassBoost === 0 ? 'Off' : `${bassBoost}%`}
                                        </span>
                                    </div>
                                    <Slider
                                        value={[bassBoost]}
                                        max={100}
                                        step={5}
                                        onValueChange={([val]) => setSetting('bassBoost', val)}
                                        className="py-2"
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Off</span>
                                        <span>50%</span>
                                        <span>100%</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground/80 bg-card/50 p-2 rounded-lg">
                                        🔊 Boosts frequencies below 200Hz for richer, deeper bass. Best experienced with headphones or quality speakers.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="p-6 rounded-2xl bg-card border border-border/50">
                            <h3 className="text-xl font-bold flex items-center gap-2 mb-6">
                                <Volume2 className="w-5 h-5 text-primary" />
                                Playback
                            </h3>

                            <div className="space-y-6">
                                <div className="p-4 rounded-xl bg-secondary/30 space-y-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <label className="font-semibold block">Crossfade</label>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Smooth transition between tracks
                                            </p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-sm font-bold flex-shrink-0 ${crossfade > 0 ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                                            {crossfade === 0 ? 'Off' : `${crossfade}s`}
                                        </span>
                                    </div>
                                    <Slider
                                        value={[crossfade]}
                                        max={12}
                                        step={1}
                                        onValueChange={([val]) => setSetting('crossfade', val)}
                                        className="py-2"
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Off</span>
                                        <span>6s</span>
                                        <span>12s</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground/80 bg-card/50 p-2 rounded-lg">
                                        💡 When enabled, songs will fade out before ending while the next track fades in, creating a seamless DJ-style mix.
                                    </p>
                                </div>

                                <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-secondary/30">
                                    <div className="space-y-0.5 flex-1">
                                        <label className="font-semibold block">Autoplay</label>
                                        <p className="text-sm text-muted-foreground">Keep playing similar songs when queue ends</p>
                                    </div>
                                    <Switch
                                        checked={autoPlay}
                                        onCheckedChange={(checked) => setSetting('autoPlay', checked)}
                                    />
                                </div>
                            </div>
                        </section>
                    </div>
                );

            case 'data':
                return (
                    <div className="space-y-6">
                        <section className="p-6 rounded-2xl bg-card border border-border/50 space-y-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Wifi className="w-5 h-5 text-primary" />
                                Data Usage
                            </h3>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <label className="font-semibold block">Data Saver</label>
                                    <p className="text-sm text-muted-foreground">Reduces audio quality on cellular networks</p>
                                </div>
                                <Switch
                                    checked={dataSaver}
                                    onCheckedChange={(checked) => setSetting('dataSaver', checked)}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
                                <div className="space-y-1">
                                    <label className="font-semibold block">Download Quality</label>
                                    <p className="text-sm text-muted-foreground">Preferred quality for offline listening</p>
                                </div>
                                <Select
                                    value={downloadQuality}
                                    onValueChange={(value) => setSetting('downloadQuality', value)}
                                >
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Select quality" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="lossless">Lossless</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </section>

                        <section className="p-6 rounded-2xl bg-card border border-border/50">
                            <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
                                <Database className="w-5 h-5 text-primary" />
                                Storage
                            </h3>

                            <div className="p-6 rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400">
                                        <Trash2 className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-lg mb-1">Clear Cache</h4>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Free up memory by clearing cached server data.
                                            <br />
                                            <span className="inline-block mt-2 text-xs font-mono bg-secondary/50 px-2 py-1 rounded">
                                                {cacheStats.audio} Audio URLs • {cacheStats.metadata + cacheStats.artist} Metadata • {cacheStats.search} Searches
                                            </span>
                                        </p>
                                        <button
                                            onClick={handleClearCache}
                                            disabled={isClearing || cacheStats.totalSize === '0 B'}
                                            className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold transition-all shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {isClearing ? (
                                                <>
                                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Clearing...
                                                </>
                                            ) : (
                                                `Clear Cache (${cacheStats.totalSize})`
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                );

            case 'about':
                return (
                    <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-8 p-6 rounded-2xl bg-card border border-border/50">
                        <section className="relative">
                            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                            <div className="relative w-24 h-24 rounded-3xl bg-gradient-primary flex items-center justify-center shadow-2xl shadow-primary/30">
                                <Monitor className="w-12 h-12 text-primary-foreground" />
                            </div>
                        </section>

                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
                                Supersonic Music
                            </h2>
                            <p className="text-muted-foreground text-lg">
                                Version 1.0.0 (Beta)
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
                            <a href="#" className="flex items-center justify-center gap-2 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors font-medium">
                                <Shield className="w-4 h-4" />
                                Privacy Policy
                            </a>
                            <a href="#" className="flex items-center justify-center gap-2 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors font-medium">
                                <Info className="w-4 h-4" />
                                Terms of Service
                            </a>
                        </div>

                        <p className="text-xs text-muted-foreground pt-8">
                            Made with <span className="text-red-500">♥</span> by Supersonic Team
                        </p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <Helmet>
                <title>Settings - Supersonic Music</title>
                <meta name="description" content="Customize your listening experience on Supersonic Music." />
            </Helmet>

            <div className="w-full max-w-5xl mx-auto pb-20 px-4 sm:px-6">
                <div className="flex flex-col gap-6 md:gap-8 pt-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between"
                    >
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold mb-2">Settings</h1>
                            <p className="text-muted-foreground text-lg">
                                Manage your preferences and app settings
                            </p>
                        </div>
                    </motion.div>

                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Sidebar Navigation */}
                        <motion.aside
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="w-full md:w-64 lg:w-72 flex-shrink-0"
                        >
                            <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-4 md:pb-0 scrollbar-hide">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={cn(
                                            "flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 outline-none whitespace-nowrap md:whitespace-normal min-w-[160px] md:min-w-0 text-left",
                                            activeTab === tab.id
                                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                                        )}
                                    >
                                        <tab.icon className={cn("w-5 h-5 flex-shrink-0", activeTab === tab.id ? "text-primary-foreground" : "")} />
                                        <div>
                                            <span className="font-semibold block">{tab.label}</span>
                                            <span className={cn("text-xs hidden md:block mt-0.5", activeTab === tab.id ? "text-primary-foreground/80" : "text-muted-foreground/70")}>{tab.description}</span>
                                        </div>
                                        {activeTab === tab.id && (
                                            <ChevronRight className="w-4 h-4 ml-auto hidden md:block opacity-60" />
                                        )}
                                    </button>
                                ))}
                            </nav>
                        </motion.aside>

                        {/* Main Content Area */}
                        <main className="flex-1 min-w-0">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {renderContent()}
                                </motion.div>
                            </AnimatePresence>
                        </main>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Settings;
