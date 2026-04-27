import React, { useState, useEffect, useRef, useCallback } from 'react';
import { auth } from '../services/firebase';
import {
    FiUpload, FiImage, FiVideo, FiTrash2, FiCalendar,
    FiChevronLeft, FiChevronRight, FiX, FiCheck, FiLoader, FiPlus, FiDownload
} from 'react-icons/fi';

const API = import.meta.env.VITE_API_URL;

const GalleryPage = ({ user }) => {
    // State
    const [media, setMedia] = useState([]);
    const [dates, setDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null); // null = all
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
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
    const [downloading, setDownloading] = useState(false);
    const fileInputRef = useRef(null);

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
            }
        } catch (e) {
            console.error('Failed to load dates:', e);
        }
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
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 30) {
            setError('Maximum 30 files at once');
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

    // Upload
    const handleUpload = async () => {
        if (!selectedFiles.length) return;

        setUploading(true);
        setUploadProgress({ done: 0, total: selectedFiles.length });
        setError('');

        try {
            const token = await auth.currentUser?.getIdToken();
            const formData = new FormData();
            formData.append('date_label', uploadDate);
            selectedFiles.forEach(({ file }) => formData.append('files', file));

            const res = await fetch(`${API}/api/v1/media/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (res.ok) {
                const result = await res.json();
                setUploadProgress({ done: result.total, total: selectedFiles.length });

                if (result.duplicates?.length) {
                    setDuplicates(result.duplicates);
                }
                if (result.errors?.length) {
                    setError(`${result.errors.length} file(s) failed to upload`);
                }

                if (result.total > 0 || result.duplicates?.length) {
                    setTimeout(() => {
                        setShowUploadModal(false);
                        setSelectedFiles([]);
                        setDuplicates([]);
                        loadDates();
                        loadMedia(selectedDate);
                        setUploading(false);
                    }, result.duplicates?.length ? 1500 : 500);
                } else {
                    setUploading(false);
                }
            } else {
                setError('Upload failed. Please try again.');
                setUploading(false);
            }
        } catch (e) {
            setError('Upload failed. Please try again.');
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
                if (lightboxItem?.file_id === fileId) setLightboxItem(null);
            }
        } catch (e) {
            console.error('Delete failed:', e);
        } finally {
            setDeletingId(null);
        }
    };

    // Toggle selection
    const toggleSelect = (fileId) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(fileId)) next.delete(fileId);
            else next.add(fileId);
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
    };

    // Download selected
    const handleDownloadSelected = async () => {
        if (!selectedIds.size) return;
        setDownloading(true);

        try {
            const ids = Array.from(selectedIds);
            const itemsToDownload = media.filter(m => selectedIds.has(m.file_id));

            for (const item of itemsToDownload) {
                try {
                    const response = await fetch(`${API}${item.serve_url}`);
                    if (!response.ok) throw new Error(`Network response was not ok for ${item.original_name}`);
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = item.original_name || 'download';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                } catch (err) {
                    console.error('Download failed for item:', item, err);
                }
            }
        } finally {
            setDownloading(false);
            exitSelectMode();
        }
    };

    // Exit select mode
    const exitSelectMode = () => {
        setSelectMode(false);
        setSelectedIds(new Set());
    };

    // Thumbnail click handler
    const handleItemClick = (item) => {
        if (selectMode) {
            toggleSelect(item.file_id);
        } else {
            setLightboxItem(item);
        }
    };

    // Cleanup previews
    useEffect(() => {
        return () => {
            selectedFiles.forEach(f => f.preview && URL.revokeObjectURL(f.preview));
        };
    }, [selectedFiles]);

    // Group media by date for "all" view
    const groupedMedia = selectedDate ? { [selectedDate]: media } : media.reduce((acc, item) => {
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
                                    disabled={deleting || downloading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDownloadSelected}
                                    disabled={!selectedIds.size || deleting || downloading}
                                    className="flex items-center space-x-2 px-5 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-50 text-sm font-medium"
                                >
                                    {downloading ? (
                                        <FiLoader className="animate-spin" />
                                    ) : (
                                        <FiDownload />
                                    )}
                                    <span>Download {selectedIds.size > 0 ? selectedIds.size : ''}</span>
                                </button>
                                <button
                                    onClick={handleDeleteSelected}
                                    disabled={!selectedIds.size || deleting || downloading}
                                    className="flex items-center space-x-2 px-5 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50 text-sm font-medium"
                                >
                                    {deleting ? (
                                        <FiLoader className="animate-spin" />
                                    ) : (
                                        <FiTrash2 />
                                    )}
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
                                        >
                                            {item.media_type === 'image' ? (
                                                <img
                                                    src={`${API}${item.serve_url}`}
                                                    alt={item.original_name}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                                    <FiVideo className="text-white text-3xl" />
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
                                                    className={`absolute bottom-1.5 right-1.5 w-7 h-7 bg-red-500/80 rounded-full flex items-center justify-center transition-opacity hover:bg-red-600 ${deletingId === item.file_id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
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
                                <div className="flex items-center justify-center space-x-3 py-2">
                                    <FiLoader className="animate-spin text-primary-500 text-xl" />
                                    <span className="text-sm text-gray-600">
                                        Uploading... {uploadProgress.done}/{uploadProgress.total}
                                    </span>
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
                    onClick={() => setLightboxItem(null)}
                >
                    <button
                        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white"
                        onClick={() => setLightboxItem(null)}
                    >
                        <FiX className="text-3xl" />
                    </button>

                    <div className="max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        {lightboxItem.media_type === 'image' ? (
                            <img
                                src={`${API}${lightboxItem.serve_url}`}
                                alt={lightboxItem.original_name}
                                className="max-w-full max-h-[85vh] object-contain rounded-lg"
                            />
                        ) : (
                            <video
                                src={`${API}${lightboxItem.serve_url}`}
                                controls
                                autoPlay
                                className="max-w-full max-h-[85vh] rounded-lg"
                            />
                        )}
                        <div className="text-center mt-3 text-white/60 text-sm">
                            {lightboxItem.original_name} • {formatDateLabel(lightboxItem.date_label)}
                            {lightboxItem.uploader_name && ` • by ${lightboxItem.uploader_name}`}
                        </div>
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
