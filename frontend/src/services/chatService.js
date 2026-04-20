/**
 * Chat service for API calls and real-time messaging
 */

import { db, auth } from './firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Create a new chat room
 */
// Helper to get auth headers
const getAuthHeaders = async () => {
    const user = auth.currentUser;
    if (user) {
        const token = await user.getIdToken();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }
    return {
        'Content-Type': 'application/json',
    };
};

/**
 * Create a new chat room
 */
export const createChatRoom = async (tripId, participants) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/v1/chat/rooms`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            trip_id: tripId,
            participants: participants,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to create chat room');
    }

    return await response.json();
};

/**
 * Get chat room information
 */
export const getChatRoom = async (roomId) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/v1/chat/rooms/${roomId}`, {
        headers,
    });

    if (!response.ok) {
        throw new Error('Failed to get chat room');
    }

    return await response.json();
};

/**
 * Get all chat rooms for a user
 */
export const getUserChatRooms = async (userId) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/v1/chat/rooms/user/${userId}`, {
        headers,
    });

    if (!response.ok) {
        throw new Error('Failed to get chat rooms');
    }

    return await response.json();
};

/**
 * Send a message to a chat room
 */
export const sendMessage = async (roomId, messageData) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/v1/chat/rooms/${roomId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify(messageData),
    });

    if (!response.ok) {
        throw new Error('Failed to send message');
    }

    return await response.json();
};

/**
 * Get messages from a chat room
 */
export const getMessages = async (roomId, messageLimit = 50) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/v1/chat/rooms/${roomId}/messages?limit=${messageLimit}`, {
        headers,
    });

    if (!response.ok) {
        throw new Error('Failed to get messages');
    }

    return await response.json();
};

/**
 * Translate a message
 */
export const translateMessage = async (text, sourceLang, targetLang) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/v1/chat/translate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            text,
            source_lang: sourceLang,
            target_lang: targetLang,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to translate message');
    }

    return await response.json();
};

/**
 * Get user preferences
 */
export const getUserPreferences = async (userId) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/v1/chat/preferences/${userId}`, {
        headers,
    });

    if (!response.ok) {
        throw new Error('Failed to get preferences');
    }

    return await response.json();
};

/**
 * Update user preferences
 */
export const updateUserPreferences = async (userId, preferences) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/v1/chat/preferences/${userId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(preferences),
    });

    if (!response.ok) {
        throw new Error('Failed to update preferences');
    }

    return await response.json();
};

/**
 * Subscribe to real-time messages using Firestore
 */
export const subscribeToMessages = (roomId, messageLimit = 50, callback, errorCallback) => {
    const messagesRef = collection(db, 'chat_rooms', roomId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(messageLimit));

    return onSnapshot(
        q,
        (snapshot) => {
            const messages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate(),
            }));
            callback(messages.reverse());
        },
        (error) => {
            console.error('Error subscribing to messages:', error);
            if (errorCallback) {
                errorCallback(error);
            }
        }
    );
};
