
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BACKEND_URL } from '@/config/api';

// Accent color configuration with full HSL values and gradient mappings
const ACCENT_COLOR_CONFIG: Record<string, {
    primary: string;
    accent: string;
    ring: string;
    gradientFrom: string;
    gradientTo: string;
    glowColor: string;
}> = {
    violet: {
        primary: '262 83% 58%',      // Violet-500
        accent: '270 76% 60%',       // Purple-like accent
        ring: '262 83% 58%',
        gradientFrom: '262 83% 58%', // violet-500
        gradientTo: '270 70% 50%',   // purple-600
        glowColor: '262 83% 65%',
    },
    blue: {
        primary: '217 91% 60%',      // Blue-500
        accent: '199 89% 48%',       // Cyan-like accent
        ring: '217 91% 60%',
        gradientFrom: '217 91% 60%', // blue-500
        gradientTo: '199 89% 48%',   // cyan-500
        glowColor: '217 91% 65%',
    },
    emerald: {
        primary: '160 84% 39%',      // Emerald-500
        accent: '168 76% 42%',       // Teal-like accent
        ring: '160 84% 39%',
        gradientFrom: '160 84% 39%', // emerald-500
        gradientTo: '168 76% 42%',   // teal-500
        glowColor: '160 84% 45%',
    },
    rose: {
        primary: '350 89% 60%',      // Rose-500
        accent: '330 81% 60%',       // Pink-like accent
        ring: '350 89% 60%',
        gradientFrom: '350 89% 60%', // rose-500
        gradientTo: '330 81% 60%',   // pink-500
        glowColor: '350 89% 65%',
    },
    amber: {
        primary: '38 92% 50%',       // Amber-500
        accent: '25 95% 53%',        // Orange-like accent
        ring: '38 92% 50%',
        gradientFrom: '38 92% 50%',  // amber-500
        gradientTo: '25 95% 53%',    // orange-500
        glowColor: '38 92% 55%',
    },
};

// Light theme colors
const LIGHT_THEME = {
    background: '0 0% 100%',
    foreground: '222 47% 11%',
    card: '0 0% 98%',
    cardForeground: '222 47% 11%',
    popover: '0 0% 100%',
    popoverForeground: '222 47% 11%',
    secondary: '214 32% 91%',
    secondaryForeground: '222 47% 11%',
    muted: '214 32% 91%',
    mutedForeground: '215 16% 47%',
    border: '214 32% 85%',
    input: '214 32% 85%',
    sidebarBackground: '0 0% 98%',
    sidebarForeground: '222 47% 11%',
    sidebarBorder: '214 32% 85%',
    sidebarAccent: '214 32% 91%',
    glass: '0 0% 96%',
    glassBorder: '214 32% 85%',
};

// Dark theme colors (default)
const DARK_THEME = {
    background: '220 30% 6%',
    foreground: '0 0% 98%',
    card: '220 25% 10%',
    cardForeground: '0 0% 98%',
    popover: '220 25% 10%',
    popoverForeground: '0 0% 98%',
    secondary: '220 20% 15%',
    secondaryForeground: '0 0% 98%',
    muted: '220 15% 20%',
    mutedForeground: '220 10% 60%',
    border: '220 20% 18%',
    input: '220 20% 18%',
    sidebarBackground: '220 30% 8%',
    sidebarForeground: '0 0% 98%',
    sidebarBorder: '220 20% 15%',
    sidebarAccent: '220 25% 15%',
    glass: '220 30% 15%',
    glassBorder: '220 30% 25%',
};

const applyThemeColors = (isDark: boolean) => {
    const root = document.documentElement;
    const theme = isDark ? DARK_THEME : LIGHT_THEME;

    root.style.setProperty('--background', theme.background);
    root.style.setProperty('--foreground', theme.foreground);
    root.style.setProperty('--card', theme.card);
    root.style.setProperty('--card-foreground', theme.cardForeground);
    root.style.setProperty('--popover', theme.popover);
    root.style.setProperty('--popover-foreground', theme.popoverForeground);
    root.style.setProperty('--secondary', theme.secondary);
    root.style.setProperty('--secondary-foreground', theme.secondaryForeground);
    root.style.setProperty('--muted', theme.muted);
    root.style.setProperty('--muted-foreground', theme.mutedForeground);
    root.style.setProperty('--border', theme.border);
    root.style.setProperty('--input', theme.input);
    root.style.setProperty('--sidebar-background', theme.sidebarBackground);
    root.style.setProperty('--sidebar-foreground', theme.sidebarForeground);
    root.style.setProperty('--sidebar-border', theme.sidebarBorder);
    root.style.setProperty('--sidebar-accent', theme.sidebarAccent);
    root.style.setProperty('--glass', theme.glass);
    root.style.setProperty('--glass-border', theme.glassBorder);
};

