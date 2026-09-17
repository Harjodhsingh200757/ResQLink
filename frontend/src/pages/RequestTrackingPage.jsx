import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { usePolling } from '../hooks/usePolling';
import AmbulanceTrackingMap from '../components/map/AmbulanceTrackingMap';
import { Phone, AlertTriangle, CheckCircle, Clock, Shield, XCircle, ChevronLeft, RefreshCw, Sparkles, Navigation } from 'lucide-react';

export default function RequestTrackingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoSearch, setAutoSearch] = useState(false);
  const [autoAssignMessage, setAutoAssignMessage] = useState('');

  const queryToken = new URLSearchParams(location.search).get('token') || localStorage.getItem(`request_token_${id}`);

  const fetchRequest = async () => {
    try {
      const res = await api.getRequestById(id, queryToken);
      const req = res.data.request;
      setRequest(req);
      setLoading(false);

      // If Auto Search is enabled and request is still pending without assigned ambulance
      if (autoSearch && req && req.request_status === 'PENDING' && !req.assigned_ambulance_id) {
        try {
          const autoRes = await api.autoAssignEmergencyRequest(id);
          if (autoRes.data?.assigned) {
            setAutoAssignMessage(`Auto-assigned to nearest unit: ${autoRes.data.assignedAmbulance.vehicle_number}`);
          } else {
            setAutoAssignMessage('Auto Search active — Searching for next available ambulance unit...');
          }
        } catch (e) {
          console.warn('Auto assign attempt failed:', e);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch emergency request details.');
      setLoading(false);
    }
  };

  usePolling(fetchRequest, 3000);

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this emergency request?')) return;
    try {
      await api.cancelRequest(id, queryToken);
      fetchRequest();
    } catch (err) {
      alert(err.message || 'Failed to cancel request');
    }
  };

  const handleEnableAutoSearch = async () => {
    setAutoSearch(true);
    setAutoAssignMessage('Auto Search activated — Searching for nearest available ambulance...');
    try {
      const autoRes = await api.autoAssignEmergencyRequest(id);
      if (autoRes.data?.assigned) {
        setAutoAssignMessage(`Auto-assigned to nearest unit: ${autoRes.data.assignedAmbulance.vehicle_number}`);
      }
      fetchRequest();
    } catch (e) {
      console.warn('Auto assign trigger failed:', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4 max-w-md">
          <div className="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Connecting to Emergency Network...</h2>
          <p className="text-slate-500 text-xs">Assigning nearest available ambulance unit.</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex justify-center items-center">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-md text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">{error || 'Emergency Request Not Found'}</h2>
          <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-bold">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const patientLocation = { lat: request.pickup_latitude, lon: request.pickup_longitude };
  const assignedAmb = request.assigned_ambulance_id
    ? {
        id: request.assigned_ambulance_id,
        vehicleNumber: request.vehicle_number || 'AMB-UNIT',
        latitude: request.amb_lat || 30.9050,
        longitude: request.amb_lon || 75.8500,
        status: request.amb_status || 'EN_ROUTE'
      }
    : null;

  const currentStatus = request.trip_status || request.request_status;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                Emergency Request #{request.id}
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-200">
                  {currentStatus}
                </span>
              </h1>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Created at: {new Date(request.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>

          {currentStatus !== 'CANCELLED' && currentStatus !== 'COMPLETED' && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 flex items-center gap-1.5 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Cancel Request
            </button>
          )}
        </div>

        {/* Dynamic Status Progress Stepper */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
            <div className={`p-3 rounded-xl border ${currentStatus === 'ACCEPTED' || currentStatus === 'EN_ROUTE' ? 'bg-sky-50 text-sky-800 border-sky-300' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
              1. ACCEPTED
            </div>
            <div className={`p-3 rounded-xl border ${currentStatus === 'EN_ROUTE' ? 'bg-sky-50 text-sky-800 border-sky-300' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
              2. EN ROUTE
            </div>
            <div className={`p-3 rounded-xl border ${currentStatus === 'ARRIVED' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
              3. ARRIVED
            </div>
            <div className={`p-3 rounded-xl border ${currentStatus === 'PATIENT_PICKED_UP' || currentStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-900 border-emerald-400' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
              4. COMPLETED
            </div>
          </div>
        </div>

        {/* 2-Column Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Details */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Ambulance Unit / Pending Status Card */}
            {assignedAmb ? (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🚑</span>
                    <div>
                      <h3 className="text-md font-extrabold text-slate-900">{assignedAmb.vehicleNumber}</h3>
                      <p className="text-xs font-medium text-slate-500">Driver: {request.driver_name || 'Assigned Paramedic'}</p>
                    </div>
                  </div>
                  <a
                    href={`tel:${request.driver_phone || '+919876543210'}`}
                    className="p-2.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl border border-sky-200 flex items-center gap-1 text-xs font-bold"
                  >
                    <Phone className="w-4 h-4" />
                    Call
                  </a>
                </div>

                <div className="bg-sky-50/70 p-4 rounded-xl border border-sky-100 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-sky-700">Estimated Arrival Time</div>
                    <div className="text-xl font-extrabold text-sky-900">4 Minutes</div>
                  </div>
                  <Clock className="w-8 h-8 text-sky-600 opacity-80" />
                </div>
              </div>
            ) : (
              <div className="bg-amber-50/90 p-6 rounded-2xl border border-amber-300 text-amber-900 text-sm font-semibold space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-base flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                    <span>Awaiting Responder Acceptance</span>
                  </div>
                </div>

                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  Your request is active and broadcasted to nearby drivers. If a driver declines, Auto Search can automatically pair your request with the next nearest available ambulance.
                </p>

                {autoAssignMessage && (
                  <div className="p-3 bg-amber-100/80 rounded-xl border border-amber-300 text-xs font-bold text-amber-900 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-amber-700" />
                    <span>{autoAssignMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={() => navigate('/ambulances')}
                    className="py-3 px-3 bg-white hover:bg-amber-100 text-amber-900 rounded-xl border border-amber-300 font-extrabold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Navigation className="w-4 h-4" />
                    Search Another
                  </button>

                  <button
                    onClick={handleEnableAutoSearch}
                    className={`py-3 px-3 rounded-xl font-extrabold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all ${
                      autoSearch
                        ? 'bg-emerald-600 text-white animate-pulse'
                        : 'bg-sky-600 hover:bg-sky-700 text-white'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    {autoSearch ? 'Auto Search Active' : 'AUTO SEARCH'}
                  </button>
                </div>
              </div>
            )}

            {/* AI Emergency Structuring Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-sky-600" />
                AI Dispatch Summary
              </h4>
              <p className="text-sm font-semibold text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200">
                "{request.description}"
              </p>
              <div className="text-[11px] font-medium text-slate-500 bg-sky-50/60 p-2.5 rounded-lg border border-sky-100">
                ⚠️ <b className="text-sky-900">Disclaimer:</b> AI-generated information. Not a medical diagnosis. For dispatcher review only.
              </div>
            </div>
          </div>

          {/* Right Column: Live Tracking Map */}
          <div className="lg:col-span-7 h-[480px]">
            <AmbulanceTrackingMap
              patientLocation={patientLocation}
              assignedAmbulance={assignedAmb}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
