import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDoc, doc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { FiUsers } from 'react-icons/fi';

/**
 * /join/:inviteCode 라우트 핸들러.
 * - 비로그인 상태: invite_code를 sessionStorage에 저장 → /login 이동
 * - 로그인했지만 프로필(english_name) 미완성: invite_code 보존 → /login에서 프로필 설정 후 join
 * - 로그인 + 프로필 완성: join API 호출 → 성공 시 /groups 이동
 */
const JoinGroupPage = () => {
    const { inviteCode } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading'); // 'loading' | 'joining' | 'success' | 'error'
    const [message, setMessage] = useState('');
    const [groupName, setGroupName] = useState('');
    const joinAttempted = useRef(false);

    useEffect(() => {
        const handleJoin = async () => {
            const currentUser = auth.currentUser;

            // 비로그인: 코드 저장 후 로그인으로
            if (!currentUser) {
                sessionStorage.setItem('pendingInviteCode', inviteCode);
                navigate('/login', { replace: true });
                return;
            }

            // StrictMode 중복 방지
            if (joinAttempted.current) return;
            joinAttempted.current = true;

            // 프로필(english_name) 완성 여부 확인
            // 구글 로그인 직후 영어 이름 미등록 상태면 join 전에 프로필 설정 먼저
            try {
                const prefsDoc = await getDoc(doc(db, 'user_preferences', currentUser.uid));
                const hasProfile = prefsDoc.exists() && prefsDoc.data().english_name;

                if (!hasProfile) {
                    // pendingInviteCode 보존: 프로필 완료 후 이 코드로 자동 join
                    sessionStorage.setItem('pendingInviteCode', inviteCode);
                    navigate('/complete-profile', { replace: true });
                    return;
                }
            } catch (err) {
                console.error('Failed to check user profile:', err);
                // 프로필 확인 실패 시 join은 계속 진행 (graceful degradation)
            }

            // 로그인 + 프로필 완성: join 시도
            setStatus('joining');
            try {
                const token = await currentUser.getIdToken(true);
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/groups/join`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ invite_code: inviteCode }),
                });

                const data = await response.json();

                if (response.ok) {
                    setGroupName(data.group_name || '');
                    setStatus('success');
                    // 2초 후 /groups로 이동
                    setTimeout(() => navigate('/groups', { replace: true }), 2000);
                } else {
                    setMessage(data.detail || 'Failed to join group.');
                    setStatus('error');
                }
            } catch (err) {
                console.error(err);
                setMessage('Network error. Please try again.');
                setStatus('error');
            }
        };

        // auth 상태가 확정된 후에 실행 (Firebase 초기화 대기)
        const unsubscribe = auth.onAuthStateChanged(() => {
            handleJoin();
        });

        return () => unsubscribe();
    }, [inviteCode, navigate]);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                        <FiUsers className="text-3xl text-indigo-600" />
                    </div>
                </div>

                {(status === 'loading' || status === 'joining') && (
                    <>
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">Joining Group...</h1>
                        <p className="text-gray-500 mb-6">Please wait while we process your invitation.</p>
                        <div className="flex justify-center">
                            <svg className="animate-spin h-8 w-8 text-indigo-600" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                        </div>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">🎉 Joined!</h1>
                        {groupName && (
                            <p className="text-gray-600 mb-2">
                                You've joined <span className="font-semibold text-indigo-600">{groupName}</span>.
                            </p>
                        )}
                        <p className="text-gray-500 text-sm">Redirecting to Groups...</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">Oops!</h1>
                        <p className="text-red-600 mb-6">{message}</p>
                        <button
                            onClick={() => navigate('/groups')}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                        >
                            Go to Groups
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default JoinGroupPage;
