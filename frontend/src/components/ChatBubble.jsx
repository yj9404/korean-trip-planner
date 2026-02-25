import React from 'react';
import { FiUser, FiMessageCircle } from 'react-icons/fi';

// 사용자 고유 색상을 만들기 위한 해시 함수 및 색상 배열
const COLORS = [
    'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
    'bg-red-500', 'bg-pink-500', 'bg-indigo-500',
    'bg-teal-500', 'bg-orange-500', 'bg-cyan-500',
    'bg-rose-500', 'bg-emerald-500', 'bg-fuchsia-500'
];

const TEXT_COLORS = [
    'text-blue-600', 'text-green-600', 'text-yellow-600',
    'text-red-600', 'text-pink-600', 'text-indigo-600',
    'text-teal-600', 'text-orange-600', 'text-cyan-600',
    'text-rose-600', 'text-emerald-600', 'text-fuchsia-600'
];

const getHashIndex = (str) => {
    let hash = 0;
    if (!str || str.length === 0) return 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % COLORS.length;
};

const ChatBubble = ({ message, isOwnMessage, translatedText, onToggleTranslation, showTranslation }) => {
    const isAIBot = message.is_ai_bot;
    const colorIndex = getHashIndex(message.sender_id);
    const userBgColor = COLORS[colorIndex];
    const userTextColor = TEXT_COLORS[colorIndex];

    return (
        <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end max-w-[70%] gap-2`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isAIBot ? 'bg-purple-500'
                        : isOwnMessage ? 'bg-primary-500'
                            : userBgColor
                    }`}>
                    {isAIBot ? (
                        <FiMessageCircle className="text-white text-sm" />
                    ) : (
                        <FiUser className="text-white text-sm" />
                    )}
                </div>

                {/* Message Content */}
                <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                    {/* Sender Name */}
                    <span className={`text-xs mb-1 px-2 font-medium ${isOwnMessage ? 'text-gray-500' : userTextColor}`}>
                        {message.sender_name}
                    </span>

                    {/* Message Bubble */}
                    <div
                        className={`rounded-2xl px-4 py-2 ${isAIBot
                            ? 'bg-purple-100 text-purple-900 border-2 border-purple-300'
                            : isOwnMessage
                                ? 'bg-primary-500 text-white'
                                : 'bg-gray-100 text-gray-900 shadow-sm border border-gray-200'
                            }`}
                    >
                        <p className="text-sm whitespace-pre-wrap break-words">
                            {message.text}
                        </p>

                        {/* Translation Toggle */}
                        {translatedText && !isAIBot && (
                            <div className="mt-2 pt-2 border-t border-opacity-30 border-current">
                                <button
                                    onClick={onToggleTranslation}
                                    className="text-xs underline opacity-75 hover:opacity-100"
                                >
                                    {showTranslation ? 'Hide translation' : 'Show translation'}
                                </button>
                                {showTranslation && (
                                    <p className="text-xs mt-1 opacity-90 italic">
                                        {translatedText}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Timestamp */}
                    <span className="text-xs text-gray-400 mt-1 px-2">
                        {message.timestamp
                            ? new Date(message.timestamp).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                            })
                            : 'Sending...'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ChatBubble;
