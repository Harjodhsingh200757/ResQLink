import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, ChevronLeft, Phone } from 'lucide-react';
import { api } from '../services/api';
import { usePolling } from '../hooks/usePolling';
import AmbulanceTrackingMap from '../components/map/AmbulanceTrackingMap';
import { calculateHaversineDistance, calculateETA } from '../utils/haversine';

export default function PatientCurrentBookingPage() {
  const navigate = useNavigate();
  const [activeRequest, setActiveRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCurrentBooking = async () => {
    try {
      const res = await api.getMyRequests();
      const requests = res.data?.requests || res.requests || [];
      const active = requests.find(r => 
        r.request_status === 'PENDING' || 
        r.request_status === 'ACCEPTED' || 
        (r.trip_status && r.trip_status !== 'COMPLETED' && r.trip_status !== 'CANCELLED')
      );
      setActiveRequest(active || null);
      setError('');
    } catch (err) {
      console.error('Error fetching current booking:', err);
      // Gracefully set activeRequest to null rather than showing raw error screen
      setActiveRequest(null);
    } finally {
      setLoading(false);
    }
  };

  usePolling(fetchCurrentBooking, 3000);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-3 max-w-md">
          <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Connecting to active ambulance booking...</p>
        </div>
      </div>
    );
  }

  if (error || !activeRequest) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex justify-center items-center">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-md text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">No active ambulance booking</h2>
          <p className="text-xs text-slate-500 font-medium">You currently do not have an active ambulance request in progress.</p>
          <Link to="/ambulances" className="inline-block px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-extrabold shadow-md transition-all">
            Find an Ambulance
          </Link>
        </div>
      </div>
    );
  }

  const patientLocation = { lat: parseFloat(activeRequest.pickup_latitude), lon: parseFloat(activeRequest.pickup_longitude) };
  const assignedAmb = activeRequest.assigned_ambulance_id
    ? {
        id: activeRequest.assigned_ambulance_id,
        vehicleNumber: activeRequest.vehicle_number || 'AMB-UNIT',
        latitude: activeRequest.amb_lat ? parseFloat(activeRequest.amb_lat) : 30.9050,
        longitude: activeRequest.amb_lon ? parseFloat(activeRequest.amb_lon) : 75.8500,
        status: activeRequest.amb_status || 'EN_ROUTE'
      }
    : null;

  const realDistance = (assignedAmb && !isNaN(patientLocation.lat) && !isNaN(assignedAmb.latitude))
    ? calculateHaversineDistance(patientLocation.lat, patientLocation.lon, assignedAmb.latitude, assignedAmb.longitude)
    : null;

  const realETA = realDistance ? calculateETA(realDistance) : null;

  const currentStatus = activeRequest.trip_status || activeRequest.request_status;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900">
                  Current Ambulance Booking #{activeRequest.id}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-extrabold uppercase bg-sky-100 text-sky-800 border border-sky-200">
                  {currentStatus}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Requested at: {activeRequest.created_at ? new Date(activeRequest.created_at).toLocaleTimeString() : 'Just now'}
              </p>
            </div>
          </div>

          <Link
            to={`/request/${activeRequest.id}`}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all"
          >
            Live Tracking
          </Link>
        </div>

        {/* 2-Column Booking Details Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Details */}
          <div className="lg:col-span-5 space-y-6">
            {/* Assigned Ambulance Summary */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🚑</span>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Ambulance {activeRequest.vehicle_number || 'Assigned Unit'}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500">
                      Type: {activeRequest.ambulance_type || 'ADVANCED'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-xs font-medium text-slate-700">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-bold uppercase">Driver Name</span>
                  <span className="font-extrabold text-slate-900">{activeRequest.driver_name || 'Assigned Paramedic'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-bold uppercase">Estimated ETA</span>
                  <span className="font-extrabold text-sky-700">{realETA ? `~${realETA} minutes` : 'Calculating...'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-bold uppercase">Distance</span>
                  <span className="font-extrabold text-slate-900">{realDistance !== null ? `${realDistance} km` : 'Calculating...'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-bold uppercase">Emergency Location</span>
                  <span className="font-bold text-slate-800">{activeRequest.pickup_latitude}° N, {activeRequest.pickup_longitude}° E</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-bold uppercase">Ambulance GPS</span>
                  <span className="font-bold text-slate-800">
                    {activeRequest.amb_lat ? `${activeRequest.amb_lat}° N, ${activeRequest.amb_lon}° E` : 'Location updating'}
                  </span>
                </div>
              </div>

              {activeRequest.driver_phone && (
                <a
                  href={`tel:${activeRequest.driver_phone}`}
                  className="w-full py-3 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl border border-sky-200 flex items-center justify-center gap-2 text-xs font-extrabold transition-all"
                >
                  <Phone className="w-4 h-4" />
                  Call Driver ({activeRequest.driver_phone})
                </a>
              )}
            </div>
          </div>

          {/* Right Column: Live Map */}
          <div className="lg:col-span-7 h-[460px]">
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
