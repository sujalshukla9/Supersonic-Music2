
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SettingsState {
    theme: 'dark' | 'light' | 'system';
    accentColor: string;
    audioQuality: 'low' | 'normal' | 'high' | 'lossless';
    autoPlay: boolean;
    crossfade: number;
    normalizeVolume: boolean;
    downloadQuality: 'normal' | 'high' | 'lossless';
    dataSaver: boolean;

    setTheme: (theme: 'dark' | 'light' | 'system') => void;
    setAccentColor: (color: string) => void;
    setSetting: (key: keyof SettingsState, value: any) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            theme: 'dark',
            accentColor: 'violet',
            audioQuality: 'high',
            autoPlay: true,
            crossfade: 3,
            normalizeVolume: true,
            downloadQuality: 'high',
            dataSaver: false,

            setTheme: (theme) => {
                const root = window.document.documentElement;
                root.classList.remove('light', 'dark');

                if (theme === 'system') {
                    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
                        ? 'dark'
                        : 'light';
                    root.classList.add(systemTheme);
                } else {
                    root.classList.add(theme);
                }
                set({ theme });
            },

            setAccentColor: (color) => {
                const root = window.document.documentElement;
                const colorMap: Record<string, string> = {
                    violet: '210 100% 55%',
                    blue: '221 83% 53%',
                    emerald: '142 76% 36%',
                    rose: '343 100% 50%',
                    amber: '37 100% 50%',
                };

                if (colorMap[color]) {
                    // We need to update the CSS variable for --primary
                    // This is a bit hacky but works for now without a full theme provider
                    root.style.setProperty('--primary', colorMap[color]);
                }
                set({ accentColor: color });
            },

            setSetting: (key, value) => set((state) => ({ ...state, [key]: value })),
        }),
        {
            name: 'supersonic-settings',
        }
    )
);
