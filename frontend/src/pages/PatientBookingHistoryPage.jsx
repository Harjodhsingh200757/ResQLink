import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { usePolling } from '../hooks/usePolling';
import { Clock, Calendar, MapPin, Truck, ChevronRight, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

export default function PatientBookingHistoryPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHistory = async () => {
    try {
      const res = await api.getMyRequests();
      setRequests(res.data.requests || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch booking history.');
    } finally {
      setLoading(false);
    }
  };

  usePolling(fetchHistory, 5000);

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" /> COMPLETED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300">
            <XCircle className="w-3.5 h-3.5" /> CANCELLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
            <Clock className="w-3.5 h-3.5" /> {status || 'PENDING'}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Clock className="w-6 h-6 text-sky-600" />
              Booking History
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Complete timeline of your previous ambulance emergency requests.
            </p>
          </div>
          <span className="text-xs font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
            {requests.length} Total Records
          </span>
        </div>

        {/* History Cards Stream */}
        {loading ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm text-center space-y-3">
            <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">Retrieving your emergency booking history...</p>
          </div>
        ) : error ? (
          <div className="bg-white p-8 rounded-3xl border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm text-center space-y-4">
            <Clock className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">No previous ambulance bookings.</h3>
              <p className="text-xs text-slate-500 font-medium">You have not created any emergency ambulance requests yet.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => {
              const reqDate = new Date(req.created_at);
              const formattedDate = reqDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
              const formattedTime = reqDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const displayStatus = req.trip_status || req.request_status;

              return (
                <div
                  key={req.id}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center text-2xl shrink-0 border border-sky-100">
                      🚑
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-slate-900">
                          {req.vehicle_number || 'Ambulance Unit'} {req.ambulance_type ? `(${req.ambulance_type})` : ''}
                        </span>
                        {renderStatusBadge(displayStatus)}
                      </div>
                      <div className="text-xs font-semibold text-slate-500 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formattedDate} • {formattedTime}
                        </span>
                        {req.driver_name && (
                          <span>Driver: <strong className="text-slate-700">{req.driver_name}</strong></span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5 pt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span>Pickup Location: {req.pickup_latitude} N, {req.pickup_longitude} E</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/request/${req.id}`)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-1 shrink-0"
                  >
                    View Details
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
