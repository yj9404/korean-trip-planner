import React from 'react';
import { FaTimes } from 'react-icons/fa';

const TaxiCardModal = ({ place, onClose }) => {
    if (!place) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg max-w-md w-full p-8 relative" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <FaTimes size={24} />
                </button>

                <div className="text-center space-y-6">
                    <h2 className="text-2xl font-bold text-gray-800">택시 카드</h2>
                    <p className="text-sm text-gray-500">Show this to the taxi driver</p>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-xl border-2 border-indigo-200">
                        {/* Place Name */}
                        <div className="mb-6">
                            <p className="text-gray-600 text-sm mb-2">목적지</p>
                            <p className="text-4xl font-bold text-gray-900 leading-tight">
                                {place.name_ko}
                            </p>
                        </div>

                        {/* Address */}
                        <div>
                            <p className="text-gray-600 text-sm mb-2">주소</p>
                            <p className="text-2xl font-semibold text-gray-800 leading-relaxed">
                                {place.address_ko}
                            </p>
                        </div>
                    </div>

                    <p className="text-xs text-gray-400">Tap outside to close</p>
                </div>
            </div>
        </div>
    );
};

export default TaxiCardModal;
