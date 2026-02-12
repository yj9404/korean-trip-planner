import React, { useState } from 'react';
import { FaMapMarkerAlt, FaTaxi, FaEdit, FaTrash, FaGripVertical } from 'react-icons/fa';
import TaxiCardModal from './TaxiCardModal';

const PlaceCard = ({ place, onEdit, onDelete, onReorder, preferences }) => {
    const [showTaxiCard, setShowTaxiCard] = useState(false);
    const lang = preferences?.preferred_lang || 'en';

    const openNaverMap = () => {
        if (place.naver_map_link) {
            window.open(place.naver_map_link, '_blank');
        } else if (place.coordinate_lat && place.coordinate_lng) {
            // Deeplink for Naver Map app or web fallback
            const naverUrl = `nmap://place?lat=${place.coordinate_lat}&lng=${place.coordinate_lng}&name=${encodeURIComponent(place.name_ko)}&appname=com.koreatripplanner`;
            const webFallback = `https://map.naver.com/v5/search/${encodeURIComponent(place.address_ko)}`;

            // Try app deeplink first, fallback to web
            window.location.href = naverUrl;
            setTimeout(() => window.open(webFallback, '_blank'), 500);
        } else {
            // Search by address
            const searchUrl = `https://map.naver.com/v5/search/${encodeURIComponent(place.address_ko)}`;
            window.open(searchUrl, '_blank');
        }
    };

    return (
        <>
            <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 border border-gray-100">
                {/* Drag Handle */}
                <div className="flex items-start gap-3">
                    <button
                        className="text-gray-400 hover:text-gray-600 cursor-move mt-1"
                        title="Drag to reorder"
                    >
                        <FaGripVertical size={18} />
                    </button>

                    <div className="flex-1">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900">
                                    {lang === 'ko' ? place.name_ko : place.name_en}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    {lang === 'ko' ? place.address_ko : (place.address_en || place.address_ko)}
                                </p>
                            </div>

                            {/* Time */}
                            {place.visit_time && (
                                <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                                    {place.visit_time}
                                </span>
                            )}
                        </div>

                        {/* Notes */}
                        {place.notes && (
                            <p className="text-sm text-gray-600 mb-4 italic">
                                {place.notes}
                            </p>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                            <button
                                onClick={openNaverMap}
                                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-center gap-2"
                            >
                                <FaMapMarkerAlt /> Naver Map
                            </button>

                            <button
                                onClick={() => setShowTaxiCard(true)}
                                className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-2 px-4 rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2"
                            >
                                <FaTaxi /> Taxi Card
                            </button>
                        </div>

                        {/* Edit/Delete */}
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={() => onEdit(place)}
                                className="flex-1 text-gray-600 hover:text-indigo-600 py-1 text-sm font-medium flex items-center justify-center gap-1"
                            >
                                <FaEdit /> Edit
                            </button>
                            <button
                                onClick={() => onDelete(place.id)}
                                className="flex-1 text-gray-600 hover:text-red-600 py-1 text-sm font-medium flex items-center justify-center gap-1"
                            >
                                <FaTrash /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Taxi Card Modal */}
            {showTaxiCard && (
                <TaxiCardModal
                    place={place}
                    onClose={() => setShowTaxiCard(false)}
                />
            )}
        </>
    );
};

export default PlaceCard;
