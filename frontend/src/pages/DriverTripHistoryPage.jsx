import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { usePolling } from '../hooks/usePolling';
import { Truck, Calendar, Clock, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';

export default function DriverTripHistoryPage() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDriverTrips = async () => {
    try {
      const res = await api.getDriverTrips();
      setTrips(res.data.trips || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch trip history.');
    } finally {
      setLoading(false);
    }
  };

  usePolling(fetchDriverTrips, 5000);

  const completedTrips = trips.filter(t => t.status === 'COMPLETED');

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              Completed Trips History
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Historical record of emergency dispatches completed by your assigned ambulance.
            </p>
          </div>
          <span className="text-xs font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
            {completedTrips.length} Completed Trips
          </span>
        </div>

        {/* Content Stream */}
        {loading ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">Retrieving your completed trips history...</p>
          </div>
        ) : error ? (
          <div className="bg-white p-8 rounded-3xl border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        ) : completedTrips.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm text-center space-y-4">
            <Truck className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">No completed trips yet.</h3>
              <p className="text-xs text-slate-500 font-medium">Completed emergency dispatches assigned to your vehicle will appear here.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {completedTrips.map((trip) => {
              const startDate = trip.started_at ? new Date(trip.started_at) : new Date();
              const formattedDate = startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
              const formattedTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={trip.id}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-2xl shrink-0 border border-emerald-200">
                      🚑
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-slate-900">
                          Trip #{trip.id} • Request #{trip.request_id}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5" /> COMPLETED
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-500 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formattedDate} • {formattedTime}
                        </span>
                        <span>Vehicle: <strong className="text-slate-800">{trip.vehicle_number}</strong> ({trip.ambulance_type})</span>
                      </div>
                      <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5 pt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span>Pickup Location: {trip.pickup_latitude} N, {trip.pickup_longitude} E</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
