// API Configuration
// In production, VITE_BACKEND_URL must be set to your deployed backend URL
// In development, defaults to localhost:3001

const envUrl = import.meta.env.VITE_BACKEND_URL;

// Default to localhost for development
const API_BASE = envUrl || 'http://localhost:3001';

// Log API base for debugging
if (typeof window !== 'undefined') {
    if (envUrl) {
        console.log("API BASE =", API_BASE);
    } else {
        console.log("API BASE = http://localhost:3001 (default - set VITE_BACKEND_URL for production)");
    }
}

export const BACKEND_URL = API_BASE;

// Helper function for API calls
export const apiUrl = (path: string) => {
    return `${BACKEND_URL}${path}`;
};
