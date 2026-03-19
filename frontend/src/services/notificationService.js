/**
 * Notification service — handles FCM permission, token acquisition, and
 * syncing the token to our backend.
 */

import { getToken, onMessage } from 'firebase/messaging';
import { getMessagingInstance, VAPID_KEY } from './firebase';
import { auth } from './firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Request notification permission, get FCM token, and sync it to the backend.
 * Safe to call multiple times — exits silently if permission is denied or
 * messaging is not supported (e.g. non-PWA Safari).
 */
export async function requestPermissionAndGetToken() {
    console.log('[FCM] Starting requestPermissionAndGetToken...');
    try {
        const messaging = await getMessagingInstance();
        if (!messaging) {
            console.info('[FCM] Messaging not supported in this environment.');
            return null;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.info('[FCM] Notification permission denied.');
            return null;
        }

        // Wait for the custom service worker registration with URL params to be ready
        const registration = await navigator.serviceWorker.ready;

        const token = await getToken(messaging, { 
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration 
        });

        if (!token) {
            console.warn('[FCM] No token retrieved. Check VAPID key and Service Worker setup.');
            return null;
        }

        // Sync token to backend
        await syncTokenToBackend(token);
        return token;
    } catch (err) {
        // Never crash the app due to notification issues
        console.warn('[FCM] Failed to get/sync token:', err);
        return null;
    }
}

/**
 * POST the FCM token to our backend so the server can send push notifications.
 */
async function syncTokenToBackend(token) {
    try {
        const user = auth.currentUser;
        if (!user) return;
        const idToken = await user.getIdToken();
        await fetch(`${API_URL}/api/v1/users/me/fcm-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ token }),
        });
    } catch (err) {
        console.warn('[FCM] Token sync to backend failed:', err);
    }
}

/**
 * Register a handler for foreground messages (when the app tab is active).
 * The service worker handles background messages automatically.
 * @param {function} callback - Called with the FCM message payload
 * @returns {function} Unsubscribe function
 */
export async function onForegroundMessage(callback) {
    const messaging = await getMessagingInstance();
    if (!messaging) return () => {};
    return onMessage(messaging, callback);
}
