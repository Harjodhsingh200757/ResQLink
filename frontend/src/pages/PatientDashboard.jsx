import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePolling } from '../hooks/usePolling';
import Logo from '../components/common/Logo';
import { MapPin, ArrowRight, Clock, Shield, CheckCircle2, AlertCircle, Sparkles, Navigation } from 'lucide-react';

export default function PatientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeBooking, setActiveBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchActiveBooking = async () => {
    try {
      const res = await api.getMyRequests();
      const requests = res.data.requests || [];
      const active = requests.find(r => 
        r.request_status === 'PENDING' || 
        r.request_status === 'ACCEPTED' || 
        (r.trip_status && r.trip_status !== 'COMPLETED' && r.trip_status !== 'CANCELLED')
      );
      setActiveBooking(active || null);
    } catch (err) {
      console.error('Error fetching patient active booking:', err);
    } finally {
      setLoading(false);
    }
  };

  usePolling(fetchActiveBooking, 4000);

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Logo size="sm" />
              <span className="text-xs font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
                Patient Portal
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              {getTimeGreeting()}, {user?.name || 'Patient'}
            </h1>
            <p className="text-slate-500 text-sm font-medium mt-1">
              Real-time ambulance dispatch and emergency tracking network.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3.5 py-1.5 rounded-full border border-emerald-200 text-xs font-bold self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            24/7 Network Online
          </div>
        </div>

        {/* Emergency Call-to-Action Hero Card */}
        <div className="bg-gradient-to-r from-sky-600 to-sky-800 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Need an Ambulance?</h2>
            <p className="text-sky-100 text-sm font-medium max-w-md">
              Nearby emergency response units are on duty and ready to dispatch to your exact location.
            </p>
          </div>
          <Link
            to="/ambulances"
            className="w-full md:w-auto px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-2xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all hover:scale-105 shrink-0 text-base"
          >
            <MapPin className="w-5 h-5" />
            Find an Ambulance
            <ArrowRight className="w-5 h-5 ml-1" />
          </Link>
        </div>

        {/* CURRENT BOOKING SECTION */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" />
              CURRENT BOOKING
            </h3>
            {activeBooking && (
              <span className="text-xs font-bold px-3 py-1 rounded-full uppercase bg-sky-100 text-sky-800 border border-sky-200">
                {activeBooking.trip_status || activeBooking.request_status}
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Checking active bookings...</p>
            </div>
          ) : activeBooking ? (
            <div className="bg-sky-50/70 p-6 rounded-2xl border border-sky-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-3xl shadow-sm border border-sky-200">
                  🚑
                </div>
                <div>
                  <div className="text-base font-extrabold text-slate-900">
                    Ambulance {activeBooking.vehicle_number || 'Assigned Unit'} ({activeBooking.ambulance_type || 'ADVANCED'})
                  </div>
                  <div className="text-xs font-semibold text-slate-600 mt-0.5">
                    Driver: {activeBooking.driver_name || 'Assigned Driver'} • Request #{activeBooking.id}
                  </div>
                  <div className="text-xs font-bold text-sky-700 mt-1 flex items-center gap-1.5">
                    <span>ETA ~4 min</span>
                    <span>•</span>
                    <span className="uppercase text-emerald-600 font-extrabold">{activeBooking.trip_status || 'EN ROUTE'}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate(`/request/${activeBooking.id}`)}
                className="w-full sm:w-auto px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0"
              >
                <Navigation className="w-4 h-4" />
                Track Ambulance
              </button>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <AlertCircle className="w-10 h-10 text-slate-400 mx-auto opacity-60" />
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-800">No active ambulance booking</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                  When you request an ambulance, your active dispatch and live tracking details will appear here.
                </p>
              </div>
              <Link
                to="/ambulances"
                className="inline-flex items-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all"
              >
                <MapPin className="w-4 h-4" />
                Find an Ambulance
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
