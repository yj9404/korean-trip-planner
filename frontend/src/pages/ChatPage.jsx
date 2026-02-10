import React, { useState, useEffect, useRef } from 'react';
import { FiSend, FiMessageCircle, FiMessageSquare } from 'react-icons/fi';
import ChatBubble from '../components/ChatBubble';
import Loading from '../components/Loading';
import {
    getUserChatRooms,
    createChatRoom,
    sendMessage,
    subscribeToMessages,
    getUserPreferences,
    updateUserPreferences,
    translateMessage
} from '../services/chatService';

const ChatPage = ({ user }) => {
    const [rooms, setRooms] = useState([]);
    const [currentRoomId, setCurrentRoomId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [preferences, setPreferences] = useState({
        preferred_lang: 'en',
        ai_bot_enabled: true
    });
    const [translations, setTranslations] = useState({});
    const [showTranslations, setShowTranslations] = useState({});
    const messagesEndRef = useRef(null);

    // Load user preferences
    useEffect(() => {
        const loadPreferences = async () => {
            try {
                const prefs = await getUserPreferences(user.uid);
                setPreferences(prefs);
            } catch (error) {
                console.error('Error loading preferences:', error);
            }
        };

        loadPreferences();
    }, [user.uid]);

    // Load chat rooms
    useEffect(() => {
        const loadChatRooms = async () => {
            setLoading(true);
            try {
                const userRooms = await getUserChatRooms(user.uid);
                setRooms(userRooms);

                // If no rooms exist, create a default one
                if (userRooms.length === 0) {
                    const newRoom = await createChatRoom('default-trip', [user.uid]);
                    setRooms([newRoom]);
                    setCurrentRoomId(newRoom.id);
                } else {
                    setCurrentRoomId(userRooms[0].id);
                }
            } catch (error) {
                console.error('Error loading chat rooms:', error);
            } finally {
                setLoading(false);
            }
        };

        loadChatRooms();
    }, [user.uid]);

    // Subscribe to messages
    useEffect(() => {
        if (!currentRoomId) return;

        const unsubscribe = subscribeToMessages(
            currentRoomId,
            (newMessages) => {
                setMessages(newMessages);
                scrollToBottom();
            },
            (error) => {
                console.error('Message subscription error:', error);
            }
        );

        return () => unsubscribe();
    }, [currentRoomId]);

    // Auto-translate messages (batch update so we don't overwrite previous translations)
    useEffect(() => {
        const translateMessages = async () => {
            const updates = {};
            for (const msg of messages) {
                if (msg.is_ai_bot || !msg.original_lang) continue;
                if (msg.original_lang === preferences.preferred_lang) continue;
                if (translations[msg.id]) continue; // 이미 번역된 메시지는 스킵

                try {
                    const result = await translateMessage(
                        msg.text,
                        msg.original_lang,
                        preferences.preferred_lang
                    );
                    const translated = result?.translated?.trim();

                    if (translated) {
                        updates[msg.id] = translated;
                    }
                } catch (error) {
                    console.error('Translation error:', error);
                }
            }
            if (Object.keys(updates).length > 0) {
                setTranslations(prev => ({ ...prev, ...updates }));
            }
        };

        if (messages.length > 0) {
            translateMessages();
        }
    }, [messages, preferences.preferred_lang]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending || !currentRoomId) return;

        setSending(true);
        try {
            // Auto-detect language (simple logic: if contains Hangul -> ko, else -> en)
            const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(newMessage);
            const detectedLang = hasKorean ? 'ko' : 'en';

            await sendMessage(currentRoomId, {
                text: newMessage.trim(),
                sender_id: user.uid,
                sender_name: preferences.english_name || user.displayName || user.email,
                original_lang: detectedLang
            });

            setNewMessage('');
            scrollToBottom();
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        } finally {
            setSending(false);
        }
    };

    const handleToggleAIBot = async () => {
        try {
            const updated = await updateUserPreferences(user.uid, {
                ai_bot_enabled: !preferences.ai_bot_enabled
            });
            setPreferences(updated);
        } catch (error) {
            console.error('Error toggling AI bot:', error);
        }
    };

    const toggleTranslation = (messageId) => {
        setShowTranslations(prev => ({
            ...prev,
            [messageId]: !prev[messageId]
        }));
    };

    if (loading) {
        return <Loading />;
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <FiMessageSquare className="text-3xl text-primary-500" />
                        <h1 className="text-2xl font-bold text-gray-900">AI Translation Chat</h1>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-4">
                    <button
                        onClick={handleToggleAIBot}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-colors ${preferences.ai_bot_enabled
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-300 bg-gray-50 text-gray-400'
                            }`}
                    >
                        <FiMessageCircle className="text-lg" />
                        <span className="text-sm font-medium">
                            AI Bot {preferences.ai_bot_enabled ? 'ON' : 'OFF'}
                        </span>
                    </button>

                    <div className="text-sm text-gray-500 ml-auto">
                        Messages auto-translate to your language
                    </div>
                </div>
            </div>

            {/* Chat Container */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden flex flex-col" style={{ height: '600px' }}>
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-2">
                    {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            <div className="text-center">
                                <FiMessageSquare className="text-6xl mx-auto mb-4 opacity-20" />
                                <p>No messages yet. Start the conversation!</p>
                            </div>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <ChatBubble
                                key={msg.id}
                                message={msg}
                                isOwnMessage={msg.sender_id === user.uid}
                                translatedText={translations[msg.id]}
                                showTranslation={showTranslations[msg.id]}
                                onToggleTranslation={() => toggleTranslation(msg.id)}
                            />
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={`Type a message in ${preferences.preferred_lang === 'ko' ? 'Korean' : 'English'}...`}
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            disabled={sending}
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || sending}
                            className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                        >
                            <FiSend />
                            <span>{sending ? 'Sending...' : 'Send'}</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChatPage;
