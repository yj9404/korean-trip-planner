/**
 * Firebase Messaging Service Worker
 * Handles background push notifications when the app tab is not active.
 *
 * IMPORTANT: This file must be served from the root (public/) directory
 * so the browser can register it at the correct scope.
 * Firebase SDK is loaded via CDN compat scripts (required for service workers).
 */

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Firebase config — must be kept in sync with frontend .env
// Service workers cannot read import.meta.env, so values are inlined here.
// These are public-safe client credentials (not secret keys).
firebase.initializeApp({
    apiKey: 'AIzaSyACjBAsL39B4ddQ6TDlMJCprHoALKtaEwg',
    authDomain: 'korean-trip-planner.firebaseapp.com',
    projectId: 'korean-trip-planner',
    storageBucket: 'korean-trip-planner.firebasestorage.app',
    messagingSenderId: '434095745262',
    appId: '1:434095745262:web:07002b17a54c8ecbeeabff',
});

const messaging = firebase.messaging();

/**
 * Handle background messages (app minimized or in a different tab).
 * Firebase automatically shows system notifications from the `notification`
 * field in the FCM payload. This handler fires for custom `data`-only payloads.
 */
messaging.onBackgroundMessage((payload) => {
    const { title, body } = payload.notification || {};
    const url = payload.data?.url || '/chat';

    self.registration.showNotification(title || 'Korea Trip Planner', {
        body: body || 'New message received',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        data: { url },
    });
});

/**
 * Open the app and navigate to the linked URL when a notification is clicked.
 */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/chat';

    event.waitUntil(
        clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then((windowClients) => {
                // If the app is already open, focus it and navigate
                for (const client of windowClients) {
                    if ('focus' in client) {
                        client.focus();
                        client.navigate(url);
                        return;
                    }
                }
                // Otherwise open a new window
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});
