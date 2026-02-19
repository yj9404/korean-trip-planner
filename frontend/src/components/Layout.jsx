import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
    FiHome,
    FiMapPin,
    FiCompass,
    FiGlobe,
    FiMessageSquare,
    FiUser,
    FiUsers,
    FiMenu,
    FiX,
    FiLogOut,
    FiCamera,
    FiChevronDown
} from 'react-icons/fi';

const Layout = ({ children, user, fullWidth = false }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [aiMenuOpen, setAiMenuOpen] = useState(false);
    const [mobileAiMenuOpen, setMobileAiMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    // Close AI menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.ai-dropdown-container')) {
                setAiMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Check for incomplete profile
    useEffect(() => {
        const checkProfile = async () => {
            if (!user) return;

            // Skip check if we are already on the complete profile page
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

    const menuItems = [
        { path: '/dashboard', label: 'Dashboard', icon: FiHome },
        { path: '/itinerary', label: 'Itinerary', icon: FiMapPin },
        { path: '/chat', label: 'Chat', icon: FiMessageSquare },
        {
            key: 'ai-tools',
            label: 'AI Tools',
            icon: FiCompass,
            children: [
                { path: '/menu-scan', label: 'Menu Scan', icon: FiCamera },
                { path: '/ai-guide', label: 'AI Guide', icon: FiCompass },
                { path: '/translate', label: 'Translate', icon: FiGlobe },
            ]
        },
        { path: '/groups', label: 'Groups', icon: FiUsers },
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
                                <FiMapPin className="text-white text-xl" />
                            </div>
                            <span className="text-xl font-bold text-gray-900 hidden sm:block">
                                Korea Trip
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center space-x-1">
                            {menuItems.map((item) => {
                                if (item.children) {
                                    // Dropdown Menu
                                    const isChildActive = item.children.some(child => location.pathname === child.path);
                                    return (
                                        <div key={item.key} className="relative ai-dropdown-container">
                                            <button
                                                onClick={() => setAiMenuOpen(!aiMenuOpen)}
                                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${isChildActive || aiMenuOpen
                                                    ? 'bg-primary-50 text-primary-700 font-medium'
                                                    : 'text-gray-600 hover:bg-gray-100'
                                                    }`}
                                            >
                                                <item.icon className="text-xl" />
                                                <span>{item.label}</span>
                                                <FiChevronDown className={`transition-transform duration-200 ${aiMenuOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            {/* Dropdown Content */}
                                            {aiMenuOpen && (
                                                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 animate-fadeIn z-50">
                                                    {item.children.map((child) => (
                                                        <Link
                                                            key={child.path}
                                                            to={child.path}
                                                            onClick={() => setAiMenuOpen(false)}
                                                            className={`flex items-center space-x-3 px-4 py-2.5 hover:bg-gray-50 transition-colors ${location.pathname === child.path
                                                                ? 'text-primary-700 font-medium bg-primary-50'
                                                                : 'text-gray-600'
                                                                }`}
                                                        >
                                                            <child.icon className="text-lg" />
                                                            <span>{child.label}</span>
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                // Standard Menu Item
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
                    <div className="md:hidden border-t border-gray-200 bg-white max-h-[80vh] overflow-y-auto">
                        <nav className="container-app py-4 space-y-1">
                            {menuItems.map((item) => {
                                if (item.children) {
                                    // Mobile Dropdown (Accordion)
                                    const isChildActive = item.children.some(child => location.pathname === child.path);

                                    return (
                                        <div key={item.key} className="space-y-1">
                                            <button
                                                onClick={() => setMobileAiMenuOpen(!mobileAiMenuOpen)}
                                                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${isChildActive
                                                    ? 'bg-primary-50 text-primary-700 font-medium'
                                                    : 'text-gray-600 hover:bg-gray-100'
                                                    }`}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <item.icon className="text-xl" />
                                                    <span>{item.label}</span>
                                                </div>
                                                <FiChevronDown className={`transition-transform duration-200 ${mobileAiMenuOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            {mobileAiMenuOpen && (
                                                <div className="pl-4 space-y-1 bg-gray-50/50 py-2 rounded-lg">
                                                    {item.children.map(child => (
                                                        <Link
                                                            key={child.path}
                                                            to={child.path}
                                                            onClick={() => setMobileMenuOpen(false)}
                                                            className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${location.pathname === child.path
                                                                ? 'text-primary-700 font-medium'
                                                                : 'text-gray-500 hover:text-gray-900'
                                                                }`}
                                                        >
                                                            <child.icon className="text-lg" />
                                                            <span>{child.label}</span>
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

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
