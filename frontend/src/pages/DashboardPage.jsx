import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { FiMap, FiPlus, FiCalendar, FiUsers, FiTrendingUp } from 'react-icons/fi';

const DashboardPage = ({ user }) => {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTrips();
    }, []);

    const loadTrips = async () => {
        try {
            const [myTrips, participantTrips] = await Promise.all([
                apiService.getUserTrips(),
                apiService.getParticipantTrips(),
            ]);

            // Combine and deduplicate trips
            const allTrips = [...myTrips, ...participantTrips];
            const uniqueTrips = Array.from(new Map(allTrips.map(trip => [trip.id, trip])).values());

            setTrips(uniqueTrips);
        } catch (error) {
            console.error('Error loading trips:', error);
        } finally {
            setLoading(false);
        }
    };

    const stats = [
        {
            icon: FiMap,
            label: 'Total Trips',
            value: trips.length,
            color: 'from-blue-500 to-cyan-500',
        },
        {
            icon: FiCalendar,
            label: 'Upcoming',
            value: trips.filter(t => new Date(t.start_date) > new Date()).length,
            color: 'from-purple-500 to-pink-500',
        },
        {
            icon: FiUsers,
            label: 'Participants',
            value: trips.reduce((sum, t) => sum + (t.participants?.length || 0), 0),
            color: 'from-green-500 to-emerald-500',
        },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Welcome Section */}
            <div className="bg-gradient-to-br from-primary-600 to-purple-700 rounded-2xl p-8 text-white shadow-xl">
                <h1 className="text-3xl sm:text-4xl font-bold mb-2">
                    Welcome back, {user?.displayName || 'Explorer'}! 👋
                </h1>
                <p className="text-primary-100 text-lg">
                    Ready to plan your next adventure in Korea?
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={index}
                            className="card group hover:scale-105 transition-transform duration-300"
                        >
                            <div className="card-body">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                                        <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                                    </div>
                                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow`}>
                                        <Icon className="text-white text-2xl" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Link
                        to="/trips"
                        className="card group hover:scale-105 transition-transform duration-300"
                    >
                        <div className="card-body text-center">
                            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <FiPlus className="text-white text-2xl" />
                            </div>
                            <h3 className="font-semibold text-gray-900">New Trip</h3>
                            <p className="text-sm text-gray-600">Plan a new adventure</p>
                        </div>
                    </Link>

                    <Link
                        to="/ai-guide"
                        className="card group hover:scale-105 transition-transform duration-300"
                    >
                        <div className="card-body text-center">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <FiTrendingUp className="text-white text-2xl" />
                            </div>
                            <h3 className="font-semibold text-gray-900">AI Guide</h3>
                            <p className="text-sm text-gray-600">Get recommendations</p>
                        </div>
                    </Link>

                    <Link
                        to="/translate"
                        className="card group hover:scale-105 transition-transform duration-300"
                    >
                        <div className="card-body text-center">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <FiMap className="text-white text-2xl" />
                            </div>
                            <h3 className="font-semibold text-gray-900">Translate</h3>
                            <p className="text-sm text-gray-600">Quick translation</p>
                        </div>
                    </Link>

                    <Link
                        to="/trips"
                        className="card group hover:scale-105 transition-transform duration-300"
                    >
                        <div className="card-body text-center">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <FiUsers className="text-white text-2xl" />
                            </div>
                            <h3 className="font-semibold text-gray-900">My Trips</h3>
                            <p className="text-sm text-gray-600">View all trips</p>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Recent Trips */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">Recent Trips</h2>
                    <Link to="/trips" className="text-primary-600 hover:text-primary-700 font-medium">
                        View All
                    </Link>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                    </div>
                ) : trips.length === 0 ? (
                    <div className="card">
                        <div className="card-body text-center py-12">
                            <FiMap className="text-6xl text-gray-300 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">No trips yet</h3>
                            <p className="text-gray-600 mb-6">Start planning your first Korea adventure!</p>
                            <Link to="/trips" className="btn-primary inline-flex items-center space-x-2">
                                <FiPlus />
                                <span>Create Your First Trip</span>
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {trips.slice(0, 6).map((trip) => (
                            <Link
                                key={trip.id}
                                to={`/trips`}
                                className="card group hover:scale-105 transition-transform duration-300"
                            >
                                <div className="card-body">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                                        {trip.title}
                                    </h3>
                                    <p className="text-gray-600 mb-4 line-clamp-2">
                                        {trip.description || 'No description'}
                                    </p>
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center space-x-2 text-gray-500">
                                            <FiCalendar />
                                            <span>{new Date(trip.start_date).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center space-x-2 text-gray-500">
                                            <FiUsers />
                                            <span>{trip.participants?.length || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardPage;
