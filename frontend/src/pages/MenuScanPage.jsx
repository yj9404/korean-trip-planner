import React, { useState, useRef } from 'react';
import { auth } from '../services/firebase';
import { FiUpload, FiCamera, FiX, FiAlertCircle } from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Badge components
const SpicyBadge = ({ value }) => {
    if (value === true) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">🌶️ Spicy</span>;
    if (value === false) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">Not Spicy</span>;
    return null;
};

const VeganBadge = ({ value }) => {
    if (value === true) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">🌱 Vegetarian</span>;
    return null;
};

const MenuScanPage = ({ user }) => {
    const [preview, setPreview] = useState(null);      // base64 preview URL
    const [file, setFile] = useState(null);            // File object
    const [result, setResult] = useState(null);        // API response
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    const handleFileSelect = (e) => {
        const selected = e.target.files?.[0];
        if (!selected) return;
        setFile(selected);
        setResult(null);
        setError('');
        const reader = new FileReader();
        reader.onload = (ev) => setPreview(ev.target.result);
        reader.readAsDataURL(selected);
    };

    const handleAnalyze = async () => {
        if (!file) return;
        setLoading(true);
        setError('');
        setResult(null);

        try {
            const token = await auth.currentUser?.getIdToken();
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API_URL}/api/v1/menu/analyze`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || `Server error ${response.status}`);
            }

            const data = await response.json();
            setResult(data);
        } catch (err) {
            setError(err.message || 'Failed to analyze menu. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setPreview(null);
        setFile(null);
        setResult(null);
        setError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
    };

    return (
        <div className="max-w-3xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">🍽️ Menu Scanner</h1>
                <p className="text-gray-500 mt-1 text-sm">
                    Take a photo of any Korean menu and get instant English explanations powered by AI.
                </p>
            </div>

            {/* Upload Area */}
            {!preview ? (
                <div className="bg-white rounded-2xl shadow-sm border-2 border-dashed border-gray-200 p-10 flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
                        <FiUpload className="text-3xl text-indigo-500" />
                    </div>
                    <p className="text-gray-600 text-sm text-center">
                        Upload a menu photo from your gallery, or take a photo directly.
                    </p>
                    <div className="flex gap-3 flex-wrap justify-center">
                        <button
                            id="menu-upload-gallery"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition"
                        >
                            <FiUpload /> Upload from Gallery
                        </button>
                        <button
                            id="menu-upload-camera"
                            onClick={() => cameraInputRef.current?.click()}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition"
                        >
                            <FiCamera /> Take a Photo
                        </button>
                    </div>
                    {/* Hidden inputs */}
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                    <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Preview */}
                    <div className="relative rounded-2xl overflow-hidden shadow-sm border border-gray-200 bg-black">
                        <img src={preview} alt="Menu preview" className="w-full max-h-80 object-contain" />
                        <button
                            onClick={handleReset}
                            className="absolute top-3 right-3 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 transition"
                            title="Remove image"
                        >
                            <FiX />
                        </button>
                    </div>

                    {/* Analyze button */}
                    {!result && (
                        <button
                            id="menu-analyze-btn"
                            onClick={handleAnalyze}
                            disabled={loading}
                            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                    Analyzing menu...
                                </>
                            ) : '✨ Analyze Menu'}
                        </button>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
                            <FiAlertCircle className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Results */}
                    {result && (
                        <div className="space-y-4">
                            {/* Meta info */}
                            <div className="bg-indigo-50 rounded-xl p-4">
                                <p className="text-sm font-semibold text-indigo-700">
                                    🍴 {result.restaurant_type || 'Korean Restaurant'}
                                </p>
                                {result.notes && (
                                    <p className="text-xs text-indigo-600 mt-1">{result.notes}</p>
                                )}
                            </div>

                            {/* Menu items */}
                            <div className="space-y-3">
                                {(result.items || []).map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-baseline gap-2 flex-wrap">
                                                    <span className="font-bold text-gray-900">{item.english_name}</span>
                                                    <span className="text-sm text-gray-400">{item.korean_name}</span>
                                                </div>
                                                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{item.description}</p>
                                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                    <SpicyBadge value={item.is_spicy} />
                                                    <VeganBadge value={item.is_vegetarian} />
                                                </div>
                                            </div>
                                            {item.price && (
                                                <span className="shrink-0 text-sm font-semibold text-indigo-600 whitespace-nowrap">
                                                    ₩{item.price}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Scan again */}
                            <button
                                onClick={handleReset}
                                className="w-full py-2.5 border border-gray-300 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition"
                            >
                                📷 Scan Another Menu
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MenuScanPage;
