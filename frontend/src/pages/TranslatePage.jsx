import React, { useState } from 'react';
import { apiService } from '../services/api';
import { FiGlobe, FiVolume2 } from 'react-icons/fi';
import { MdSwapHoriz } from 'react-icons/md';

const TranslatePage = () => {
    const [sourceText, setSourceText] = useState('');
    const [translatedText, setTranslatedText] = useState('');
    const [pronunciation, setPronunciation] = useState('');
    const [sourceLang, setSourceLang] = useState('auto');
    const [targetLang, setTargetLang] = useState('ko');
    const [loading, setLoading] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

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
        setPronunciation('');
        try {
            const result = await apiService.translate(
                sourceText,
                sourceLang,
                targetLang
            );
            setTranslatedText(result.translated_text);
            setPronunciation(result.pronunciation || '');
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
            setPronunciation('');
        }
    };

    // Web Speech API TTS — always reads the Korean translated text
    const handleReadAloud = () => {
        if (!translatedText || !window.speechSynthesis) return;

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(translatedText);
        utterance.lang = 'ko-KR';
        utterance.rate = 0.85;  // Slightly slow for travellers
        utterance.pitch = 1;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
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
                            className="p-3 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-40 text-gray-500 hover:text-primary-600"
                            title="Swap languages"
                        >
                            <MdSwapHoriz className="text-2xl" />
                        </button>

                        <select
                            value={targetLang}
                            onChange={(e) => { setTargetLang(e.target.value); setPronunciation(''); }}
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
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 items-start">
                        {/* Source Text */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Source Text
                            </label>
                            <textarea
                                value={sourceText}
                                onChange={(e) => setSourceText(e.target.value)}
                                className="input h-48 resize-none font-mono"
                                placeholder="Enter text to translate..."
                            />
                            <p className="text-sm text-gray-500 mt-2">
                                {sourceText.length} characters
                            </p>
                        </div>

                        {/* Middle Translate Button (Desktop) & Mobile Button */}
                        <div className="flex lg:flex-col items-center justify-center lg:pt-8 gap-4">
                            <button
                                onClick={handleTranslate}
                                disabled={loading || !sourceText.trim()}
                                className="btn-primary flex-1 lg:flex-none py-4 px-8 shadow-lg hover:scale-105 transition-transform disabled:scale-100"
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Translating...</span>
                                    </div>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        Translate
                                        <span className="hidden lg:inline">→</span>
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Translated Text */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Translation
                                </label>
                                {/* Speaker Button */}
                                {translatedText && targetLang === 'ko' && (
                                    <button
                                        onClick={handleReadAloud}
                                        disabled={isSpeaking}
                                        title="Read aloud (Korean)"
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                                            ${isSpeaking
                                                ? 'bg-green-100 text-green-700 cursor-default shadow-inner'
                                                : 'bg-gray-100 hover:bg-green-100 text-gray-600 hover:text-green-700 hover:shadow-sm'
                                            }`}
                                    >
                                        <FiVolume2 className={isSpeaking ? 'animate-pulse text-green-600' : ''} />
                                        {isSpeaking ? 'Playing...' : 'Read Aloud'}
                                    </button>
                                )}
                            </div>

                            <div className="relative">
                                <textarea
                                    value={translatedText}
                                    readOnly
                                    className="input h-48 resize-none font-mono bg-gray-50"
                                    placeholder="Translation will appear here..."
                                />
                                {loading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-[1px] rounded-lg">
                                        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </div>

                            {/* Pronunciation Guide */}
                            {pronunciation && (
                                <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100 animate-fade-in">
                                    <p className="text-sm font-semibold text-emerald-800 mb-0.5">Pronunciation</p>
                                    <p className="text-sm text-emerald-600 italic leading-relaxed">
                                        {pronunciation}
                                    </p>
                                </div>
                            )}

                            <p className="text-sm text-gray-500 mt-1">
                                {translatedText.length} characters
                            </p>
                        </div>
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
                            "I don't speak Korean",
                        ].map((phrase) => (
                            <button
                                key={phrase}
                                onClick={() => { setSourceText(phrase); setPronunciation(''); setTranslatedText(''); }}
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
