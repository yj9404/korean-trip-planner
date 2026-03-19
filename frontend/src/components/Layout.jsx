import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import packageJson from '../../package.json';
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
    FiChevronDown,
    FiImage
} from 'react-icons/fi';

const Layout = ({ children, user, fullWidth = false }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [aiMenuOpen, setAiMenuOpen] = useState(false);
    const [mobileAiMenuOpen, setMobileAiMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    // Close dropdown menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.ai-dropdown-container')) {
                setAiMenuOpen(false);
            }
            if (!event.target.closest('.user-dropdown-container')) {
                setUserMenuOpen(false);
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
        { path: '/gallery', label: 'Gallery', icon: FiImage },
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

                        {/* User Dropdown */}
                        <div className="flex items-center space-x-2">
                            {/* Desktop: 이름 클릭 시 드롭다운 */}
                            <div className="relative user-dropdown-container hidden md:block">
                                <button
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors hover:bg-gray-100 ${userMenuOpen ? 'bg-gray-100' : ''}`}
                                >
                                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                        {(user?.displayName || user?.email || '?')[0].toUpperCase()}
                                    </div>
                                    <div className="text-left hidden lg:block">
                                        <p className="text-sm font-medium text-gray-900 leading-tight">
                                            {user?.displayName || user?.email}
                                        </p>
                                    </div>
                                    <FiChevronDown className={`text-gray-500 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {userMenuOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                                        <div className="px-4 py-2 border-b border-gray-100 mb-1">
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Account</p>
                                            <p className="text-sm text-gray-700 truncate mt-0.5">{user?.email}</p>
                                        </div>
                                        <Link
                                            to="/profile"
                                            onClick={() => setUserMenuOpen(false)}
                                            className={`flex items-center space-x-3 px-4 py-2.5 hover:bg-gray-50 transition-colors ${location.pathname === '/profile' ? 'text-primary-700 font-medium bg-primary-50' : 'text-gray-700'
                                                }`}
                                        >
                                            <FiUser className="text-lg" />
                                            <span>Profile</span>
                                        </Link>
                                        <button
                                            onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                                            className="w-full flex items-center space-x-3 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            <FiLogOut className="text-lg" />
                                            <span>Logout</span>
                                        </button>
                                    </div>
                                )}
                            </div>

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
                            {/* Mobile: 구분선 + Profile / Logout */}
                            <div className="border-t border-gray-100 mt-2 pt-2 space-y-1">
                                <Link
                                    to="/profile"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${location.pathname === '/profile'
                                        ? 'bg-primary-50 text-primary-700 font-medium'
                                        : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    <FiUser className="text-xl" />
                                    <span>Profile</span>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <FiLogOut className="text-xl" />
                                    <span>Logout</span>
                                </button>
                            </div>
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
                <div className="container-app py-6 space-y-2">
                    <p className="text-center text-sm text-gray-500">
                        © 2026 Korea Trip Planner. Made with ❤️ for family adventures.
                    </p>
                    <p className="text-center text-xs text-gray-400 font-mono">
                        v{packageJson.version}
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default Layout;
