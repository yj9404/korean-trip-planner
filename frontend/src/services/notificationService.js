/**
 * Notification service — handles FCM permission, token acquisition, and
 * syncing the token to our backend.
 */

import { getToken, onMessage } from 'firebase/messaging';
import { getMessagingInstance, VAPID_KEY } from './firebase';
import { auth } from './firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const FCM_TOKEN_STORAGE_KEY = 'fcm_token';

/**
 * Request notification permission, get FCM token, and sync it to the backend.
 * Automatically removes the previous token if it changed (e.g. after SW update),
 * preventing duplicate notifications from stale tokens.
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

        const registration = await navigator.serviceWorker.ready;

        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration,
        });

        if (!token) {
            console.warn('[FCM] No token retrieved. Check VAPID key and Service Worker setup.');
            return null;
        }

        // Remove old token from backend if it changed (happens when SW updates)
        const prevToken = localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
        if (prevToken && prevToken !== token) {
            console.info('[FCM] Token changed — removing old token from backend');
            await removeTokenFromBackend(prevToken);
        }
        localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);

        await syncTokenToBackend(token);
        return token;
    } catch (err) {
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
        if (!user) {
            console.warn('[FCM] Cannot sync token: no authenticated user');
            return false;
        }
        const idToken = await user.getIdToken();
        const res = await fetch(`${API_URL}/api/v1/users/me/fcm-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ token }),
        });
        if (!res.ok) {
            console.warn(`[FCM] Token sync failed with status ${res.status}`);
            return false;
        }
        console.info('[FCM] Token synced to backend successfully');
        return true;
    } catch (err) {
        console.warn('[FCM] Token sync to backend failed:', err);
        return false;
    }
}

/**
 * DELETE a specific FCM token from the backend.
 */
async function removeTokenFromBackend(token) {
    try {
        const user = auth.currentUser;
        if (!user) return;
        const idToken = await user.getIdToken();
        await fetch(`${API_URL}/api/v1/users/me/fcm-token`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ token }),
        });
        console.info('[FCM] Old token removed from backend');
    } catch (err) {
        console.warn('[FCM] Old token removal failed:', err);
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
