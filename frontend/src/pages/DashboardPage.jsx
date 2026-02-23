import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiMap, FiMessageSquare, FiCompass, FiGlobe, FiRefreshCw, FiDollarSign } from 'react-icons/fi';

// KRW → USD Currency Calculator
const CurrencyCalculator = () => {
    const [krw, setKrw] = useState('');
    const [rate, setRate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchRate = async () => {
        setLoading(true);
        setError(false);
        try {
            const res = await fetch('https://open.er-api.com/v6/latest/USD');
            const data = await res.json();
            if (data.result === 'success') {
                setRate(data.rates.KRW); // KRW per 1 USD
                setLastUpdated(new Date().toLocaleTimeString());
            } else {
                setError(true);
            }
        } catch (e) {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRate(); }, []);

    const usd = rate && krw ? (parseFloat(krw.replace(/,/g, '')) / rate).toFixed(2) : null;
    const displayUsd = usd && !isNaN(usd) ? parseFloat(usd).toLocaleString('en-US', { minimumFractionDigits: 2 }) : null;

    const handleInput = (e) => {
        // Allow digits and commas only
        const raw = e.target.value.replace(/[^0-9]/g, '');
        setKrw(raw ? parseInt(raw, 10).toLocaleString('ko-KR') : '');
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow">
                        <FiDollarSign className="text-white text-lg" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-gray-800">Currency Calculator</h2>
                        <p className="text-xs text-gray-400">Korean Won → US Dollar</p>
                    </div>
                </div>
                <button
                    onClick={fetchRate}
                    disabled={loading}
                    className="text-gray-400 hover:text-emerald-500 transition-colors disabled:opacity-40"
                    title="Refresh rate"
                >
                    <FiRefreshCw className={`text-lg ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {error ? (
                <p className="text-sm text-red-400 text-center py-2">Failed to load exchange rate. Please refresh.</p>
            ) : (
                <>
                    <div className="flex items-center gap-3">
                        {/* KRW Input */}
                        <div className="flex-1 relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₩</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={krw}
                                onChange={handleInput}
                                placeholder="0"
                                className="w-full pl-8 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-right text-lg font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                            />
                        </div>

                        <span className="text-gray-400 font-bold text-lg shrink-0">=</span>

                        {/* USD Result */}
                        <div className="flex-1 relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                            <div className="w-full pl-8 pr-3 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-right text-lg font-bold text-emerald-700">
                                {loading ? (
                                    <span className="text-gray-400 font-normal text-sm">Loading...</span>
                                ) : (
                                    displayUsd ?? <span className="text-gray-300 font-normal">0.00</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {rate && !loading && (
                        <p className="text-xs text-gray-400 mt-2 text-right">
                            1 USD = ₩{Math.round(rate).toLocaleString('ko-KR')} &nbsp;·&nbsp; Updated {lastUpdated}
                        </p>
                    )}
                </>
            )}
        </div>
    );
};

const DashboardPage = ({ user }) => {
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

            {/* Currency Calculator */}
            <CurrencyCalculator />

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
