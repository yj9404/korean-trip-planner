import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TripsPage from './pages/TripsPage';
import AIGuidePage from './pages/AIGuidePage';
import TranslatePage from './pages/TranslatePage';

// Components
import Layout from './components/Layout';
import Loading from './components/Loading';

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return <Loading />;
    }

    return (
        <Router>
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route
                    path="/login"
                    element={user ? <Navigate to="/dashboard" /> : <LoginPage />}
                />

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
                    path="/trips"
                    element={
                        user ? (
                            <Layout user={user}>
                                <TripsPage user={user} />
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

                {/* 404 */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
}

export default App;
