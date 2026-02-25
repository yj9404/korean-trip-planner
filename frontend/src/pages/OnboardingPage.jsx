import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';

const OnboardingPage = ({ user, existingGroups = [], onGroupUpdate }) => {
    const navigate = useNavigate();
    const [mode, setMode] = useState(null); // null, 'select', 'create', 'join'
    const [groupName, setGroupName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [pendingGroups, setPendingGroups] = useState([]);
    const [fetchingPending, setFetchingPending] = useState(true);

    useEffect(() => {
        const fetchPendingGroups = async () => {
            try {
                const token = await user.getIdToken(true);
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/groups/my-pending-groups`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setPendingGroups(data);
                }
            } catch (err) {
                console.error('Fetch pending error:', err);
            } finally {
                setFetchingPending(false);
            }
        };
        fetchPendingGroups();
    }, [user]);


    const handleCreateGroup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const token = await user.getIdToken(true);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/groups/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: groupName })
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Authentication failed. Please try logging out and logging in again.');
                }
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to create group');
            }

            const data = await response.json();
            console.log('Group created:', data);

            // Update app state to redirect to dashboard
            if (onGroupUpdate) {
                await onGroupUpdate();
            }
        } catch (err) {
            console.error('Create group error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectGroup = async (groupId) => {
        setLoading(true);
        setError('');

        try {
            const token = await user.getIdToken(true);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/groups/switch/${groupId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to select group');
            }

            // Update app state to redirect to dashboard
            if (onGroupUpdate) {
                await onGroupUpdate();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinGroup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const token = await user.getIdToken(true);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/groups/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ invite_code: inviteCode })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to join group');
            }

            // Show pending approval message
            setPendingGroups([...pendingGroups, { name: data.group_name }]);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (err) {
            console.error('Logout error:', err);
        }
    };

    if (fetchingPending) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center px-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center text-gray-600">
                    <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Loading your profile...
                </div>
            </div>
        );
    }

    if (pendingGroups.length > 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center px-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="mb-6">
                        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-4xl">⏳</span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Waiting for Approval</h2>
                        <p className="text-gray-600">
                            Your request to join <strong>{pendingGroups.map(g => g.name).join(', ')}</strong> has been submitted.
                        </p>
                        <p className="text-gray-500 text-sm mt-2">
                            The group owner will review your request shortly.
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition"
                    >
                        Logout
                    </button>
                    {/* Add option to cancel or do other things if needed, but going back to start is cleaner */}
                    <button
                        onClick={() => setPendingGroups([])}
                        className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700 transition"
                    >
                        Create another group instead
                    </button>
                </div>
            </div>
        );
    }

    if (!mode) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center px-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome! 🎉</h1>
                        <p className="text-gray-600">Let's get you started</p>
                    </div>

                    <div className="space-y-4">
                        {existingGroups.length > 0 && (
                            <button
                                onClick={() => { setMode('select'); setError(''); }}
                                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition"
                            >
                                📋 Select Existing Group
                            </button>
                        )}
                        <button
                            onClick={() => { setMode('create'); setError(''); }}
                            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition"
                        >
                            ➕ Create New Group
                        </button>
                        <button
                            onClick={() => { setMode('join'); setError(''); }}
                            className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition"
                        >
                            🔗 Join with Code
                        </button>
                    </div>

                    <div className="mt-6 text-center">
                        <button
                            onClick={handleLogout}
                            className="text-gray-500 text-sm hover:text-gray-700 transition"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (mode === 'select') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center px-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
                    <button
                        onClick={() => { setMode(null); setError(''); }}
                        className="text-gray-500 hover:text-gray-700 mb-4"
                    >
                        ← Back
                    </button>

                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Select a Group</h2>

                    {error && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {existingGroups.map((group) => (
                            <button
                                key={group.id}
                                onClick={() => handleSelectGroup(group.id)}
                                disabled={loading}
                                className="w-full p-4 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border-2 border-green-200 hover:border-green-400 rounded-xl text-left transition disabled:opacity-50 group"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-gray-800 text-lg group-hover:text-green-700">
                                            {group.name}
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Code: <span className="font-mono font-bold text-green-600">{group.invite_code}</span>
                                        </p>
                                    </div>
                                    <div className="text-2xl">
                                        {group.role === 'OWNER' ? '👑' : '👤'}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {loading && (
                        <div className="mt-4 text-center text-gray-600">
                            Loading...
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (mode === 'create') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center px-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
                    <button
                        onClick={() => { setMode(null); setError(''); }}
                        className="text-gray-500 hover:text-gray-700 mb-4"
                    >
                        ← Back
                    </button>

                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Group</h2>

                    <form onSubmit={handleCreateGroup}>
                        <div className="mb-6">
                            <label className="block text-gray-700 font-medium mb-2">Group Name</label>
                            <input
                                type="text"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                placeholder="e.g., Wedding Trip 2026"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition"
                                required
                            />
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 transition"
                        >
                            {loading ? 'Creating...' : 'Create Group'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (mode === 'join') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center px-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
                    <button
                        onClick={() => { setMode(null); setError(''); }}
                        className="text-gray-500 hover:text-gray-700 mb-4"
                    >
                        ← Back
                    </button>

                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Join with Code</h2>

                    <form onSubmit={handleJoinGroup}>
                        <div className="mb-6">
                            <label className="block text-gray-700 font-medium mb-2">Invite Code</label>
                            <input
                                type="text"
                                value={inviteCode}
                                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                placeholder="ABC123"
                                maxLength={6}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-center text-2xl font-mono tracking-widest transition"
                                required
                            />
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 transition"
                        >
                            {loading ? 'Joining...' : 'Join Group'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return null;
};

export default OnboardingPage;
