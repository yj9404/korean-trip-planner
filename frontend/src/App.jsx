import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Context
import { GroupProvider } from './contexts/GroupContext';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import TripsPage from './pages/TripsPage';
import AIGuidePage from './pages/AIGuidePage';
import TranslatePage from './pages/TranslatePage';
import ChatPage from './pages/ChatPage';
import ItineraryPage from './pages/ItineraryPage';
import ProfilePage from './pages/ProfilePage';
import CompleteProfilePage from './pages/CompleteProfilePage';
import GroupsPage from './pages/GroupsPage';
import MenuScanPage from './pages/MenuScanPage';
import JoinGroupPage from './pages/JoinGroupPage';
import GalleryPage from './pages/GalleryPage';

// Components
import Layout from './components/Layout';
import Loading from './components/Loading';

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hasGroup, setHasGroup] = useState(null); // null = checking, true/false = result
    const [groups, setGroups] = useState([]);

    const checkUserGroups = async (currentUser) => {
        if (!currentUser) return;

        try {
            // Force refresh token to ensure it's valid
            const token = await currentUser.getIdToken(true);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/groups/my-groups`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const groupsData = await response.json();
                setGroups(groupsData);
                setHasGroup(groupsData.length > 0);
            } else if (response.status === 401) {
                // Token might still be invalid, retry once
                console.warn('Token invalid, retrying...');
                const newToken = await currentUser.getIdToken(true);
                const retryResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/groups/my-groups`, {
                    headers: {
                        'Authorization': `Bearer ${newToken}`
                    }
                });

                if (retryResponse.ok) {
                    const groupsData = await retryResponse.json();
                    setGroups(groupsData);
                    setHasGroup(groupsData.length > 0);
                } else {
                    setGroups([]);
                    setHasGroup(false);
                }
            } else {
                setGroups([]);
                setHasGroup(false);
            }
        } catch (error) {
            console.error('Error checking groups:', error);
            setGroups([]);
            setHasGroup(false);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                await checkUserGroups(currentUser);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return <Loading />;
    }

    return (
        <GroupProvider user={user}>
            <Router>
                {/* Onboarding Logic: user logged in but no group */}
                {user && hasGroup === false ? (
                    <Routes>
                        <Route path="/join/:inviteCode" element={<JoinGroupPage />} />
                        <Route
                            path="*"
                            element={
                                <OnboardingPage
                                    user={user}
                                    existingGroups={groups}
                                    onGroupUpdate={() => checkUserGroups(user)}
                                />
                            }
                        />
                    </Routes>
                ) : (
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/" element={<LandingPage />} />
                        <Route
                            path="/login"
                            element={user ? <Navigate to="/dashboard" /> : <LoginPage />}
                        />
                        {/* 초대 링크 - 로그인 여부 무관하게 JoinGroupPage가 내부적으로 처리 */}
                        <Route path="/join/:inviteCode" element={<JoinGroupPage />} />

                        {/* Protected Routes */}
                        <Route
                            path="/dashboard"
                            element={
                                user ? (
                                    <Layout user={user}>
                                        <DashboardPage user={user} />
                                    </Layout>
                                ) : (
                                    <Navigate to="/login" />
                                )
                            }
                        />
                        <Route
                            path="/groups"
                            element={
                                user ? (
                                    <Layout user={user}>
                                        <GroupsPage />
                                    </Layout>
                                ) : (
                                    <Navigate to="/login" />
                                )
                            }
                        />
                        <Route
                            path="/ai-guide"
                            element={
                                user ? (
                                    <Layout user={user}>
                                        <AIGuidePage user={user} />
                                    </Layout>
                                ) : (
                                    <Navigate to="/login" />
                                )
                            }
                        />
                        <Route
                            path="/translate"
                            element={
                                user ? (
                                    <Layout user={user}>
                                        <TranslatePage user={user} />
                                    </Layout>
                                ) : (
                                    <Navigate to="/login" />
                                )
                            }
                        />
                        <Route
                            path="/chat"
                            element={
                                user ? (
                                    <Layout user={user}>
                                        <ChatPage user={user} />
                                    </Layout>
                                ) : (
                                    <Navigate to="/login" />
                                )
                            }
                        />
                        <Route
                            path="/itinerary"
                            element={
                                user ? (
                                    <Layout user={user} fullWidth={true}>
                                        <ItineraryPage user={user} />
                                    </Layout>
                                ) : (
                                    <Navigate to="/login" />
                                )
                            }
                        />
                        <Route
                            path="/profile"
                            element={
                                user ? (
                                    <Layout user={user}>
                                        <ProfilePage user={user} />
                                    </Layout>
                                ) : (
                                    <Navigate to="/login" />
                                )
                            }
                        />
                        <Route
                            path="/complete-profile"
                            element={
                                user ? (
                                    <CompleteProfilePage user={user} />
                                ) : (
                                    <Navigate to="/login" />
                                )
                            }
                        />

                        <Route
                            path="/menu-scan"
                            element={
                                user ? (
                                    <Layout user={user}>
                                        <MenuScanPage user={user} />
                                    </Layout>
                                ) : (
                                    <Navigate to="/login" />
                                )
                            }
                        />

                        <Route
                            path="/gallery"
                            element={
                                user ? (
                                    <Layout user={user}>
                                        <GalleryPage user={user} />
                                    </Layout>
                                ) : (
                                    <Navigate to="/login" />
                                )
                            }
                        />

                        {/* 404 */}
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                )}
            </Router>
        </GroupProvider>
    );
}

export default App;
