import React from 'react';

const Loading = () => {
    return (
        <div className="fixed inset-0 bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center z-50">
            <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-8">
                    <div className="absolute inset-0 border-4 border-white/30 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Korea Trip Planner</h2>
                <p className="text-primary-100">Loading your adventure...</p>
            </div>
        </div>
    );
};

export default Loading;
