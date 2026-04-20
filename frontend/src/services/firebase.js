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
        // The combined SW (sw.js) is registered automatically by vite-plugin-pwa.
        // Wait for it to be active before initializing messaging.
        await navigator.serviceWorker.ready;
        _messaging = getMessaging(app);
        return _messaging;
    } catch (err) {
        console.warn('[FCM] Failed to initialize messaging:', err);
        return null;
    }
};

export default app;

