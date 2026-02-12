const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
import { getAuth } from 'firebase/auth';

const getAuthToken = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    return await user.getIdToken();
};

export const addPlace = async (placeData) => {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/itinerary/places`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(placeData)
    });

    if (!response.ok) throw new Error('Failed to add place');
    return await response.json();
};

export const getPlaces = async () => {
    try {
        const token = await getAuthToken();

        const response = await fetch(`${API_BASE_URL}/api/v1/itinerary/places`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', response.status, errorText);
            throw new Error(`Failed to get places: ${response.status} - ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('getPlaces error:', error);
        throw error;
    }
};

export const updatePlace = async (placeId, placeData) => {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/itinerary/places/${placeId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(placeData)
    });
    if (!response.ok) throw new Error('Failed to update place');
    return await response.json();
};

export const deletePlace = async (placeId) => {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/itinerary/places/${placeId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) throw new Error('Failed to delete place');
    return await response.json();
};

export const searchForeignPlaces = async (query) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/places/search/foreign?query=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Search failed');
    return await response.json();
};

// ... existing exports ...

export const getPlaceDescription = async (placeName, location) => {
    const url = `${API_BASE_URL}/api/v1/places/search/description?place_name=${encodeURIComponent(placeName)}&location=${encodeURIComponent(location || '')}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to get description');
    return await response.json();
};
