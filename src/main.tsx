import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register Service Worker for offline support and fast loading
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('[SW] ✅ Registered with scope:', registration.scope);

            // Handle service worker updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New service worker available, activate it immediately
                            console.log('[SW] 🔄 New version available, updating...');
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                        }
                    });
                }
            });

            // Reload page when new service worker takes control
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    refreshing = true;
                    console.log('[SW] ♻️ Reloading for new version...');
                    window.location.reload();
                }
            });

        } catch (err) {
            console.error('[SW] ❌ Registration failed:', err);
        }
    });

    // Detect online/offline status
    window.addEventListener('online', () => {
        console.log('[App] 📶 Back online');
        document.body.classList.remove('offline');
    });

    window.addEventListener('offline', () => {
        console.log('[App] 📴 Went offline');
        document.body.classList.add('offline');
    });

    // Set initial offline status
    if (!navigator.onLine) {
        document.body.classList.add('offline');
    }
}
