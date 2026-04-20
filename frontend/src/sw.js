/**
 * Combined Service Worker
 * - Workbox precaching (PWA offline support)
 * - Firebase Cloud Messaging background push notifications
 *
 * This file is processed by Vite (via vite-plugin-pwa injectManifest),
 * so import.meta.env and ES module imports are available.
 */

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

// Workbox precache manifest — replaced at build time by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Immediately take control when a new version is installed.
// Without this, the new SW waits until all tabs are closed (injectManifest
// mode does NOT auto-inject skipWaiting unlike generateSW mode).
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// Also handle the SKIP_WAITING message sent by vite-plugin-pwa's autoUpdate
// registration script so future updates trigger correctly.
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Take control of all existing clients as soon as we activate.
self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Firebase config — replaced at build time by Vite (no URL params needed)
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// FCM automatically handles background 'notification' payloads,
// including displaying the notification and handling the click
// via the fcm_options.link provided by the backend!
// No manual onBackgroundMessage is needed here, preventing duplicate notifications.
