import React, { useState, useEffect } from 'react';
import { FiPlus, FiNavigation, FiCreditCard, FiMapPin, FiSearch, FiLoader, FiX } from 'react-icons/fi';
import { getPlaces, deletePlace, addPlace, searchForeignPlaces, resolvePlaceRecommendation, updatePlace, getPlaceDescription } from '../services/itineraryService';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Item Component
const SortableItem = ({ id, children }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    return <div ref={setNodeRef} style={style} {...attributes} {...listeners}>{children}</div>;
};
import { getUserPreferences } from '../services/chatService';
import TaxiCardModal from '../components/TaxiCardModal';

// Custom Time Picker to enforce AM/PM in english (bypasses OS locale)
const CustomTimePicker = ({ value, onChange }) => {
    const currentHour = value ? parseInt(value.split(':')[0], 10) : '';
    const currentMin = value ? value.split(':')[1] : '';
    const isPM = currentHour !== '' ? currentHour >= 12 : false;
    const h12 = currentHour !== '' ? (currentHour % 12 === 0 ? 12 : currentHour % 12) : '';
    const ampm = value !== '' ? (isPM ? 'PM' : 'AM') : 'AM';

    const handleUpdate = (newH12, newMin, newAmpm) => {
        if (!newH12 && !newMin) {
            onChange('');
            return;
        }
        let h24 = parseInt(newH12 || '12', 10);
        if (newAmpm === 'PM' && h24 !== 12) h24 += 12;
        if (newAmpm === 'AM' && h24 === 12) h24 = 0;
        onChange(`${String(h24).padStart(2, '0')}:${newMin || '00'}`);
    };

    return (
        <div className="flex items-center w-full px-3 py-2 bg-gray-100 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 border border-transparent">
            <select
                className="bg-transparent focus:outline-none text-center cursor-pointer font-medium text-gray-700"
                value={h12}
                onChange={(e) => handleUpdate(e.target.value, currentMin, ampm)}
            >
                <option value="">Hr</option>
                {[...Array(12)].map((_, i) => (
                    <option key={i+1} value={i+1}>{String(i+1).padStart(2, '0')}</option>
                ))}
            </select>
            <span className="text-gray-500 font-bold mx-1">:</span>
            <select
                className="bg-transparent focus:outline-none text-center cursor-pointer font-medium text-gray-700"
                value={currentMin}
                onChange={(e) => handleUpdate(h12, e.target.value, ampm)}
            >
                <option value="">Min</option>
                {Array.from({length: 60}, (_, i) => String(i).padStart(2, '0')).map(m => (
                    <option key={m} value={m}>{m}</option>
                ))}
            </select>
            <div className="flex-1"></div>
            <select
                className="bg-transparent focus:outline-none font-bold text-blue-600 cursor-pointer"
                value={ampm}
                onChange={(e) => handleUpdate(h12 || '12', currentMin || '00', e.target.value)}
            >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
            </select>
            {value && (
                <button
                    type="button"
                    className="ml-2 text-gray-400 hover:text-red-500"
                    onClick={() => onChange('')}
                    title="Clear Time"
                >
                    <FiX size={16} />
                </button>
            )}
        </div>
    );
};

