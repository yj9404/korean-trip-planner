import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
    FiHome,
    FiMap,
    FiCompass,
    FiGlobe,
    FiMessageSquare,
    FiUser,
    FiMenu,
    FiX,
    FiLogOut
} from 'react-icons/fi';

const Layout = ({ children, user, fullWidth = false }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    // Check for incomplete profile
    useEffect(() => {
        const checkProfile = async () => {
            if (!user) return;

            // Skip check if we are already on the complete profile page (though Layout isn't used there)
            if (location.pathname === '/complete-profile') return;

            try {
                const prefsDoc = await getDoc(doc(db, 'user_preferences', user.uid));
                if (prefsDoc.exists()) {
                    const data = prefsDoc.data();
                    if (!data.english_name) {
                        console.log('⚠️ Incomplete profile detected in Layout, redirecting...');
                        navigate('/complete-profile');
                    }
                } else {
                    // No preferences doc -> Redirect
                    console.log('⚠️ No profile detected in Layout, redirecting...');
                    navigate('/complete-profile');
                }
            } catch (error) {
                console.error('Error checking profile in Layout:', error);
            }
        };

        checkProfile();
    }, [user, navigate, location.pathname]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: FiHome },
        { path: '/itinerary', label: 'Itinerary', icon: FiMap },
        { path: '/chat', label: 'Chat', icon: FiMessageSquare },
        { path: '/ai-guide', label: 'AI Guide', icon: FiCompass },
        { path: '/translate', label: 'Translate', icon: FiGlobe },
        { path: '/profile', label: 'Profile', icon: FiUser },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-40">
                <div className="container-app">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link to="/dashboard" className="flex items-center space-x-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                                <FiMap className="text-white text-xl" />
                            </div>
                            <span className="text-xl font-bold text-gray-900 hidden sm:block">
                                Korea Trip
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center space-x-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${isActive
                                            ? 'bg-primary-50 text-primary-700 font-medium'
                                            : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        <Icon className="text-xl" />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* User Menu */}
                        <div className="flex items-center space-x-4">
                            <div className="hidden sm:block text-right">
                                <p className="text-sm font-medium text-gray-900">
                                    {user?.displayName || user?.email}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {user?.email}
                                </p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="hidden md:flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <FiLogOut />
                                <span>Logout</span>
                            </button>

                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                {mobileMenuOpen ? <FiX className="text-2xl" /> : <FiMenu className="text-2xl" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-gray-200 bg-white">
                        <nav className="container-app py-4 space-y-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                            ? 'bg-primary-50 text-primary-700 font-medium'
                                            : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        <Icon className="text-xl" />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <FiLogOut className="text-xl" />
                                <span>Logout</span>
                            </button>
                        </nav>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className={fullWidth ? "min-h-[calc(100vh-64px)]" : "container-app py-8"}>
                {children}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-auto">
                <div className="container-app py-6">
                    <p className="text-center text-sm text-gray-500">
                        © 2026 Korea Trip Planner. Made with ❤️ for family adventures.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default Layout;
