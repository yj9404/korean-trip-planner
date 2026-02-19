import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroup } from '../contexts/GroupContext';
import { auth } from '../services/firebase';
import { FiUsers, FiLogOut, FiTrash2, FiUserX, FiCheck, FiX, FiUserPlus } from 'react-icons/fi';

const GroupsPage = () => {
    const navigate = useNavigate();
    const { groups, currentGroup, switchGroup, fetchGroups } = useGroup();
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [members, setMembers] = useState([]);
    const [pendingMembers, setPendingMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Fetch groups when component mounts
        if (fetchGroups) {
            fetchGroups();
        }
    }, []);

    useEffect(() => {
        if (currentGroup) {
            setSelectedGroup(currentGroup);
            loadGroupDetails(currentGroup.id);
        } else if (groups && groups.length > 0) {
            // If no current group but groups exist, select the first one
            setSelectedGroup(groups[0]);
            loadGroupDetails(groups[0].id);
        }
    }, [currentGroup, groups]);

    const loadGroupDetails = async (groupId) => {
        setLoading(true);
        setError('');
        try {
            const user = auth.currentUser;
            const token = await user.getIdToken(true);

            // Load members
            const membersResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/groups/${groupId}/members`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (membersResponse.ok) {
                const membersData = await membersResponse.json();
                setMembers(membersData);
            }

            // Load pending members if owner
            const group = groups.find(g => g.id === groupId);
            if (group && group.role === 'OWNER') {
                const pendingResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/groups/pending-members?group_id=${groupId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (pendingResponse.ok) {
                    const pendingData = await pendingResponse.json();
                    setPendingMembers(pendingData);
                }
            }
        } catch (err) {
            setError('Failed to load group details');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSwitchGroup = async (groupId) => {
        try {
            await switchGroup(groupId);
            const newGroup = groups.find(g => g.id === groupId);
            setSelectedGroup(newGroup);
            loadGroupDetails(groupId);
        } catch (err) {
            setError('Failed to switch group');
        }
    };

    const handleLeaveGroup = async (groupId) => {
        if (!confirm('Are you sure you want to leave this group?')) return;

        try {
            const user = auth.currentUser;
            const token = await user.getIdToken(true);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/groups/${groupId}/leave`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                await fetchGroups();
                navigate('/groups');
            } else {
                const data = await response.json();
                setError(data.detail || 'Failed to leave group');
            }
        } catch (err) {
            setError('Failed to leave group');
        }
    };

    const handleDeleteGroup = async (groupId) => {
        if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) return;

        try {
            const user = auth.currentUser;
            const token = await user.getIdToken(true);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/groups/${groupId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                await fetchGroups();
                navigate('/groups');
            } else {
                const data = await response.json();
                setError(data.detail || 'Failed to delete group');
            }
        } catch (err) {
            setError('Failed to delete group');
        }
    };

    const handleKickMember = async (memberUserId) => {
        if (!confirm('Are you sure you want to kick this member?')) return;

        try {
            const user = auth.currentUser;
            const token = await user.getIdToken(true);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/groups/${selectedGroup.id}/members/${memberUserId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                loadGroupDetails(selectedGroup.id);
            } else {
                const data = await response.json();
                setError(data.detail || 'Failed to kick member');
            }
        } catch (err) {
            setError('Failed to kick member');
        }
    };

    const handleApproveMember = async (memberId, approved) => {
        try {
            const user = auth.currentUser;
            const token = await user.getIdToken(true);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/groups/approve-member`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ member_id: memberId, approved })
            });

            if (response.ok) {
                loadGroupDetails(selectedGroup.id);
            } else {
                const data = await response.json();
                setError(data.detail || 'Failed to approve member');
            }
        } catch (err) {
            setError('Failed to approve member');
        }
    };

    const currentUserRole = selectedGroup ? groups.find(g => g.id === selectedGroup.id)?.role : null;

    return (
        <div className="max-w-6xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Group Management</h1>

            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Group List */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <FiUsers />
                            My Groups
                        </h2>
                        <div className="space-y-2">
                            {!groups || groups.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-500">No groups found</p>
                                    <button
                                        onClick={() => navigate('/dashboard')}
                                        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                    >
                                        Create a Group
                                    </button>
                                </div>
                            ) : (
                                groups.map((group) => (
                                    <button
                                        key={group.id}
                                        onClick={() => handleSwitchGroup(group.id)}
                                        className={`w-full p-4 rounded-lg text-left transition ${selectedGroup?.id === group.id
                                            ? 'bg-indigo-50 border-2 border-indigo-500'
                                            : 'bg-gray-50 border-2 border-transparent hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-gray-800">{group.name}</p>
                                                <p className="text-xs text-gray-500">Code: {group.invite_code}</p>
                                            </div>
                                            {group.role === 'OWNER' && (
                                                <span className="text-xs font-medium px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">Owner</span>
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Group Details */}
                <div className="lg:col-span-2">
                    {selectedGroup ? (
                        <div className="space-y-6">
                            {/* Group Info */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-800">{selectedGroup.name}</h2>
                                        <p className="text-sm text-gray-500">Invite Code: <span className="font-mono font-bold text-indigo-600">{selectedGroup.invite_code}</span></p>
                                    </div>
                                    <div className="flex gap-2">
                                        {currentUserRole === 'OWNER' ? (
                                            <button
                                                onClick={() => handleDeleteGroup(selectedGroup.id)}
                                                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                                            >
                                                <FiTrash2 />
                                                Delete Group
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleLeaveGroup(selectedGroup.id)}
                                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                                            >
                                                <FiLogOut />
                                                Leave Group
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Pending Members (Owner only) */}
                            {currentUserRole === 'OWNER' && pendingMembers.length > 0 && (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <FiUserPlus />
                                        Pending Approvals
                                    </h3>
                                    <div className="space-y-2">
                                        {pendingMembers.map((member) => (
                                            <div key={member.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                                                <span className="text-gray-700">{member.display_name || member.user_id}</span>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleApproveMember(member.id, true)}
                                                        className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                                                    >
                                                        <FiCheck />
                                                    </button>
                                                    <button
                                                        onClick={() => handleApproveMember(member.id, false)}
                                                        className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                                                    >
                                                        <FiX />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Members List */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <FiUsers />
                                    Members ({members.length})
                                </h3>
                                {loading ? (
                                    <p className="text-gray-500">Loading...</p>
                                ) : (
                                    <div className="space-y-2">
                                        {members.map((member) => (
                                            <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-700">{member.display_name || member.user_id}</span>
                                                    {member.role === 'OWNER' && (
                                                        <span className="text-xs font-medium px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">Owner</span>
                                                    )}
                                                </div>
                                                {currentUserRole === 'OWNER' && member.role !== 'OWNER' && (
                                                    <button
                                                        onClick={() => handleKickMember(member.user_id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                                        title="Kick member"
                                                    >
                                                        <FiUserX />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                            <p className="text-gray-500">Select a group to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GroupsPage;
