import React, { useState, useEffect } from 'react';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { FiUser, FiSave, FiGlobe, FiMessageCircle } from 'react-icons/fi';
import Loading from '../components/Loading';

const ProfilePage = ({ user }) => {
    const [koreanName, setKoreanName] = useState('');
    const [englishName, setEnglishName] = useState('');
    const [preferredLang, setPreferredLang] = useState('en');
    const [aiBotEnabled, setAiBotEnabled] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const loadProfile = async () => {
            setLoading(true);
            try {
                const prefsDoc = await getDoc(doc(db, 'user_preferences', user.uid));

                if (prefsDoc.exists()) {
                    const data = prefsDoc.data();
                    setKoreanName(data.korean_name || '');
                    setEnglishName(data.english_name || '');
                    setPreferredLang(data.preferred_lang || 'en');
                    setAiBotEnabled(data.ai_bot_enabled ?? true);
                } else {
                    // Create default preferences if they don't exist
                    const defaultPrefs = {
                        user_id: user.uid,
                        korean_name: '',
                        english_name: user.displayName || '',
                        preferred_lang: 'en',
                        ai_bot_enabled: true,
                        display_name: user.displayName || user.email
                    };
                    await updateDoc(doc(db, 'user_preferences', user.uid), defaultPrefs);
                    setEnglishName(defaultPrefs.english_name);
                }
            } catch (err) {
                console.error('Error loading profile:', err);
                setError('Failed to load profile. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            loadProfile();
        }
    }, [user]);

    const handleSave = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSaving(true);

        try {
            if (!englishName.trim()) {
                setError('Please enter your English name');
                setSaving(false);
                return;
            }

            const displayName = englishName;

            // Update Firebase Auth profile
            await updateProfile(user, { displayName });

            // Update Firestore preferences
            await updateDoc(doc(db, 'user_preferences', user.uid), {
                korean_name: koreanName,
                english_name: englishName,
                preferred_lang: preferredLang,
                ai_bot_enabled: aiBotEnabled,
                display_name: displayName
            });

            setSuccess('Profile updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Error saving profile:', err);
            setError('Failed to save profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <Loading />;
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div className="flex items-center space-x-3 mb-6">
                    <FiUser className="text-3xl text-primary-500" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
                        <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
                        {success}
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-6">
                    {/* Names Section */}
                    <div className="border-b border-gray-200 pb-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <FiUser className="mr-2" />
                            Names
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Korean Name (한국어 이름) <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={koreanName}
                                    onChange={(e) => setKoreanName(e.target.value)}
                                    className="input"
                                    placeholder="홍길동"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    English Name *
                                </label>
                                <input
                                    type="text"
                                    value={englishName}
                                    onChange={(e) => setEnglishName(e.target.value)}
                                    className="input"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Language Preference */}
                    <div className="border-b border-gray-200 pb-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <FiGlobe className="mr-2" />
                            Language Preference
                        </h2>

                        <div className="flex space-x-4">
                            <button
                                type="button"
                                onClick={() => setPreferredLang('ko')}
                                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${preferredLang === 'ko'
                                    ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                            >
                                🇰🇷 한국어
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreferredLang('en')}
                                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${preferredLang === 'en'
                                    ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                            >
                                🇺🇸 English
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                            Chat messages will be shown in this language.
                        </p>
                    </div>

                    {/* AI Bot Settings */}
                    <div className="pb-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <FiMessageCircle className="mr-2" />
                            AI Bot Settings
                        </h2>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <p className="font-medium text-gray-900">Enable AI Bot Explanations</p>
                                <p className="text-sm text-gray-500">
                                    Get automatic explanations for Korean food, places, and culture in chat
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAiBotEnabled(!aiBotEnabled)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${aiBotEnabled ? 'bg-primary-500' : 'bg-gray-300'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${aiBotEnabled ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Save Button */}
                    <button
                        type="submit"
                        disabled={saving}
                        className="btn-primary w-full flex items-center justify-center space-x-2"
                    >
                        <FiSave />
                        <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                </form>
            </div>

            {/* Account Info */}
            <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium text-gray-900">{user.email}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">User ID:</span>
                        <span className="font-mono text-xs text-gray-500">{user.uid}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Current Display Name:</span>
                        <span className="font-medium text-gray-900">
                            {preferredLang === 'ko' ? koreanName || 'Not set' : englishName || 'Not set'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
