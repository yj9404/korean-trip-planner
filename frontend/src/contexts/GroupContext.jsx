import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../services/firebase';

const GroupContext = createContext(null);

export const useGroup = () => {
    const context = useContext(GroupContext);
    if (!context) {
        throw new Error('useGroup must be used within GroupProvider');
    }
    return context;
};

export const GroupProvider = ({ children, user }) => {
    const [currentGroup, setCurrentGroup] = useState(null);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchGroups = async () => {
        if (!user) return;

        try {
            // Force refresh token to ensure it's valid
            const token = await user.getIdToken(true);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/groups/my-groups`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setGroups(data);

                // Only fetch current group if user belongs to at least one group
                if (data.length > 0) {
                    try {
                        const currentResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/groups/current`, {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });

                        if (currentResponse.ok) {
                            const currentData = await currentResponse.json();
                            setCurrentGroup(currentData);
                        } else {
                            setCurrentGroup(null);
                        }
                    } catch (err) {
                        setCurrentGroup(null);
                    }
                } else {
                    setCurrentGroup(null);
                }
            }
        } catch (error) {
            console.error('Error fetching groups:', error);
        } finally {
            setLoading(false);
        }
    };

    const switchGroup = async (groupId) => {
        if (!user) return;

        try {
            const token = await user.getIdToken(true);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/groups/switch/${groupId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                // Refresh groups and current group
                await fetchGroups();
                window.location.reload(); // Reload to refresh all data
            }
        } catch (error) {
            console.error('Error switching group:', error);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, [user]);

    return (
        <GroupContext.Provider value={{ currentGroup, groups, loading, switchGroup, refetchGroups: fetchGroups }}>
            {children}
        </GroupContext.Provider>
    );
};
