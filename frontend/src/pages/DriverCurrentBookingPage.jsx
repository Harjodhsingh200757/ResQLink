import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { usePolling } from '../hooks/usePolling';
import { Truck, MapPin, Clock, AlertCircle, CheckCircle2, ChevronRight, Navigation } from 'lucide-react';

export default function DriverCurrentBookingPage() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDriverTrips = async () => {
    try {
      const res = await api.getDriverTrips();
      setTrips(res.data.trips || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch driver trips.');
    } finally {
      setLoading(false);
    }
  };

  usePolling(fetchDriverTrips, 3000);

  const activeTrip = trips.find(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');

  const handleMarkArrived = async (tripId) => {
    try {
      await api.markArrived(tripId);
      fetchDriverTrips();
    } catch (err) {
      alert(err.message || 'Failed to update status to ARRIVED.');
    }
  };

  const handleMarkPickedUp = async (tripId) => {
    try {
      await api.markPatientPickedUp(tripId);
      fetchDriverTrips();
    } catch (err) {
      alert(err.message || 'Failed to update status to PATIENT_PICKED_UP.');
    }
  };

  const handleCompleteTrip = async (tripId) => {
    try {
      await api.completeTrip(tripId);
      fetchDriverTrips();
    } catch (err) {
      alert(err.message || 'Failed to complete trip.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-3 max-w-md">
          <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Loading assigned emergency booking...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Truck className="w-6 h-6 text-amber-600" />
              Driver Active Emergency Booking
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Active assigned emergency dispatch and progress execution.
            </p>
          </div>
          <span className="text-xs font-extrabold uppercase px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
            {activeTrip ? activeTrip.status : 'NO ACTIVE TRIP'}
          </span>
        </div>

        {/* Active Emergency Card */}
        {!activeTrip ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">No active emergency booking</h3>
              <p className="text-xs text-slate-500 font-medium">You are currently available for new emergency dispatches.</p>
            </div>
            <button
              onClick={() => navigate('/driver')}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all"
            >
              Return to Console
            </button>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🚨</span>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Active Emergency Dispatch (Trip #{activeTrip.id})
                  </h2>
                  <p className="text-xs font-semibold text-slate-500">Request #{activeTrip.request_id}</p>
                </div>
              </div>
              <span className="text-xs font-extrabold uppercase px-3 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
                {activeTrip.status}
              </span>
            </div>

            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 space-y-2">
              <div className="text-xs font-extrabold uppercase text-amber-900 tracking-wider">Emergency Description</div>
              <p className="text-sm font-semibold text-slate-900 bg-white p-3 rounded-xl border border-amber-100">
                "{activeTrip.description}"
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium text-slate-700">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Pickup Location</div>
                <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-sky-600" />
                  {activeTrip.pickup_latitude} N, {activeTrip.pickup_longitude} E
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Assigned Vehicle</div>
                <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-amber-600" />
                  {activeTrip.vehicle_number} ({activeTrip.ambulance_type})
                </div>
              </div>
            </div>

            {/* State Machine Transition Controls */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Trip Execution Controls</div>

              <button
                onClick={() => handleMarkArrived(activeTrip.id)}
                disabled={activeTrip.status !== 'EN_ROUTE' && activeTrip.status !== 'ASSIGNED'}
                className="w-full py-4 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition-all disabled:opacity-30 shadow-sm"
              >
                1. MARK ARRIVED AT PATIENT SCENE
              </button>

              <button
                onClick={() => handleMarkPickedUp(activeTrip.id)}
                disabled={activeTrip.status !== 'ARRIVED'}
                className="w-full py-4 px-6 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all disabled:opacity-30 shadow-sm"
              >
                2. MARK PATIENT PICKED UP
              </button>

              <button
                onClick={() => handleCompleteTrip(activeTrip.id)}
                disabled={activeTrip.status !== 'PATIENT_PICKED_UP'}
                className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all disabled:opacity-30 shadow-md"
              >
                3. COMPLETE TRIP & RESET AMBULANCE TO AVAILABLE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
