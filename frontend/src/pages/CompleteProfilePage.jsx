import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { FiUser, FiX, FiGlobe, FiMessageCircle } from 'react-icons/fi';
import Loading from '../components/Loading';

const CompleteProfilePage = ({ user }) => {
    const [koreanName, setKoreanName] = useState('');
    const [englishName, setEnglishName] = useState('');
    const [preferredLang, setPreferredLang] = useState('en');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const checkProfile = async () => {
            if (!user) return;
            try {
                const prefsDoc = await getDoc(doc(db, 'user_preferences', user.uid));
                if (prefsDoc.exists()) {
                    const data = prefsDoc.data();
                    // 이미 프로필이 완성된 경우 대시보드로 이동
                    if (data.korean_name && data.english_name) {
                        navigate('/dashboard');
                        return;
                    }
                    // 일부 정보가 있으면 채워넣기
                    if (data.korean_name) setKoreanName(data.korean_name);
                    if (data.english_name) setEnglishName(data.english_name);
                    if (data.preferred_lang) setPreferredLang(data.preferred_lang);
                }
                setLoading(false);
            } catch (err) {
                console.error('Error checking profile:', err);
                setLoading(false);
            }
        };
        checkProfile();
    }, [user, navigate]);

    const handleProfileSetupSubmit = async (e) => {
        e.preventDefault();
        setError('');
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

            // Save/Update preferences to Firestore
            await setDoc(doc(db, 'user_preferences', user.uid), {
                user_id: user.uid,
                korean_name: koreanName,
                english_name: englishName,
                preferred_lang: preferredLang,
                ai_bot_enabled: true, // Default to true
                display_name: displayName
            }, { merge: true });

            const code = sessionStorage.getItem('pendingInviteCode');
            if (code) {
                sessionStorage.removeItem('pendingInviteCode');
                navigate(`/join/${code}`);
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/');
    };

    if (loading) return <Loading />;

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
                        <FiUser className="text-white text-4xl" />
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                        Complete Your Profile
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Welcome, {user?.email}! Tell us a bit more about yourself.
                    </p>
                </div>

                <div className="card animate-slide-up relative">
                    <div className="card-body">
                        <button
                            onClick={handleLogout}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                            title="Sign out"
                        >
                            <FiX className="text-xl" />
                        </button>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleProfileSetupSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Korean Name (한국어 이름) <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                                </label>
                                <div className="relative">
                                    <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={koreanName}
                                        onChange={(e) => setKoreanName(e.target.value)}
                                        className="input pl-10"
                                        placeholder="홍길동"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    English Name *
                                </label>
                                <div className="relative">
                                    <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={englishName}
                                        onChange={(e) => setEnglishName(e.target.value)}
                                        className="input pl-10"
                                        placeholder="John Doe"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Preferred Language *
                                </label>
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
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="btn-primary w-full"
                            >
                                {saving ? 'Saving...' : 'Complete Setup'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompleteProfilePage;
