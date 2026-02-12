import axios from 'axios';
import { auth } from './firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance
const api = axios.create({
    baseURL: `${API_URL}/api/v1`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use(
    async (config) => {
        const user = auth.currentUser;
        if (user) {
            const token = await user.getIdToken();
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// API methods
export const apiService = {
    // Translation
    translate: async (text, sourceLang, targetLang, context = null) => {
        const response = await api.post('/translate', {
            text,
            source_lang: sourceLang,
            target_lang: targetLang,
            context,
        });
        return response.data;
    },

    // AI Guide
    getAIGuide: async (query, language = 'en', location = null, tripDates = null, preferences = null) => {
        const response = await api.post('/ai-guide', {
            query,
            language,
            location,
            trip_dates: tripDates,
            preferences,
        });
        return response.data;
    },

    getRecommendations: async (category, location, language = 'en') => {
        const response = await api.get(`/recommendations/${category}/${location}`, {
            params: { language },
        });
        return response.data;
    },

};

export default api;
