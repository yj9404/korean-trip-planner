import React from 'react';
import { FiUser, FiMessageCircle } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';

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

const getHashIndex = (userId, userName) => {
    const str = `${userId || ''}_${userName || ''}`;
    let hash = 0;
    if (str.length === 0) return 0;

    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        // 소수(prime)를 활용한 약간 변형된 널리 쓰이는 해시 알고리즘 (DJB2 변형 등)
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 32-bit int 변환
    }

    // 약간의 salt 연산을 추가하여 충돌 확률을 줄임
    hash = Math.abs(hash ^ 0x5bf03635);

    return hash % COLORS.length;
};

const ChatBubble = ({ message, isOwnMessage, translatedText, onToggleTranslation, showTranslation }) => {
    const isAIBot = message.is_ai_bot;
    // sender_id와 sender_name을 조합해서 해시를 만들면 기존 채팅과 새 채팅 모두 충돌 확률이 현저히 낮아짐
    const colorIndex = getHashIndex(message.sender_id, message.sender_name);
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
                        {isAIBot ? (
                            <div className="text-sm prose prose-sm max-w-none prose-p:leading-relaxed prose-headings:text-purple-900 prose-p:text-purple-900 prose-strong:text-purple-900 prose-ul:text-purple-900 prose-li:text-purple-900 prose-a:text-purple-700 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 break-words">
                                <ReactMarkdown>{message.text}</ReactMarkdown>
                            </div>
                        ) : (
                            <p className="text-sm whitespace-pre-wrap break-words">
                                {message.text}
                            </p>
                        )}

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