const applyAccentColors = (colorId: string) => {
    const root = document.documentElement;
    const config = ACCENT_COLOR_CONFIG[colorId] || ACCENT_COLOR_CONFIG.violet;

    // Set primary and accent CSS variables
    root.style.setProperty('--primary', config.primary);
    root.style.setProperty('--primary-foreground', '0 0% 100%'); // Always white for contrast
    root.style.setProperty('--accent', config.accent);
    root.style.setProperty('--accent-foreground', '0 0% 100%');
    root.style.setProperty('--ring', config.ring);
    root.style.setProperty('--purple-glow', config.glowColor);
    root.style.setProperty('--pink-glow', config.accent);

    // Update sidebar primary colors
    root.style.setProperty('--sidebar-primary', config.primary);
    root.style.setProperty('--sidebar-primary-foreground', '0 0% 100%');
    root.style.setProperty('--sidebar-ring', config.ring);

    // Update gradient CSS variables
    root.style.setProperty('--gradient-primary',
        `linear-gradient(135deg, hsl(${config.gradientFrom}) 0%, hsl(${config.gradientTo}) 100%)`
    );

    // Update hero gradient for dark mode (uses primary color)
    const isDark = root.classList.contains('dark') || (!root.classList.contains('light') && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
        root.style.setProperty('--gradient-hero',
            `linear-gradient(135deg, hsl(${config.gradientFrom} / 0.25) 0%, hsl(${config.gradientTo} / 0.15) 50%, hsl(220 30% 8%) 100%)`
        );
    } else {
        root.style.setProperty('--gradient-hero',
            `linear-gradient(135deg, hsl(${config.gradientFrom} / 0.08) 0%, hsl(${config.gradientTo} / 0.05) 50%, hsl(0 0% 98%) 100%)`
        );
    }

    // Update shadow glow
    root.style.setProperty('--shadow-glow',
        `0 0 40px hsl(${config.primary} / 0.3)`
    );
    root.style.setProperty('--shadow-player',
        `0 -10px 40px hsl(${config.primary} / 0.2)`
    );

    // Update theme-color meta tag for PWA/mobile browser
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
        themeColorMeta.setAttribute('content', `hsl(${config.primary})`);
    }

    // Generate and apply dynamic favicon
    generateDynamicFavicon(config.primary, config.gradientTo);

    console.log(`[Settings] Applied accent color: ${colorId}`);
};

// Generate a dynamic favicon with the accent color
const generateDynamicFavicon = (primaryColor: string, secondaryColor: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 64, 64);
    gradient.addColorStop(0, `hsl(${primaryColor})`);
    gradient.addColorStop(1, `hsl(${secondaryColor})`);

    // Draw rounded square background
    ctx.beginPath();
    const radius = 12;
    ctx.moveTo(radius, 0);
    ctx.lineTo(64 - radius, 0);
    ctx.quadraticCurveTo(64, 0, 64, radius);
    ctx.lineTo(64, 64 - radius);
    ctx.quadraticCurveTo(64, 64, 64 - radius, 64);
    ctx.lineTo(radius, 64);
    ctx.quadraticCurveTo(0, 64, 0, 64 - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw music note icon (♪)
    ctx.fillStyle = 'white';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♪', 32, 34);

    // Convert to data URL and update favicon
    const faviconUrl = canvas.toDataURL('image/png');

    // Update favicon link
    let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        favicon.type = 'image/png';
        document.head.appendChild(favicon);
    }
    favicon.href = faviconUrl;

    // Also update apple-touch-icon
    let appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
    if (appleTouchIcon) {
        appleTouchIcon.href = faviconUrl;
    }
};

// System theme change listener
let systemThemeMediaQuery: MediaQueryList | null = null;
let systemThemeListener: ((e: MediaQueryListEvent) => void) | null = null;

const setupSystemThemeListener = (callback: (isDark: boolean) => void) => {
    // Remove existing listener if any
    if (systemThemeMediaQuery && systemThemeListener) {
        systemThemeMediaQuery.removeEventListener('change', systemThemeListener);
    }

    systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    systemThemeListener = (e: MediaQueryListEvent) => {
        callback(e.matches);
    };

    systemThemeMediaQuery.addEventListener('change', systemThemeListener);
};

