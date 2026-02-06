import React, { useState } from 'react';
import { apiService } from '../services/api';
import { FiCompass, FiSend, FiMapPin, FiCalendar } from 'react-icons/fi';

const AIGuidePage = () => {
    const [query, setQuery] = useState('');
    const [language, setLanguage] = useState('en');
    const [location, setLocation] = useState('');
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);

    const sampleQueries = [
        'What are the best places to visit in Seoul?',
        'Recommend family-friendly restaurants in Busan',
        'What should I know about Korean dining etiquette?',
        'Best time to visit Jeju Island?',
        'Traditional Korean dishes I must try',
        'How to use public transportation in Seoul?',
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);

        // Add user message to chat
        const userMessage = { role: 'user', content: query };
        setChatHistory([...chatHistory, userMessage]);

        try {
            const result = await apiService.getAIGuide(
                query,
                language,
                location || null
            );

            setResponse(result);

            // Add AI response to chat
            const aiMessage = { role: 'assistant', content: result.response };
            setChatHistory([...chatHistory, userMessage, aiMessage]);

            setQuery('');
        } catch (error) {
            console.error('AI guide error:', error);
            alert('Failed to get AI guidance. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                    <FiCompass className="text-white text-3xl" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                    AI Travel Guide
                </h1>
                <p className="text-lg text-gray-600">
                    Get personalized Korea travel recommendations powered by Google Gemini
                </p>
            </div>

            {/* Settings */}
            <div className="card">
                <div className="card-body">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <FiMapPin className="inline mr-2" />
                                Location (optional)
                            </label>
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="input"
                                placeholder="e.g., Seoul, Busan, Jeju"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Response Language
                            </label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="input"
                            >
                                <option value="en">English</option>
                                <option value="ko">한국어 (Korean)</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Interface */}
            <div className="card">
                <div className="card-body">
                    {/* Chat History */}
                    {chatHistory.length > 0 && (
                        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                            {chatHistory.map((message, index) => (
                                <div
                                    key={index}
                                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-3xl rounded-2xl px-6 py-4 ${message.role === 'user'
                                                ? 'bg-primary-600 text-white'
                                                : 'bg-gray-100 text-gray-900'
                                            }`}
                                    >
                                        <p className="whitespace-pre-wrap">{message.content}</p>
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-100 rounded-2xl px-6 py-4">
                                        <div className="flex space-x-2">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Input Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Ask me anything about traveling in Korea
                            </label>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="input flex-1"
                                    placeholder="e.g., What are the best restaurants in Gangnam?"
                                    disabled={loading}
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !query.trim()}
                                    className="btn-primary flex items-center space-x-2 px-6"
                                >
                                    <FiSend />
                                    <span className="hidden sm:inline">Ask</span>
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Sample Queries */}
            {chatHistory.length === 0 && (
                <div className="card">
                    <div className="card-body">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Try asking about...
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {sampleQueries.map((sample) => (
                                <button
                                    key={sample}
                                    onClick={() => setQuery(sample)}
                                    className="p-4 text-left border border-gray-200 rounded-lg hover:bg-primary-50 hover:border-primary-300 transition-colors group"
                                >
                                    <p className="text-sm text-gray-700 group-hover:text-primary-700">
                                        {sample}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIGuidePage;
