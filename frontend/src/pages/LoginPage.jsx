import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    GoogleAuthProvider,
    updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { FiMail, FiLock, FiMap, FiUser, FiX } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';

// WebView(카카오, 인스타 등 인앱 브라우저) 감지
// signInWithPopup은 WebView에서 Google 정책으로 막히므로, WebView일 때만 redirect 사용
const isWebView = () => {
    const ua = navigator.userAgent;
    return /KAKAOTALK|Line|NAVER|Instagram|FB_IAB|FBAN|Twitter|wv|WebView/i.test(ua)
        || (ua.includes('Android') && ua.includes('wv'));
};

const getFriendlyErrorMessage = (error) => {
    switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            return '이메일 또는 비밀번호가 올바르지 않습니다. (Invalid credentials)';
        case 'auth/email-already-in-use':
            return '이미 사용 중인 이메일입니다. (Email already in use)';
        case 'auth/weak-password':
            return '비밀번호는 최소 6자리 이상이어야 합니다. (Password must be 6+ chars)';
        case 'auth/invalid-email':
            return '유효하지 않은 이메일 형식입니다. (Invalid email format)';
        case 'auth/too-many-requests':
            return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.';
        case 'auth/network-request-failed':
            return '네트워크 연결 상태를 확인해주세요. (Network error)';
        default:
            return error.message;
    }
};

const LoginPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [koreanName, setKoreanName] = useState('');
    const [englishName, setEnglishName] = useState('');
    const [preferredLang, setPreferredLang] = useState('en');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showProfileSetup, setShowProfileSetup] = useState(false);
    const [googleUser, setGoogleUser] = useState(null);
    const navigate = useNavigate();

    // Google 리다이렉트 로그인 후 결과 처리
    useEffect(() => {
        const handleRedirectResult = async () => {
            try {
                const result = await getRedirectResult(auth);
                if (!result) return; // 리다이렉트 결과 없으면 무시

                const user = result.user;
                const prefsDoc = await getDoc(doc(db, 'user_preferences', user.uid));

                if (prefsDoc.exists() && prefsDoc.data().english_name) {
                    navigate(getPostLoginRedirect());
                } else {
                    if (prefsDoc.exists()) {
                        const data = prefsDoc.data();
                        if (data.korean_name) setKoreanName(data.korean_name);
                        if (data.preferred_lang) setPreferredLang(data.preferred_lang);
                    }
                    setGoogleUser(user);
                    setShowProfileSetup(true);
                }
            } catch (err) {
                if (err.code !== 'auth/no-auth-event') {
                    setError(getFriendlyErrorMessage(err));
                }
            }
        };

        handleRedirectResult();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // 로그인 성공 후 이동할 대상 결정 (pendingInviteCode 우선)
    const getPostLoginRedirect = () => {
        const code = sessionStorage.getItem('pendingInviteCode');
        if (code) {
            sessionStorage.removeItem('pendingInviteCode');
            return `/join/${code}`;
        }
        return '/dashboard';
    };

    const saveUserPreferences = async (userId, displayName, korean, english, lang) => {
        try {
            await setDoc(doc(db, 'user_preferences', userId), {
                user_id: userId,
                korean_name: korean,
                english_name: english,
                preferred_lang: lang,
                ai_bot_enabled: true,
                display_name: displayName
            });
        } catch (err) {
            console.error('Error saving user preferences:', err);
            throw err;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                navigate(getPostLoginRedirect());
            } else {
                // Validate signup fields
                if (!englishName.trim()) {
                    setError('Please enter your English name');
                    setLoading(false);
                    return;
                }

                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Always use English name for display name
                const displayName = englishName;
                await updateProfile(user, { displayName });

                // Save preferences to Firestore
                await saveUserPreferences(user.uid, displayName, koreanName, englishName, preferredLang);

                navigate(getPostLoginRedirect());
            }
        } catch (err) {
            setError(getFriendlyErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError('');
        setLoading(true);
        const provider = new GoogleAuthProvider();

        try {
            if (isWebView()) {
                // WebView(카카오톡, 인스타 등 인앱 브라우저): popup이 Google 정책으로 차단되므로 redirect 사용
                // 페이지가 리다이렉트됨 -> useEffect의 getRedirectResult에서 처리
                await signInWithRedirect(auth, provider);
            } else {
                // 일반 브라우저(노트북 Chrome, Safari 등): popup 방식 사용
                // redirect 방식은 third-party cookie 정책 변화로 일부 환경에서 silently fail함
                const result = await signInWithPopup(auth, provider);
                const user = result.user;
                const prefsDoc = await getDoc(doc(db, 'user_preferences', user.uid));

                if (prefsDoc.exists() && prefsDoc.data().english_name) {
                    navigate(getPostLoginRedirect());
                } else {
                    if (prefsDoc.exists()) {
                        const data = prefsDoc.data();
                        if (data.korean_name) setKoreanName(data.korean_name);
                        if (data.preferred_lang) setPreferredLang(data.preferred_lang);
                    }
                    setGoogleUser(user);
                    setShowProfileSetup(true);
                }
            }
        } catch (err) {
            // popup이 사용자에 의해 닫힌 경우 에러 무시
            if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
                setError(getFriendlyErrorMessage(err));
            }
            setLoading(false);
        }
    };

    const handleProfileSetupSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (!englishName.trim()) {
                setError('Please enter your English name');
                setLoading(false);
                return;
            }

            const displayName = englishName;
            await updateProfile(googleUser, { displayName });
            await saveUserPreferences(googleUser.uid, displayName, koreanName, englishName, preferredLang);

            navigate(getPostLoginRedirect());
        } catch (err) {
            setError(getFriendlyErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleCancelProfileSetup = async () => {
        // Sign out the user if they cancel profile setup
        await auth.signOut();
        setShowProfileSetup(false);
        setGoogleUser(null);
        setKoreanName('');
        setEnglishName('');
        setPreferredLang('en');
    };

    // Profile Setup Modal for Google Users
    if (showProfileSetup) {
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
                            Welcome, {googleUser?.email}! Tell us a bit more about yourself.
                        </p>
                    </div>

                    <div className="card animate-slide-up relative">
                        <div className="card-body">
                            <button
                                onClick={handleCancelProfileSetup}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
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
                                    disabled={loading}
                                    className="btn-primary w-full"
                                >
                                    {loading ? 'Saving...' : 'Complete Setup'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
                        <FiMap className="text-white text-4xl" />
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                        Korea Trip Planner
                    </h1>
                    <p className="text-gray-600 mt-2">
                        {isLogin ? 'Welcome back!' : 'Start your journey'}
                    </p>
                </div>

                {/* Form Card */}
                <div className="card animate-slide-up">
                    <div className="card-body">
                        <div className="flex space-x-2 mb-6 bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setIsLogin(true)}
                                className={`flex-1 py-2 rounded-md transition-all ${isLogin
                                    ? 'bg-white shadow-md text-primary-600 font-medium'
                                    : 'text-gray-600'
                                    }`}
                            >
                                Login
                            </button>
                            <button
                                onClick={() => setIsLogin(false)}
                                className={`flex-1 py-2 rounded-md transition-all ${!isLogin
                                    ? 'bg-white shadow-md text-primary-600 font-medium'
                                    : 'text-gray-600'
                                    }`}
                            >
                                Sign Up
                            </button>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Sign Up Only Fields */}
                            {!isLogin && (
                                <>
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
                                                required={!isLogin}
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
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email
                                </label>
                                <div className="relative">
                                    <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="input pl-10"
                                        placeholder="your@email.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="input pl-10"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full"
                            >
                                {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
                            </button>
                        </form>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">Or continue with</span>
                            </div>
                        </div>

                        <button
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FcGoogle className="text-2xl" />
                            <span className="font-medium text-gray-700">Google</span>
                        </button>
                    </div>
                </div>

                <p className="text-center text-sm text-gray-500 mt-6">
                    By continuing, you agree to our Terms of Service and Privacy Policy
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
