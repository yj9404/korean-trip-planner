import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { auth, db } from '../services/firebase';
import {
    collection, doc, getCountFromServer, getDoc, setDoc, deleteDoc, onSnapshot
} from 'firebase/firestore';
import {
    FiUpload, FiImage, FiVideo, FiTrash2, FiCalendar,
    FiX, FiCheck, FiLoader, FiPlus, FiDownload, FiPlay, FiHeart
} from 'react-icons/fi';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const API = import.meta.env.VITE_API_URL;

const GalleryPage = ({ user }) => {
    // State
    const [media, setMedia] = useState([]);
    const [dates, setDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null); // null = all
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0, current: '' });
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [lightboxItem, setLightboxItem] = useState(null);
    const [error, setError] = useState('');
    const [duplicates, setDuplicates] = useState([]);
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [deleting, setDeleting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    // Download processing state
    const [processing, setProcessing] = useState(false);      // true while fetching blobs / zipping
    const [processMsg, setProcessMsg] = useState('');          // message shown in overlay
    // Toast notification
    const [toast, setToast] = useState('');                    // '' = hidden
    // Likes: { [fileId]: { count: number, liked: boolean } }
    const [likes, setLikes] = useState({});
    const fileInputRef = useRef(null);
    const longPressTimer = useRef(null);
    const longPressActive = useRef(false);
    // Keep an unsubscribe reference for the active lightbox listener
    const likesUnsubRef = useRef(null);
    // Tracks whether we pushed a history entry for the current lightbox
    const lightboxHistoryRef = useRef(false);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    // Push a history entry when lightbox opens so the back button can close it
    useEffect(() => {
        if (lightboxItem && !lightboxHistoryRef.current) {
            history.pushState({ lightbox: true }, '');
            lightboxHistoryRef.current = true;
        }
    }, [lightboxItem]);

    // Android back button: close lightbox instead of navigating away
    useEffect(() => {
        const handlePopState = () => {
            if (lightboxHistoryRef.current) {
                lightboxHistoryRef.current = false;
                setLightboxItem(null);
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // Close lightbox directly. If a history entry was pushed for the lightbox,
    // it will be silently consumed on the next back press (same URL = invisible navigation).
    const closeLightbox = useCallback(() => {
        lightboxHistoryRef.current = false;
        setLightboxItem(null);
    }, []);

    const getHeaders = async () => {
        const token = await auth.currentUser?.getIdToken();
        return { Authorization: `Bearer ${token}` };
    };

    // Load dates
    const loadDates = useCallback(async () => {
        try {
            const headers = await getHeaders();
            const res = await fetch(`${API}/api/v1/media/dates`, { headers });
            if (res.ok) {
                const data = await res.json();
                setDates(data);
                return data;
            }
        } catch (e) {
            console.error('Failed to load dates:', e);
        }
        return null;
    }, []);

    // Load media
    const loadMedia = useCallback(async (dateFilter = null) => {
        setLoading(true);
        try {
            const headers = await getHeaders();
            let url = `${API}/api/v1/media/list`;
            if (dateFilter) url += `?date_label=${dateFilter}`;
            const res = await fetch(url, { headers });
            if (res.ok) {
                const data = await res.json();
                setMedia(data);
            }
        } catch (e) {
            console.error('Failed to load media:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDates();
        loadMedia();
    }, [loadDates, loadMedia]);

    // ── Likes helpers ──────────────────────────────────────────

    // Subscribe to real-time like count + own like status for a single item.
    // Returns an unsubscribe function.
    const subscribeLikes = useCallback((fileId) => {
        const uid = auth.currentUser?.uid;
        const usersCol = collection(db, 'media_likes', fileId, 'users');
        // Listen on the subcollection; derive count and own-like from snapshot
        const unsub = onSnapshot(usersCol, (snap) => {
            const count = snap.size;
            const liked = snap.docs.some(d => d.id === uid);
            setLikes(prev => ({ ...prev, [fileId]: { count, liked } }));
        });
        return unsub;
    }, []);

    // Fetch like count once (no real-time) — used when rendering the grid
    const fetchLikeCount = useCallback(async (fileId) => {
        try {
            const usersCol = collection(db, 'media_likes', fileId, 'users');
            const snapshot = await getCountFromServer(usersCol);
            const count = snapshot.data().count;
            setLikes(prev => ({
                ...prev,
                [fileId]: { count, liked: prev[fileId]?.liked ?? false }
            }));
        } catch (e) {
            // Silently ignore — likes are non-critical
        }
    }, []);

    // Toggle like for the currently open lightbox item
    const handleToggleLike = useCallback(async (fileId) => {
        const uid = auth.currentUser?.uid;
        if (!uid || !fileId) return;
        const likeRef = doc(db, 'media_likes', fileId, 'users', uid);
        const current = likes[fileId];
        try {
            if (current?.liked) {
                await deleteDoc(likeRef);
            } else {
                await setDoc(likeRef, { likedAt: new Date().toISOString() });
            }
            // onSnapshot in subscribeLikes will update state automatically
        } catch (e) {
            console.error('Like toggle failed:', e);
        }
    }, [likes]);

    // Fetch counts for all visible media items (grid view, one-shot)
    useEffect(() => {
        if (!media.length) return;
        media.forEach(item => {
            // Only fetch if we don't have data yet
            if (likes[item.file_id] === undefined) {
                fetchLikeCount(item.file_id);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [media]);

    // Subscribe to real-time updates when a lightbox item is open
    useEffect(() => {
        if (likesUnsubRef.current) {
            likesUnsubRef.current();
            likesUnsubRef.current = null;
        }
        if (lightboxItem) {
            likesUnsubRef.current = subscribeLikes(lightboxItem.file_id);
        }
        return () => {
            if (likesUnsubRef.current) {
                likesUnsubRef.current();
                likesUnsubRef.current = null;
            }
        };
    }, [lightboxItem, subscribeLikes]);

    // Filter by date
    const handleDateFilter = (date) => {
        setSelectedDate(date);
        loadMedia(date);
    };

    const handleShowAll = () => {
        setSelectedDate(null);
        loadMedia();
    };

    // File selection
    const VIDEO_MAX_BYTES = 30 * 1024 * 1024; // 30MB (Cloud Run body limit is 32MB)

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 30) {
            setError('Maximum 30 files at once');
            return;
        }

        // Reject videos over 30MB (Cloud Run request body cap)
        const oversized = files.filter(f => f.type.startsWith('video/') && f.size > VIDEO_MAX_BYTES);
        if (oversized.length > 0) {
            setError(`Video file(s) too large (max 30MB): ${oversized.map(f => f.name).join(', ')}`);
            return;
        }

        // Generate previews
        const withPreviews = files.map(file => ({
            file,
            preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
            type: file.type.startsWith('image/') ? 'image' : 'video',
        }));
        setSelectedFiles(withPreviews);
        setShowUploadModal(true);
        setError('');
    };


    // Upload — all files (images and videos) go through the backend /upload endpoint
    const handleUpload = async () => {
        if (!selectedFiles.length) return;

        setUploading(true);
        setUploadProgress({ done: 0, total: selectedFiles.length, current: '', percent: 0 });
        setError('');

        const token = await auth.currentUser?.getIdToken();
        let successCount = 0;
        const allDuplicates = [];
        const allErrors = [];

        for (let i = 0; i < selectedFiles.length; i++) {
            const { file } = selectedFiles[i];
            setUploadProgress({ done: i + 1, total: selectedFiles.length, current: file.name, percent: 0 });

            try {
                const formData = new FormData();
                formData.append('date_label', uploadDate);
                formData.append('files', file);

                const res = await fetch(`${API}/api/v1/media/upload`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                });

                if (res.ok) {
                    const result = await res.json();
                    successCount += result.total;
                    if (result.duplicates?.length) allDuplicates.push(...result.duplicates);
                    if (result.errors?.length) allErrors.push(...result.errors);
                } else {
                    allErrors.push({ file: file.name, error: 'Upload failed' });
                }
            } catch (e) {
                allErrors.push({ file: file.name, error: e.message || 'Upload failed' });
            }
        }

        setUploadProgress({ done: selectedFiles.length, total: selectedFiles.length, current: '', percent: 100 });
        if (allDuplicates.length) setDuplicates(allDuplicates);
        if (allErrors.length) setError(`${allErrors.length} file(s) failed to upload`);

        if (successCount > 0 || allDuplicates.length) {
            setTimeout(() => {
                setShowUploadModal(false);
                setSelectedFiles([]);
                setDuplicates([]);
                loadDates();
                loadMedia(selectedDate);
                setUploading(false);
            }, allDuplicates.length ? 1500 : 500);
        } else {
            setUploading(false);
        }
    };

    // Delete single
    const handleDelete = async (fileId) => {
        if (!confirm('Delete this file?')) return;
        setDeletingId(fileId);
        try {
            const headers = await getHeaders();
            const res = await fetch(`${API}/api/v1/media/${fileId}`, {
                method: 'DELETE',
                headers,
            });
            if (res.ok) {
                setMedia(prev => prev.filter(m => m.file_id !== fileId));
                if (lightboxItem?.file_id === fileId) closeLightbox();
                const newDates = await loadDates();
                if (newDates && selectedDate && !newDates.includes(selectedDate)) {
                    setSelectedDate(null);
                    loadMedia(null);
                }
            }
        } catch (e) {
            console.error('Delete failed:', e);
        } finally {
            setDeletingId(null);
        }
    };

    // Toggle selection — hard cap at 30
    const toggleSelect = (fileId) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(fileId)) {
                next.delete(fileId);
            } else {
                if (next.size >= 30) {
                    showToast('Maximum 30 items can be selected');
                    return prev;
                }
                next.add(fileId);
            }
            return next;
        });
    };

    // Delete selected
    const handleDeleteSelected = async () => {
        if (!selectedIds.size) return;
        if (!confirm(`Delete ${selectedIds.size} item(s)?`)) return;
        setDeleting(true);
        const headers = await getHeaders();
        const ids = Array.from(selectedIds);
        await Promise.all(
            ids.map(id =>
                fetch(`${API}/api/v1/media/${id}`, { method: 'DELETE', headers })
                    .catch(() => null)
            )
        );
        setMedia(prev => prev.filter(m => !selectedIds.has(m.file_id)));
        setSelectedIds(new Set());
        setSelectMode(false);
        setDeleting(false);
        const newDates = await loadDates();
        if (newDates && selectedDate && !newDates.includes(selectedDate)) {
            setSelectedDate(null);
            loadMedia(null);
        }
    };

    // Exit select mode
    const exitSelectMode = () => {
        setSelectMode(false);
        setSelectedIds(new Set());
    };

    // Download selected — Web Share API (mobile) with JSZip fallback (desktop)
    // All downloads go through the backend proxy to avoid CORS / SSL issues with Drive URLs.
    const handleDownloadSelected = async () => {
        if (!selectedIds.size) return;

        // Include both images and videos
        const targets = media
            .filter(m => selectedIds.has(m.file_id) && (m.media_type === 'image' || m.media_type === 'video'))
            .slice(0, 30);

        if (!targets.length) {
            showToast('No downloadable files found');
            return;
        }

        setProcessing(true);
        setProcessMsg('Fetching files...');

        try {
            const token = await auth.currentUser?.getIdToken();

            // Fetch all blobs via backend proxy in parallel
            const blobs = await Promise.all(
                targets.map(async (item) => {
                    const res = await fetch(`${API}/api/v1/media/download/${item.file_id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (!res.ok) throw new Error(`Failed to fetch ${item.original_name}`);
                    const blob = await res.blob();
                    const filename = item.original_name || `file_${item.file_id}`;
                    return new File([blob], filename, { type: blob.type });
                })
            );

            // Web Share API (iOS / Android native share sheet)
            if (navigator.canShare && navigator.canShare({ files: blobs })) {
                await navigator.share({
                    files: blobs,
                    title: '여행 사진',
                });
            } else {
                // JSZip fallback (desktop / unsupported browser)
                setProcessMsg('Compressing to ZIP...');
                const zip = new JSZip();
                blobs.forEach(file => zip.file(file.name, file));
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                saveAs(zipBlob, 'album.zip');
            }
        } catch (e) {
            if (e?.name !== 'AbortError') {
                console.error('Download failed:', e);
                showToast('Download failed. Please try again.');
            }
        } finally {
            setProcessing(false);
            setProcessMsg('');
        }
    };

    // Thumbnail click handler
    const handleItemClick = (item) => {
        if (longPressActive.current) {
            longPressActive.current = false;
            return;
        }
        if (selectMode) {
            toggleSelect(item.file_id);
        } else {
            setLightboxItem(item);
        }
    };

    // Long press handlers
    const handleTouchStart = useCallback((item) => (e) => {
        longPressActive.current = false;
        longPressTimer.current = setTimeout(() => {
            longPressActive.current = true;
            if (!selectMode) setSelectMode(true);
            toggleSelect(item.file_id);
        }, 500);
    }, [selectMode]);

    const handleTouchEnd = useCallback(() => {
        clearTimeout(longPressTimer.current);
    }, []);

    const handleTouchMove = useCallback(() => {
        clearTimeout(longPressTimer.current);
        longPressActive.current = false;
    }, []);

    // Cleanup previews
    useEffect(() => {
        return () => {
            selectedFiles.forEach(f => f.preview && URL.revokeObjectURL(f.preview));
        };
    }, [selectedFiles]);

    // Group media by date for "all" view
    const displayedMedia = selectedDate ? media.filter(m => m.date_label === selectedDate) : media;
    const groupedMedia = selectedDate ? { [selectedDate]: displayedMedia } : displayedMedia.reduce((acc, item) => {
        const d = item.date_label || 'Unknown';
        if (!acc[d]) acc[d] = [];
        acc[d].push(item);
        return acc;
    }, {});
    const sortedGroups = Object.entries(groupedMedia).sort(([a], [b]) => b.localeCompare(a));

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">📸 Gallery</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {selectMode
                            ? `${selectedIds.size} selected`
                            : `${media.length} items${selectedDate ? ` • ${selectedDate}` : ''}`
                        }
                    </p>
                </div>
                <div className="flex flex-col items-end">
                    <div className="flex items-center space-x-2">
                        {selectMode ? (
                            <>
                                <button
                                    onClick={exitSelectMode}
                                    className="px-4 py-2.5 text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors text-sm font-medium"
                                    disabled={deleting}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteSelected}
                                    disabled={!selectedIds.size || deleting}
                                    className="flex items-center space-x-2 px-5 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50 text-sm font-medium"
                                >
                                    {deleting ? <FiLoader className="animate-spin" /> : <FiTrash2 />}
                                    <span>Delete {selectedIds.size > 0 ? selectedIds.size : ''}</span>
                                </button>
                            </>
                        ) : (
                            <>
                                {media.length > 0 && (
                                    <button
                                        onClick={() => setSelectMode(true)}
                                        className="px-4 py-2.5 text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors text-sm font-medium"
                                    >
                                        Select
                                    </button>
                                )}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center space-x-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
                                >
                                    <FiPlus className="text-lg" />
                                    <span className="font-medium">Upload</span>
                                </button>
                            </>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*,video/*"
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                    </div>
                    {!selectMode && (
                        <p className="text-xs text-gray-400 mt-1 mr-1 text-right">Max 30 files per upload</p>
                    )}
                </div>
            </div>

            {/* Date Tabs */}
            {dates.length > 0 && (
                <div className="flex items-center space-x-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                        onClick={handleShowAll}
                        className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${!selectedDate
                            ? 'bg-primary-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        All
                    </button>
                    {dates.map(date => (
                        <button
                            key={date}
                            onClick={() => handleDateFilter(date)}
                            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedDate === date
                                ? 'bg-primary-600 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {formatDateLabel(date)}
                        </button>
                    ))}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
                    {error}
                </div>
            )}

            {/* Gallery Grid */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <FiLoader className="animate-spin text-3xl text-primary-500" />
                </div>
            ) : media.length === 0 ? (
                <div className="text-center py-20">
                    <FiImage className="text-6xl text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No photos yet</p>
                    <p className="text-gray-400 text-sm mt-1">Upload your first photos!</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {sortedGroups.map(([date, items]) => (
                        <div key={date}>
                            {!selectedDate && (
                                <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                                    <FiCalendar className="text-primary-500" />
                                    <span>{formatDateLabel(date)}</span>
                                    <span className="text-sm font-normal text-gray-400">({items.length})</span>
                                </h2>
                            )}
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                                {items.map(item => {
                                    const isSelected = selectedIds.has(item.file_id);
                                    return (
                                        <div
                                            key={item.file_id}
                                            className={`relative group aspect-square rounded-xl overflow-hidden cursor-pointer bg-gray-100 transition-all ${selectMode
                                                ? isSelected
                                                    ? 'ring-3 ring-primary-500 ring-offset-2'
                                                    : 'ring-2 ring-transparent hover:ring-gray-300'
                                                : 'hover:ring-2 hover:ring-primary-400'
                                                }`}
                                            onClick={() => handleItemClick(item)}
                                            onTouchStart={handleTouchStart(item)}
                                            onTouchEnd={handleTouchEnd}
                                            onTouchMove={handleTouchMove}
                                        >
                                            {item.media_type === 'image' ? (
                                                <img
                                                    src={item.image_url}
                                                    alt={item.original_name}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="relative w-full h-full bg-gray-900">
                                                    <img
                                                        src={item.image_url}
                                                        alt={item.original_name}
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                        onError={e => { e.currentTarget.style.display = 'none'; }}
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="w-10 h-10 bg-black/60 rounded-full flex items-center justify-center">
                                                            <FiPlay className="text-white text-lg ml-0.5" />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Hover overlay (normal mode) */}
                                            {!selectMode && (
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                            )}

                                            {/* Select mode: dim overlay + check */}
                                            {selectMode && (
                                                <div className={`absolute inset-0 transition-colors ${isSelected ? 'bg-primary-600/40' : 'bg-black/0 group-hover:bg-black/10'
                                                    }`}>
                                                    <div className={`absolute top-1.5 left-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected
                                                        ? 'bg-primary-500 border-primary-500'
                                                        : 'bg-white/80 border-gray-400'
                                                        }`}>
                                                        {isSelected && <FiCheck className="text-white text-xs" />}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Heart badge (grid, read-only) */}
                                            {!selectMode && (likes[item.file_id]?.count ?? 0) > 0 && (
                                                <div className="absolute bottom-1.5 left-1.5 flex items-center space-x-0.5 bg-black/50 rounded-full px-1.5 py-0.5">
                                                    <FiHeart className="text-rose-400 text-xs fill-rose-400" />
                                                    <span className="text-white text-xs font-medium leading-none">
                                                        {likes[item.file_id].count}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Drive uploading indicator (normal mode only) */}
                                            {!selectMode && item.drive_status === 'uploading' && (
                                                <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                                    <FiLoader className="text-white text-xs animate-spin" />
                                                </div>
                                            )}

                                            {/* Single delete (normal mode, hover) */}
                                            {!selectMode && item.uploader_id === user?.uid && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(item.file_id); }}
                                                    className={`absolute bottom-1.5 right-1.5 w-7 h-7 bg-red-500/80 rounded-full flex items-center justify-center transition-opacity hover:bg-red-600 ${deletingId === item.file_id ? 'opacity-100' : 'opacity-0 [@media(hover:hover)]:group-hover:opacity-100'
                                                        }`}
                                                    disabled={!!deletingId}
                                                >
                                                    {deletingId === item.file_id ? (
                                                        <FiLoader className="text-white text-xs animate-spin" />
                                                    ) : (
                                                        <FiTrash2 className="text-white text-xs" />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <h3 className="text-lg font-bold text-gray-900">Upload Media</h3>
                            <button
                                onClick={() => { setShowUploadModal(false); setSelectedFiles([]); }}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                                disabled={uploading}
                            >
                                <FiX className="text-xl" />
                            </button>
                        </div>

                        {/* Date Picker */}
                        <div className="px-6 py-4 border-b bg-gray-50">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <FiCalendar className="inline mr-1" />
                                Date
                            </label>
                            <input
                                type="date"
                                value={uploadDate}
                                onChange={(e) => setUploadDate(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                disabled={uploading}
                            />
                        </div>

                        {/* Preview Grid */}
                        <div className="px-6 py-4 overflow-y-auto max-h-[40vh]">
                            <p className="text-sm text-gray-500 mb-3">
                                {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                            </p>
                            <div className="grid grid-cols-4 gap-2">
                                {selectedFiles.map((item, i) => (
                                    <div key={i} className="aspect-square rounded-lg overflow-hidden bg-gray-100 relative">
                                        {item.preview ? (
                                            <img src={item.preview} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <FiVideo className="text-2xl text-gray-400" />
                                            </div>
                                        )}
                                        {!uploading && (
                                            <button
                                                onClick={() => setSelectedFiles(prev => prev.filter((_, j) => j !== i))}
                                                className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                                            >
                                                <FiX className="text-white text-xs" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Upload Button */}
                        <div className="px-6 py-4 border-t bg-gray-50">
                            {/* Duplicate warnings */}
                            {duplicates.length > 0 && (
                                <div className="mb-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
                                    <p className="text-sm font-medium text-yellow-800 mb-1">
                                        ⚠️ {duplicates.length} duplicate{duplicates.length > 1 ? 's' : ''} skipped
                                    </p>
                                    <ul className="text-xs text-yellow-700 space-y-0.5">
                                        {duplicates.map((d, i) => (
                                            <li key={i}>{d.file} — already on {d.existing_date}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {uploading ? (
                                <div className="flex flex-col items-center justify-center space-y-2 py-3">
                                    <div className="flex items-center space-x-3">
                                        <FiLoader className="animate-spin text-primary-500 text-xl shrink-0" />
                                        <span className="text-sm text-gray-700 font-medium">
                                            Uploading {uploadProgress.done}/{uploadProgress.total}
                                            {uploadProgress.percent > 0 && uploadProgress.percent < 100
                                                ? ` — ${uploadProgress.percent}%`
                                                : ''}
                                        </span>
                                    </div>
                                    {uploadProgress.current && (
                                        <p className="text-xs text-gray-400 truncate max-w-xs text-center">
                                            {uploadProgress.current}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={handleUpload}
                                    disabled={!selectedFiles.length}
                                    className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                                >
                                    <FiUpload />
                                    <span>Upload {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox */}
            {lightboxItem && (
                <div
                    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
                    onClick={closeLightbox}
                >
                    <button
                        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white"
                        onClick={closeLightbox}
                    >
                        <FiX className="text-3xl" />
                    </button>

                    <div className="max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        {lightboxItem.media_type === 'image' ? (
                            <img
                                src={lightboxItem.image_url}
                                alt={lightboxItem.original_name}
                                className="max-w-full max-h-[85vh] object-contain rounded-lg"
                            />
                        ) : lightboxItem.drive_file_id ? (
                            <div className="w-[80vw] max-w-[900px] aspect-video rounded-lg overflow-hidden">
                                <iframe
                                    src={`https://drive.google.com/file/d/${lightboxItem.drive_file_id}/preview`}
                                    width="100%"
                                    height="100%"
                                    style={{ border: 'none' }}
                                    allow="autoplay; fullscreen"
                                    allowFullScreen
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center space-y-4 w-72 text-center">
                                <FiVideo className="text-white/40 text-6xl" />
                                <p className="text-white/70 text-sm">영상을 불러올 수 없어요.</p>
                            </div>
                        )}
                        <div className="text-center mt-3 text-white/60 text-sm">
                            {lightboxItem.original_name} • {formatDateLabel(lightboxItem.date_label)}
                            {lightboxItem.uploader_name && ` • by ${lightboxItem.uploader_name}`}
                        </div>

                        {/* ── Heart button ── */}
                        <div className="flex items-center justify-center mt-4 space-x-3">
                            <button
                                onClick={() => handleToggleLike(lightboxItem.file_id)}
                                className={`flex items-center space-x-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all active:scale-95 ${
                                    likes[lightboxItem.file_id]?.liked
                                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40'
                                        : 'bg-white/10 text-white hover:bg-white/20'
                                }`}
                            >
                                <FiHeart
                                    className={`text-base transition-transform ${
                                        likes[lightboxItem.file_id]?.liked
                                            ? 'fill-white scale-110'
                                            : ''
                                    }`}
                                />
                                <span>
                                    {likes[lightboxItem.file_id]?.count ?? 0}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Floating action bar (select mode) ── */}
            {selectMode && (
                <div className="fixed bottom-20 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
                    <div className="pointer-events-auto w-full max-w-sm bg-gray-900 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center justify-between">
                        <span className="text-sm font-medium">
                            <span className={selectedIds.size >= 30 ? 'text-yellow-400' : 'text-white'}>
                                {selectedIds.size}
                            </span>
                            <span className="text-white/50"> / 30 selected</span>
                        </span>
                        <button
                            onClick={handleDownloadSelected}
                            disabled={!selectedIds.size || processing}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 rounded-xl text-sm font-semibold disabled:opacity-40 active:bg-blue-600 transition-colors"
                        >
                            <FiDownload />
                            <span>Download</span>
                        </button>
                    </div>
                </div>
            )}

            {/* ── Processing overlay ── */}
            {processing && (
                <div className="fixed inset-0 z-50 bg-black/60 flex flex-col items-center justify-center space-y-4">
                    <FiLoader className="text-white text-5xl animate-spin" />
                    <p className="text-white text-base font-medium">{processMsg}</p>
                </div>
            )}

            {/* ── Toast notification ── */}
            {toast && (
                <div className="fixed bottom-36 left-0 right-0 z-50 flex justify-center px-6 pointer-events-none">
                    <div className="bg-gray-800 text-white text-sm px-5 py-3 rounded-2xl shadow-lg">
                        {toast}
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper
function formatDateLabel(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
    } catch {
        return dateStr;
    }
}

export default GalleryPage;
