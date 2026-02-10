/**
 * Chat service for API calls and real-time messaging
 */

import { db } from './firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Create a new chat room
 */
export const createChatRoom = async (tripId, participants) => {
    const response = await fetch(`${API_URL}/api/v1/chat/rooms`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
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
    const response = await fetch(`${API_URL}/api/v1/chat/rooms/${roomId}`);

    if (!response.ok) {
        throw new Error('Failed to get chat room');
    }

    return await response.json();
};

/**
 * Get all chat rooms for a user
 */
export const getUserChatRooms = async (userId) => {
    const response = await fetch(`${API_URL}/api/v1/chat/rooms/user/${userId}`);

    if (!response.ok) {
        throw new Error('Failed to get chat rooms');
    }

    return await response.json();
};

/**
 * Send a message to a chat room
 */
export const sendMessage = async (roomId, messageData) => {
    const response = await fetch(`${API_URL}/api/v1/chat/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
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
    const response = await fetch(`${API_URL}/api/v1/chat/rooms/${roomId}/messages?limit=${messageLimit}`);

    if (!response.ok) {
        throw new Error('Failed to get messages');
    }

    return await response.json();
};

/**
 * Translate a message
 */
export const translateMessage = async (text, sourceLang, targetLang) => {
    const response = await fetch(`${API_URL}/api/v1/chat/translate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
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
    const response = await fetch(`${API_URL}/api/v1/chat/preferences/${userId}`);

    if (!response.ok) {
        throw new Error('Failed to get preferences');
    }

    return await response.json();
};

/**
 * Update user preferences
 */
export const updateUserPreferences = async (userId, preferences) => {
    const response = await fetch(`${API_URL}/api/v1/chat/preferences/${userId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
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
export const subscribeToMessages = (roomId, callback, errorCallback) => {
    const messagesRef = collection(db, 'chat_rooms', roomId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(50));

    return onSnapshot(
        q,
        (snapshot) => {
            const messages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate(),
            }));
            callback(messages);
        },
        (error) => {
            console.error('Error subscribing to messages:', error);
            if (errorCallback) {
                errorCallback(error);
            }
        }
    );
};
