import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { FiPlus, FiCalendar, FiUsers, FiMapPin, FiEdit, FiTrash2 } from 'react-icons/fi';

const TripsPage = ({ user }) => {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        destinations: '',
    });

    useEffect(() => {
        loadTrips();
    }, []);

    const loadTrips = async () => {
        try {
            const [myTrips, participantTrips] = await Promise.all([
                apiService.getUserTrips(),
                apiService.getParticipantTrips(),
            ]);

            const allTrips = [...myTrips, ...participantTrips];
            const uniqueTrips = Array.from(new Map(allTrips.map(trip => [trip.id, trip])).values());

            setTrips(uniqueTrips);
        } catch (error) {
            console.error('Error loading trips:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const tripData = {
                ...formData,
                destinations: formData.destinations.split(',').map(d => d.trim()),
                participants: [user.uid],
                created_by: user.uid,
            };

            await apiService.createTrip(tripData);
            await loadTrips();
            setShowModal(false);
            setFormData({
                title: '',
                description: '',
                start_date: '',
                end_date: '',
                destinations: '',
            });
        } catch (error) {
            console.error('Error creating trip:', error);
            alert('Failed to create trip. Please try again.');
        }
    };

    const handleDelete = async (tripId) => {
        if (!confirm('Are you sure you want to delete this trip?')) return;

        try {
            await apiService.deleteTrip(tripId);
            await loadTrips();
        } catch (error) {
            console.error('Error deleting trip:', error);
            alert('Failed to delete trip. Please try again.');
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-header">My Trips</h1>
                    <p className="page-subheader">Plan and manage your Korea adventures</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="btn-primary flex items-center space-x-2"
                >
                    <FiPlus />
                    <span>New Trip</span>
                </button>
            </div>

            {/* Trips Grid */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                </div>
            ) : trips.length === 0 ? (
                <div className="card">
                    <div className="card-body text-center py-16">
                        <FiMapPin className="text-6xl text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No trips yet</h3>
                        <p className="text-gray-600 mb-6">Create your first trip to start planning!</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="btn-primary inline-flex items-center space-x-2"
                        >
                            <FiPlus />
                            <span>Create Your First Trip</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trips.map((trip) => (
                        <div key={trip.id} className="card group hover:scale-105 transition-transform duration-300">
                            <div className="card-body">
                                <div className="flex items-start justify-between mb-4">
                                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                                        {trip.title}
                                    </h3>
                                    <div className="flex space-x-2">
                                        <button className="p-2 text-gray-400 hover:text-primary-600 transition-colors">
                                            <FiEdit />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(trip.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </div>
                                </div>

                                <p className="text-gray-600 mb-4 line-clamp-2">
                                    {trip.description || 'No description provided'}
                                </p>

                                <div className="space-y-2">
                                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                                        <FiCalendar className="flex-shrink-0" />
                                        <span>
                                            {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
                                        </span>
                                    </div>

                                    {trip.destinations && trip.destinations.length > 0 && (
                                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                                            <FiMapPin className="flex-shrink-0" />
                                            <span className="truncate">{trip.destinations.join(', ')}</span>
                                        </div>
                                    )}

                                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                                        <FiUsers className="flex-shrink-0" />
                                        <span>{trip.participants?.length || 0} participants</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Trip Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-2xl font-bold text-gray-900">Create New Trip</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Trip Title *
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="input"
                                    placeholder="e.g., Seoul Family Adventure 2026"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="input h-24 resize-none"
                                    placeholder="Tell us about your trip..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Start Date *
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        className="input"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        End Date *
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        className="input"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Destinations
                                </label>
                                <input
                                    type="text"
                                    value={formData.destinations}
                                    onChange={(e) => setFormData({ ...formData, destinations: e.target.value })}
                                    className="input"
                                    placeholder="Seoul, Busan, Jeju (comma-separated)"
                                />
                            </div>

                            <div className="flex space-x-4 pt-4">
                                <button type="submit" className="btn-primary flex-1">
                                    Create Trip
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TripsPage;
