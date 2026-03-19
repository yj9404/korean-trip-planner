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

// URL 파라미터를 통해 전달된 동적 Firebase 설정값을 읽어옵니다.
// 이렇게 하면 GitHub에 API 키가 하드코딩되어 올라가는 것을 방지할 수 있습니다.
const urlParams = new URLSearchParams(location.search);
const firebaseConfig = {
    apiKey: urlParams.get('apiKey'),
    authDomain: urlParams.get('authDomain'),
    projectId: urlParams.get('projectId'),
    storageBucket: urlParams.get('storageBucket'),
    messagingSenderId: urlParams.get('messagingSenderId'),
    appId: urlParams.get('appId'),
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn('[FCM-SW] Missing Firebase config from URL. Waiting for re-registration.');
} else {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

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
}

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
