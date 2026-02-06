import React, { useState } from 'react';
import { apiService } from '../services/api';
import { FiArrowRight, FiGlobe } from 'react-icons/fi';

const TranslatePage = () => {
    const [sourceText, setSourceText] = useState('');
    const [translatedText, setTranslatedText] = useState('');
    const [sourceLang, setSourceLang] = useState('auto');
    const [targetLang, setTargetLang] = useState('en');
    const [loading, setLoading] = useState(false);

    const languages = [
        { code: 'auto', name: 'Auto-detect' },
        { code: 'ko', name: '한국어 (Korean)' },
        { code: 'en', name: 'English' },
        { code: 'ja', name: '日本語 (Japanese)' },
        { code: 'zh', name: '中文 (Chinese)' },
    ];

    const handleTranslate = async () => {
        if (!sourceText.trim()) return;

        setLoading(true);
        try {
            const result = await apiService.translate(
                sourceText,
                sourceLang,
                targetLang
            );
            setTranslatedText(result.translated_text);
        } catch (error) {
            console.error('Translation error:', error);
            alert('Translation failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSwapLanguages = () => {
        if (sourceLang !== 'auto') {
            setSourceLang(targetLang);
            setTargetLang(sourceLang);
            setSourceText(translatedText);
            setTranslatedText(sourceText);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                    <FiGlobe className="text-white text-3xl" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                    AI Translation
                </h1>
                <p className="text-lg text-gray-600">
                    Powered by Google Gemini for accurate, context-aware translations
                </p>
            </div>

            {/* Translation Interface */}
            <div className="card">
                <div className="card-body">
                    {/* Language Selectors */}
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <select
                            value={sourceLang}
                            onChange={(e) => setSourceLang(e.target.value)}
                            className="input max-w-xs"
                        >
                            {languages.map((lang) => (
                                <option key={lang.code} value={lang.code}>
                                    {lang.name}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={handleSwapLanguages}
                            disabled={sourceLang === 'auto'}
                            className="p-3 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                        >
                            <FiArrowRight className="text-xl text-gray-600 transform rotate-180" />
                        </button>

                        <select
                            value={targetLang}
                            onChange={(e) => setTargetLang(e.target.value)}
                            className="input max-w-xs"
                        >
                            {languages.filter((l) => l.code !== 'auto').map((lang) => (
                                <option key={lang.code} value={lang.code}>
                                    {lang.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Translation Boxes */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Source Text */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Source Text
                            </label>
                            <textarea
                                value={sourceText}
                                onChange={(e) => setSourceText(e.target.value)}
                                className="input h-64 resize-none font-mono"
                                placeholder="Enter text to translate..."
                            />
                            <p className="text-sm text-gray-500 mt-2">
                                {sourceText.length} characters
                            </p>
                        </div>

                        {/* Translated Text */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Translation
                            </label>
                            <div className="relative">
                                <textarea
                                    value={translatedText}
                                    readOnly
                                    className="input h-64 resize-none font-mono bg-gray-50"
                                    placeholder="Translation will appear here..."
                                />
                                {loading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                                        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 mt-2">
                                {translatedText.length} characters
                            </p>
                        </div>
                    </div>

                    {/* Translate Button */}
                    <div className="mt-6">
                        <button
                            onClick={handleTranslate}
                            disabled={loading || !sourceText.trim()}
                            className="btn-primary w-full lg:w-auto px-12"
                        >
                            {loading ? 'Translating...' : 'Translate'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Phrases */}
            <div className="card">
                <div className="card-body">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Phrases</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {[
                            'Hello',
                            'Thank you',
                            'Where is the bathroom?',
                            'How much does this cost?',
                            'Can you help me?',
                            'I don\'t speak Korean',
                        ].map((phrase) => (
                            <button
                                key={phrase}
                                onClick={() => setSourceText(phrase)}
                                className="p-3 text-left border border-gray-200 rounded-lg hover:bg-primary-50 hover:border-primary-300 transition-colors"
                            >
                                <span className="text-sm text-gray-700">{phrase}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TranslatePage;
