import React from 'react';

const LanguageToggle = ({ currentLang, onToggle, className = '' }) => {
    return (
        <button
            onClick={onToggle}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-colors ${className} ${currentLang === 'ko'
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-blue-500 bg-blue-50 text-blue-700'
                }`}
            title="Toggle language preference"
        >
            <span className={`text-sm font-bold ${currentLang === 'ko' ? 'scale-110' : 'opacity-50'}`}>
                🇰🇷 KO
            </span>
            <span className="text-gray-400">|</span>
            <span className={`text-sm font-bold ${currentLang === 'en' ? 'scale-110' : 'opacity-50'}`}>
                🇺🇸 EN
            </span>
        </button>
    );
};

export default LanguageToggle;
