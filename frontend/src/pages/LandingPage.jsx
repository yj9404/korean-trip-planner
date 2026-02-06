import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMap, FiGlobe, FiCompass, FiUsers, FiArrowRight } from 'react-icons/fi';

const LandingPage = () => {
    const navigate = useNavigate();

    const features = [
        {
            icon: FiGlobe,
            title: 'Real-time Translation',
            description: 'Communicate seamlessly with AI-powered translation between Korean and English',
            color: 'from-blue-500 to-cyan-500',
        },
        {
            icon: FiCompass,
            title: 'AI Travel Guide',
            description: 'Get personalized recommendations and insider tips from our AI assistant',
            color: 'from-purple-500 to-pink-500',
        },
        {
            icon: FiMap,
            title: 'Trip Planning',
            description: 'Plan and organize your Korea adventure with collaborative tools',
            color: 'from-green-500 to-emerald-500',
        },
        {
            icon: FiUsers,
            title: 'Family Sharing',
            description: 'Share itineraries and collaborate with family members in real-time',
            color: 'from-orange-500 to-red-500',
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50">
            {/* Hero Section */}
            <header className="container-app py-6">
                <nav className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg">
                            <FiMap className="text-white text-2xl" />
                        </div>
                        <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                            Korea Trip Planner
                        </span>
                    </div>
                    <Link
                        to="/login"
                        className="btn-primary"
                    >
                        Get Started
                    </Link>
                </nav>
            </header>

            {/* Hero Content */}
            <section className="container-app py-20 sm:py-32">
                <div className="text-center max-w-4xl mx-auto">
                    <h1 className="text-5xl sm:text-7xl font-bold mb-6 animate-fade-in">
                        <span className="bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                            Plan Your Perfect
                        </span>
                        <br />
                        <span className="text-gray-900">Korea Adventure</span>
                    </h1>
                    <p className="text-xl sm:text-2xl text-gray-600 mb-12 max-w-2xl mx-auto animate-slide-up">
                        AI-powered travel planner designed for families exploring Korea together.
                        Real-time translation, personalized guides, and collaborative planning.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up animation-delay-200">
                        <button
                            onClick={() => navigate('/login')}
                            className="btn-primary text-lg px-8 py-4 flex items-center justify-center space-x-2"
                        >
                            <span>Start Planning</span>
                            <FiArrowRight className="text-xl" />
                        </button>
                        <button className="btn-outline text-lg px-8 py-4">
                            Learn More
                        </button>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="container-app py-20">
                <div className="text-center mb-16">
                    <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
                        Everything You Need
                    </h2>
                    <p className="text-xl text-gray-600">
                        Powerful features to make your Korea trip unforgettable
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {features.map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                            <div
                                key={index}
                                className="card group hover:scale-105 transition-transform duration-300 animate-slide-up"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="card-body">
                                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl transition-shadow`}>
                                        <Icon className="text-white text-3xl" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                        {feature.title}
                                    </h3>
                                    <p className="text-gray-600">
                                        {feature.description}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* CTA Section */}
            <section className="container-app py-20">
                <div className="bg-gradient-to-br from-primary-600 to-purple-700 rounded-3xl shadow-2xl p-12 text-center text-white">
                    <h2 className="text-4xl sm:text-5xl font-bold mb-6">
                        Ready to Explore Korea?
                    </h2>
                    <p className="text-xl mb-8 max-w-2xl mx-auto text-primary-100">
                        Join families who are already planning their perfect Korean adventure with AI assistance
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="bg-white text-primary-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl"
                    >
                        Get Started Free
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="container-app py-12 border-t border-gray-200">
                <p className="text-center text-gray-500">
                    © 2026 Korea Trip Planner. Made with ❤️ for family adventures.
                </p>
            </footer>
        </div>
    );
};

export default LandingPage;
