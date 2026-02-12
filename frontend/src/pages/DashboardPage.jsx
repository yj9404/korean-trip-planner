import React from 'react';
import { Link } from 'react-router-dom';
import { FiMap, FiMessageSquare, FiCompass, FiGlobe } from 'react-icons/fi';

const DashboardPage = ({ user }) => {
    // No state needed for now if we are just showing links

    const features = [
        {
            to: '/itinerary',
            icon: FiMap,
            label: 'Itinerary',
            description: 'View and manage your travel plan',
            color: 'from-blue-500 to-cyan-500'
        },
        {
            to: '/chat',
            icon: FiMessageSquare,
            label: 'Group Chat',
            description: 'Chat with family & AI assistant',
            color: 'from-purple-500 to-pink-500'
        },
        {
            to: '/ai-guide',
            icon: FiCompass,
            label: 'AI Guide',
            description: 'Get instant travel recommendations',
            color: 'from-amber-500 to-orange-500'
        },
        {
            to: '/translate',
            icon: FiGlobe,
            label: 'Translation',
            description: 'Real-time Korean-English translation',
            color: 'from-green-500 to-emerald-500'
        }
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Welcome Section */}
            <div className="bg-gradient-to-br from-primary-600 to-purple-700 rounded-2xl p-8 text-white shadow-xl">
                <h1 className="text-3xl sm:text-4xl font-bold mb-2">
                    Welcome back, {user?.displayName || 'Explorer'}! 👋
                </h1>
                <p className="text-primary-100 text-lg">
                    Ready to explore Korea?
                </p>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {features.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                        <Link
                            key={index}
                            to={feature.to}
                            className="card group hover:scale-[1.02] transition-transform duration-300"
                        >
                            <div className="card-body flex items-center p-6">
                                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow flex-shrink-0 mr-6`}>
                                    <Icon className="text-white text-3xl" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                                        {feature.label}
                                    </h3>
                                    <p className="text-gray-600">
                                        {feature.description}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default DashboardPage;