const removeSystemThemeListener = () => {
    if (systemThemeMediaQuery && systemThemeListener) {
        systemThemeMediaQuery.removeEventListener('change', systemThemeListener);
        systemThemeMediaQuery = null;
        systemThemeListener = null;
    }
};

export interface SettingsState {
    theme: 'dark' | 'light' | 'system';
    accentColor: string;
    audioQuality: 'low' | 'normal' | 'high' | 'lossless';
    autoPlay: boolean;
    crossfade: number;
    normalizeVolume: boolean;
    bassBoost: number; // 0-100 bass boost level
    downloadQuality: 'normal' | 'high' | 'lossless';
    dataSaver: boolean;
    downloadStorageLimit: number; // Storage limit in MB (0 = not configured)

    setTheme: (theme: 'dark' | 'light' | 'system') => void;
    setAccentColor: (color: string) => void;
    setSetting: (key: keyof SettingsState, value: any) => void;
    initializeSettings: () => void;
    syncSettingsWithBackend: () => Promise<void>;
}

// Backend URL for settings sync is imported from @/config/api

// Debounced sync to backend
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
const syncToBackend = (settings: Partial<SettingsState>) => {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(async () => {
        try {
            await fetch(`${BACKEND_URL}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            console.log('[Settings] Synced to backend');
        } catch (e) {
            console.warn('[Settings] Failed to sync to backend:', e);
        }
    }, 1000); // Debounce by 1 second
};

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            theme: 'dark',
            accentColor: 'violet',
            audioQuality: 'lossless',
            autoPlay: true,
            crossfade: 3,
            normalizeVolume: true,
            bassBoost: 0, // Default: no bass boost
            downloadQuality: 'high',
            dataSaver: false,
            downloadStorageLimit: 0, // 0 = not configured, will show setup dialog

            setTheme: (theme) => {
                const root = document.documentElement;
                root.classList.remove('light', 'dark');

                // Remove existing system listener
                removeSystemThemeListener();

                if (theme === 'system') {
                    const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    root.classList.add(systemIsDark ? 'dark' : 'light');
                    applyThemeColors(systemIsDark);

                    // Setup listener for system theme changes
                    setupSystemThemeListener((isDark) => {
                        root.classList.remove('light', 'dark');
                        root.classList.add(isDark ? 'dark' : 'light');
                        applyThemeColors(isDark);
                        // Reapply accent colors to update theme-dependent gradients
                        applyAccentColors(get().accentColor);
                    });
                } else {
                    root.classList.add(theme);
                    applyThemeColors(theme === 'dark');
                }

                // Reapply accent colors to update gradient-hero and other theme-dependent styles
                applyAccentColors(get().accentColor);

                set({ theme });
                syncToBackend({ theme });
            },

            setAccentColor: (color) => {
                applyAccentColors(color);
                set({ accentColor: color });
                syncToBackend({ accentColor: color });
            },

            setSetting: (key, value) => {
                set((state) => ({ ...state, [key]: value }));
                syncToBackend({ [key]: value });
            },

            // Initialize settings on app load
            initializeSettings: () => {
                const { theme, accentColor, setTheme, setAccentColor } = get();
                // Re-apply current settings to ensure CSS variables are set
                setTheme(theme);
                setAccentColor(accentColor);
            },

            // Sync settings with backend (fetch from backend and merge)
            syncSettingsWithBackend: async () => {
                try {
                    const res = await fetch(`${BACKEND_URL}/settings`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.settings) {
                            const { setTheme, setAccentColor } = get();
                            // Apply backend settings if they exist
                            if (data.settings.theme) setTheme(data.settings.theme);
                            if (data.settings.accentColor) setAccentColor(data.settings.accentColor);
                            // Apply other settings
                            set((state) => ({
                                ...state,
                                audioQuality: data.settings.audioQuality || state.audioQuality,
                                autoPlay: data.settings.autoPlay ?? state.autoPlay,
                                crossfade: data.settings.crossfade ?? state.crossfade,
                                normalizeVolume: data.settings.normalizeVolume ?? state.normalizeVolume,
                                bassBoost: data.settings.bassBoost ?? state.bassBoost,
                                downloadQuality: data.settings.downloadQuality || state.downloadQuality,
                                dataSaver: data.settings.dataSaver ?? state.dataSaver,
                                downloadStorageLimit: data.settings.downloadStorageLimit ?? state.downloadStorageLimit,
                            }));
                            console.log('[Settings] Loaded from backend');
                        }
                    }
                } catch (e) {
                    console.warn('[Settings] Failed to fetch from backend:', e);
                }
            },
        }),
        {
            name: 'supersonic-settings',
        }
    )
);
