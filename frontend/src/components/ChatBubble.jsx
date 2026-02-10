import React from 'react';
import { FiUser, FiMessageCircle } from 'react-icons/fi';

const ChatBubble = ({ message, isOwnMessage, translatedText, onToggleTranslation, showTranslation }) => {
    const isAIBot = message.is_ai_bot;

    return (
        <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end max-w-[70%] gap-2`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isAIBot
                    ? 'bg-purple-500'
                    : isOwnMessage
                        ? 'bg-primary-500'
                        : 'bg-gray-400'
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
                    <span className="text-xs text-gray-500 mb-1 px-2">
                        {message.sender_name}
                    </span>

                    {/* Message Bubble */}
                    <div
                        className={`rounded-2xl px-4 py-2 ${isAIBot
                            ? 'bg-purple-100 text-purple-900 border-2 border-purple-300'
                            : isOwnMessage
                                ? 'bg-primary-500 text-white'
                                : 'bg-gray-200 text-gray-900'
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