const ItineraryPage = ({ user }) => {
    const [places, setPlaces] = useState([]);
    const [preferences, setPreferences] = useState({ preferred_lang: 'en' });
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [showTaxiModal, setShowTaxiModal] = useState(false);

    // Description Modal State
    const [showDescModal, setShowDescModal] = useState(false);
    const [descLoading, setDescLoading] = useState(false);
    const [placeDesc, setPlaceDesc] = useState('');

    // Search & Add Place State
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [searchType, setSearchType] = useState('SPECIFIC'); // 'SPECIFIC' | 'CATEGORY'
    const [isAdding, setIsAdding] = useState(false);
    const [isResolving, setIsResolving] = useState(false); // resolving a recommendation to coordinates
    const [addDate, setAddDate] = useState(''); // Date selected in the modal
    const [addTime, setAddTime] = useState(''); // Time selected in the modal

    useEffect(() => {
        loadPlaces();
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        try {
            if (user) {
                const prefs = await getUserPreferences(user.uid);
                setPreferences(prefs);
            }
        } catch (error) {
            console.error('Failed to load preferences:', error);
        }
    };

    const loadPlaces = async () => {
        try {
            const data = await getPlaces();
            setPlaces(data || []);

            // Auto-select first date
            if (data && data.length > 0) {
                const dates = [...new Set(data.map(p => p.visit_date))].sort();
                if (dates.length > 0 && !selectedDate) {
                    setSelectedDate(dates[0]);
                }
            }
        } catch (error) {
            console.error('Failed to load places:', error);
            setPlaces([]);
        }
    };

    // Group places by date
    const groupedByDate = places.reduce((acc, p) => {
        if (!acc[p.visit_date]) acc[p.visit_date] = [];
        acc[p.visit_date].push(p);
        return acc;
    }, {});

    // Get sorted dates
    const dates = Object.keys(groupedByDate).sort();

    // Get places for selected date, sorted by visit_time and order_index
    const selectedPlaces = selectedDate
        ? (groupedByDate[selectedDate] || []).sort((a, b) => {
            const timeA = a.visit_time || '';
            const timeB = b.visit_time || '';
            if (timeA && timeB) {
                return timeA.localeCompare(timeB);
            } else if (timeA) {
                return -1;
            } else if (timeB) {
                return 1;
            }
            return (a.order_index || 0) - (b.order_index || 0);
        })
        : [];

    // Drag & Drop Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Prevent accidental drags on click
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Handle Drag End
    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            // Optimistic update
            const oldIndex = selectedPlaces.findIndex((item) => item.id === active.id);
            const newIndex = selectedPlaces.findIndex((item) => item.id === over.id);

            const newOrder = arrayMove(selectedPlaces, oldIndex, newIndex);

            // Update local state by reconstructing places list
            // 1. Remove current day's places
            const otherDayPlaces = places.filter(p => p.visit_date !== selectedDate);

            // 2. Update order_index for current day
            const updatedCurrentDay = newOrder.map((item, index) => ({ ...item, order_index: index }));

            // 3. Combine
            setPlaces([...otherDayPlaces, ...updatedCurrentDay]);

            // Call API to update backend
            try {
                // Update specific items that changed index? Or all?
                // For simplicity, update all affected items in background
                updatedCurrentDay.forEach(async (item, index) => {
                    if (item.order_index !== index) { // Only if changed (though we just set it)
                        // Actually 'item' has old order_index before map? No we mapped it.
                        // We need to compare with original?
                        // Just update all in newOrder with their new index.
                    }
                    await updatePlace(item.id, { order_index: index });
                });
            } catch (error) {
                console.error('Failed to update order:', error);
                loadPlaces(); // Revert on error
            }
        }
    };

    // Handle Taxi Card button
    const handleTaxiCard = (place) => {
        setSelectedPlace(place);
        setShowTaxiModal(true);
    };

    // Handle Navigation button - Open Naver Map in new tab
    const handleNavigation = (place) => {
        const searchQuery = encodeURIComponent(place.address_ko || place.name_ko);
        const naverMapUrl = `https://map.naver.com/v5/search/${searchQuery}`;
        window.open(naverMapUrl, '_blank');
    };

    // Search Handler
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setSearchResults([]);
        setSearchType('SPECIFIC');

        try {
            const data = await searchForeignPlaces(searchQuery);
            // data = { type: 'SPECIFIC' | 'CATEGORY', results: [...] }
            setSearchType(data.type || 'SPECIFIC');
            setSearchResults(data.results || []);
        } catch (error) {
            console.error('Search failed:', error);
            alert('Search failed. Please try again.');
        } finally {
            setIsSearching(false);
        }
    };

    // Handle Place Click for Description
    const handlePlaceClick = async (place) => {
        setSelectedPlace(place);
        setShowDescModal(true);
        setDescLoading(true);
        setPlaceDesc('');

        try {
            const data = await getPlaceDescription(place.name_en, place.address_en);
            setPlaceDesc(data.description);
        } catch (error) {
            console.error('Failed to get description:', error);
            setPlaceDesc('Failed to load description.');
        } finally {
            setDescLoading(false);
        }
    };

    // Add Place Handler — works for both SPECIFIC results and resolved CATEGORY items
    const handleAddPlace = async (place) => {
        const getKoreanDate = () => {
            const d = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };
        const targetDate = addDate || selectedDate || getKoreanDate();

        try {
            setIsAdding(true);

            // If it's a CATEGORY recommendation (no coordinates yet), resolve first
            let resolvedPlace = place;
            if (searchType === 'CATEGORY' && !place.mapx) {
                setIsResolving(true);
                try {
                    resolvedPlace = await resolvePlaceRecommendation(place.title_ko);
                } catch (err) {
                    console.error('Resolve failed, using stub:', err);
                    // Graceful degradation: continue with partial data
                } finally {
                    setIsResolving(false);
                }
            }

            const placeData = {
                name_en: resolvedPlace.title || place.title,
                name_ko: resolvedPlace.title_ko || place.title_ko || place.title,
                address_en: resolvedPlace.address || '',
                address_ko: resolvedPlace.address_ko || '',
                category: resolvedPlace.category || place.category,
                visit_date: targetDate,
                visit_time: addTime || null,
                map_x: resolvedPlace.mapx || '',
                map_y: resolvedPlace.mapy || '',
                notes: '',
                order_index: selectedPlaces.length
            };

            await addPlace(placeData);
            await loadPlaces();

            setShowAddModal(false);
            setSearchQuery('');
            setSearchResults([]);
            setSearchType('SPECIFIC');
            setSelectedDate(targetDate);
            setAddTime('');

        } catch (error) {
            console.error('Failed to add place:', error);
            alert('Failed to add place to itinerary.');
        } finally {
            setIsAdding(false);
            setIsResolving(false);
        }
    };

    // Badge colors for timeline items
    const getBadgeColor = (index) => {
        const colors = [
            'from-purple-500 to-indigo-600',
            'from-teal-500 to-cyan-600',
            'from-pink-500 to-rose-600',
            'from-amber-500 to-orange-600',
            'from-blue-500 to-indigo-600',
            'from-green-500 to-emerald-600',
        ];
        return colors[index % colors.length];
    };

    // Format date display
    const formatDateDisplay = (dateStr, index) => {
        // Parse explicitly from 'YYYY-MM-DD' without local timezone assumptions
        const [year, month, day] = dateStr.split('-');
        const date = new Date(year, month - 1, day);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayOfWeek = dayNames[date.getDay()];
        return `Day ${index + 1} ${month}.${day} (${dayOfWeek})`;
    };

    // Format 24h time string (HH:MM) to 12h AM/PM (hh:mm AM/PM)
    const formatTimeDisplay = (timeStr) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        let h = parseInt(hours);
        const m = minutes;
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12; // convert 0 to 12
        return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b shrink-0 z-20 shadow-sm">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <h1 className="text-2xl font-bold text-gray-800">Korea Trip</h1>
                    {dates.length > 0 && (
                        <p className="text-sm text-gray-500 mt-1">
                            {dates[0]} - {dates[dates.length - 1]}
                        </p>
                    )}
                </div>
            </div>

            {/* Day Selector */}
            <div className="bg-white border-b shrink-0 z-10 shadow-sm">
                <div className="max-w-3xl mx-auto px-4 py-3">
                    <div className="flex items-center gap-4 overflow-x-auto hide-scrollbar">
                        {dates.map((date, index) => (
                            <button
                                key={date}
                                onClick={() => setSelectedDate(date)}
                                className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${selectedDate === date
                                    ? 'bg-blue-500 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {formatDateDisplay(date, index)}
                            </button>
                        ))}
                        {dates.length === 0 && (
                            <p className="text-gray-500 text-sm">Please add an itinerary</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Timeline List - Scrollable Area */}
            <div className="flex-1 overflow-y-auto w-full">
                <div className="max-w-3xl mx-auto px-4 py-6 pb-32">
                    {selectedPlaces.length > 0 ? (
                        <div className="space-y-4">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={selectedPlaces.map(p => p.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {selectedPlaces.map((place, index) => (
                                        <SortableItem key={place.id} id={place.id}>
                                            <div className="relative">
                                                {/* Timeline connector */}
                                                {index < selectedPlaces.length - 1 && (
                                                    <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-gray-200 -mb-4"></div>
                                                )}

                                                <div className="flex gap-4">
                                                    {/* Number Badge (Drag Handle) */}
                                                    <div className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none">
                                                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getBadgeColor(index)} text-white flex items-center justify-center font-bold shadow-lg text-lg`}>
                                                            {index + 1}
                                                        </div>
                                                    </div>

                                                    {/* Place Card */}
                                                    <div
                                                        className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                                                        onClick={() => handlePlaceClick(place)}
                                                    >
                                                        {/* Place Info */}
                                                        <div className="mb-3">
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex items-center flex-wrap gap-2 mb-1">
                                                                    <h3 className="text-lg font-bold text-gray-800">
                                                                        {preferences.preferred_lang === 'ko' ? place.name_ko : place.name_en}
                                                                    </h3>
                                                                    {place.visit_time && (
                                                                        <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm border border-blue-100">
                                                                            {formatTimeDisplay(place.visit_time)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <button
                                                                    onPointerDown={(e) => e.stopPropagation()} // Prevent drag start
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation(); // Prevent opening description popup
                                                                        if (confirm('Delete this place?')) {
                                                                            await deletePlace(place.id);
                                                                            loadPlaces();
                                                                        }
                                                                    }}
                                                                    className="text-gray-400 hover:text-red-500"
                                                                >
                                                                    <FiX />
                                                                </button>
                                                            </div>
                                                            <p className="text-sm text-gray-500">
                                                                {place.category} • {preferences.preferred_lang === 'ko' ? place.address_ko : place.address_en}
                                                            </p>
                                                            {place.notes && (
                                                                <p className="text-sm text-gray-400 mt-2 italic">{place.notes}</p>
                                                            )}
                                                        </div>

                                                        {/* Action Buttons */}
                                                        <div className="flex gap-2">
                                                            <button
                                                                onPointerDown={(e) => e.stopPropagation()}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleTaxiCard(place);
                                                                }}
                                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
                                                            >
                                                                <FiCreditCard size={18} />
                                                                <span>Taxi Card</span>
                                                            </button>
                                                            <button
                                                                onPointerDown={(e) => e.stopPropagation()}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleNavigation(place);
                                                                }}
                                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-cyan-700 transition-all shadow-md hover:shadow-lg"
                                                            >
                                                                <FiNavigation size={18} />
                                                                <span>Navigation</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </SortableItem>
                                    ))}
                                </SortableContext>
                            </DndContext>
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <FiMapPin className="mx-auto text-6xl text-gray-300 mb-4" />
                            <p className="text-lg font-medium text-gray-500">No places added for this day</p>
                            <p className="text-sm text-gray-400 mt-2">Tap "Add Place" to plan your trip</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Action Buttons */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-10">
                <div className="max-w-3xl mx-auto px-4 py-4 flex gap-3">
                    <button
                        onClick={() => {
                            const getKoreanDate = () => {
                                const d = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
                                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                            };
                            setAddDate(selectedDate || getKoreanDate());
                            setAddTime('');
                            setShowAddModal(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                    >
                        <FiPlus size={20} />
                        <span>Add Place</span>
                    </button>
                </div>
            </div>

            {/* Add Place Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Place</h2>

                            {/* Date & Time Selector in Modal */}
                            <div className="mb-4 flex flex-col sm:flex-row gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={addDate}
                                        onChange={(e) => setAddDate(e.target.value)}
                                        className="w-full px-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Time (Optional)</label>
                                    <CustomTimePicker 
                                        value={addTime} 
                                        onChange={setAddTime} 
                                    />
                                </div>
                            </div>

                            <form onSubmit={handleSearch} className="flex gap-2">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search place (e.g. Gyeongbokgung)"
                                    className="flex-1 px-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={isSearching}
                                    className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {isSearching ? <FiLoader className="animate-spin" /> : <FiSearch />}
                                </button>
                            </form>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {isSearching && (
                                <div className="text-center py-8 text-gray-500">
                                    <FiLoader className="animate-spin mx-auto text-3xl mb-3" />
                                    <p>Analyzing & Searching...</p>
                                </div>
                            )}

                            {isResolving && (
                                <div className="text-center py-8 text-purple-500">
                                    <FiLoader className="animate-spin mx-auto text-3xl mb-3" />
                                    <p>Getting location details...</p>
                                </div>
                            )}

                            {!isSearching && searchResults.length === 0 && searchQuery && (
                                <div className="text-center py-8 text-gray-400">
                                    No results found. Try a clearer English keyword.
                                </div>
                            )}

                            {/* CATEGORY: AI Recommendation Cards */}
                            {searchType === 'CATEGORY' && searchResults.length > 0 && (
                                <div className="mb-3">
                                    <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2">
                                        ✨ AI Recommendations
                                    </p>
                                    <div className="space-y-3">
                                        {searchResults.map((result, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleAddPlace(result)}
                                                disabled={isAdding || isResolving}
                                                className="w-full text-left p-4 rounded-lg border border-purple-200 bg-purple-50 hover:border-purple-500 hover:bg-purple-100 transition-all group"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-bold text-gray-800 group-hover:text-purple-700">
                                                            {result.title}
                                                        </h3>
                                                        <p className="text-xs text-purple-500 mt-0.5">{result.title_ko}</p>
                                                        <p className="text-sm text-gray-600 mt-1">{result.desc_en}</p>
                                                    </div>
                                                    {(isAdding || isResolving) && <FiLoader className="animate-spin text-purple-500 mt-1" />}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* SPECIFIC: Naver Search Results */}
                            {searchType === 'SPECIFIC' && (
                                <div className="space-y-3">
                                    {searchResults.map((result, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleAddPlace(result)}
                                            disabled={isAdding}
                                            className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-bold text-gray-800 group-hover:text-blue-700">
                                                        {result.title}
                                                    </h3>
                                                    <p className="text-sm text-gray-600 mt-1">{result.address}</p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {result.title_ko} • {result.category}
                                                    </p>
                                                </div>
                                                {isAdding && <FiLoader className="animate-spin text-blue-500" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setShowAddModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <FiX size={24} />
                        </button>
                    </div>
                </div>
            )}

            {showTaxiModal && (
                <TaxiCardModal
                    place={selectedPlace}
                    onClose={() => {
                        setShowTaxiModal(false);
                        setSelectedPlace(null);
                    }}
                />
            )}

            {/* Place Description Modal */}
            {showDescModal && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-sm w-full relative p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                            {selectedPlace?.name_en || selectedPlace?.name_ko}
                        </h2>
                        <p className="text-sm text-gray-500 mb-4 border-b pb-4">
                            {selectedPlace?.address_en || selectedPlace?.address_ko}
                        </p>

                        {descLoading ? (
                            <div className="text-center py-8">
                                <FiLoader className="inline-block text-3xl text-purple-600 animate-spin mb-3" />
                                <p className="text-gray-500 text-sm">Asking AI for info...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold text-purple-700 uppercase tracking-wide mb-1">About this place</h3>
                                    <p className="text-gray-700 leading-relaxed text-sm">
                                        {placeDesc}
                                    </p>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => setShowDescModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <FiX size={24} />
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};

export default ItineraryPage;