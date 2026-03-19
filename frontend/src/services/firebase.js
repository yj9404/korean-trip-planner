import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

export const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY;

// Check if the current environment supports web push
// (requires: HTTPS or localhost, serviceWorker, Notification, PushManager)
const isMessagingEnvironmentSupported = () =>
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'Notification' in window &&
    'PushManager' in window;

let _messaging = null;
export const getMessagingInstance = async () => {
    if (_messaging) return _messaging;
    if (!isMessagingEnvironmentSupported()) {
        console.info('[FCM] Push not supported in this environment.');
        return null;
    }
    try {
        // Explicitly register our custom SW with config via URL parameters
        // This prevents hardcoding the API key in the public JS file
        const swUrl = new URL('/firebase-messaging-sw.js', window.location.origin);
        for (const [key, value] of Object.entries(firebaseConfig)) {
            if (value) swUrl.searchParams.append(key, value);
        }

        await navigator.serviceWorker.register(swUrl.toString(), {
            scope: '/',
        });
        _messaging = getMessaging(app);
        return _messaging;
    } catch (err) {
        console.warn('[FCM] Failed to initialize messaging:', err);
        return null;
    }
};

export default app;

