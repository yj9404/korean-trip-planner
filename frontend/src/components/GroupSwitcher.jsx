import React, { useState } from 'react';
import { useGroup } from '../contexts/GroupContext';

const GroupSwitcher = () => {
    const { currentGroup, groups, switchGroup } = useGroup();
    const [isOpen, setIsOpen] = useState(false);

    // Don't show if user has no groups at all
    if (groups.length === 0) {
        return null;
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition border border-gray-300"
            >
                <span className="text-gray-800 font-medium">
                    {currentGroup ? currentGroup.name : '⚠️ Select Group'}
                </span>
                <svg
                    className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full mt-2 right-0 w-64 bg-white rounded-xl shadow-2xl overflow-hidden z-50 border border-gray-100">
                        <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600">
                            <p className="text-white text-xs font-semibold uppercase tracking-wide">Switch Group</p>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            {groups.map((group) => (
                                <button
                                    key={group.id}
                                    onClick={() => {
                                        if (group.id !== currentGroup?.id) {
                                            switchGroup(group.id);
                                        }
                                        setIsOpen(false);
                                    }}
                                    className={`w-full px-4 py-3 text-left hover:bg-indigo-50 transition flex items-center justify-between ${group.id === currentGroup?.id ? 'bg-indigo-100' : ''
                                        }`}
                                >
                                    <div>
                                        <p className="font-semibold text-gray-800">{group.name}</p>
                                        <p className="text-xs text-gray-500">Code: {group.invite_code}</p>
                                    </div>
                                    {group.id === currentGroup?.id && (
                                        <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default GroupSwitcher;
