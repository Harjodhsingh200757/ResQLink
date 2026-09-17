import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import AmbulanceTrackingMap from '../components/map/AmbulanceTrackingMap';
import { MapPin, Navigation, AlertTriangle, Shield, Clock, Phone, RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react';

export default function FindAmbulancePage() {
  const navigate = useNavigate();
  
  // Default coordinates center (Ludhiana emergency network zone where simulated drivers operate)
  const DEFAULT_LAT = 30.9009;
  const DEFAULT_LON = 75.8573;

  const [patientLocation, setPatientLocation] = useState({ lat: DEFAULT_LAT, lon: DEFAULT_LON });
  const [locationSource, setLocationSource] = useState('DEFAULT'); // 'GPS' | 'DEFAULT'
  const [locationMessage, setLocationMessage] = useState('Resolving location...');
  
  const [radius, setRadius] = useState(50);
  const [ambulances, setAmbulances] = useState([]);
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState(null);
  const [loadingAmbulances, setLoadingAmbulances] = useState(true);
  const [ambulanceError, setAmbulanceError] = useState('');

  const [description, setDescription] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState('');

  // 1. Resolve Patient Location
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPatientLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          setLocationSource('GPS');
          setLocationMessage('Live GPS location active');
        },
        (err) => {
          console.warn('Geolocation unavailable or denied, falling back to Ludhiana center:', err.message);
          setPatientLocation({ lat: DEFAULT_LAT, lon: DEFAULT_LON });
          setLocationSource('DEFAULT');
          setLocationMessage('Using default emergency center location (30.9009° N, 75.8573° E)');
        },
        { timeout: 5000, maximumAge: 60000 }
      );
    } else {
      setPatientLocation({ lat: DEFAULT_LAT, lon: DEFAULT_LON });
      setLocationSource('DEFAULT');
      setLocationMessage('Browser GPS unavailable; using default emergency center location');
    }
  }, []);

  // 2. Fetch Nearby Ambulances from Backend API
  const fetchNearbyAmbulances = async () => {
    setLoadingAmbulances(true);
    setAmbulanceError('');
    try {
      const res = await api.getNearbyAmbulances(patientLocation.lat, patientLocation.lon, radius);
      const list = res.data?.ambulances || [];
      setAmbulances(list);
      
      // Auto-select nearest ambulance if available and none selected yet
      if (list.length > 0) {
        setSelectedAmbulanceId(prev => prev || list[0].id);
      } else {
        setSelectedAmbulanceId(null);
      }
    } catch (err) {
      console.error('Error fetching nearby ambulances:', err);
      setAmbulanceError(err.message || 'Failed to connect to ambulance network. Please try again.');
    } finally {
      setLoadingAmbulances(false);
    }
  };

  useEffect(() => {
    fetchNearbyAmbulances();
  }, [patientLocation, radius]);

  // 3. Handle Dispatch Emergency Request
  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setDispatchError('Please describe the emergency symptoms or situation.');
      return;
    }

    setDispatching(true);
    setDispatchError('');

    try {
      const res = await api.createEmergencyRequest({
        pickup_latitude: patientLocation.lat,
        pickup_longitude: patientLocation.lon,
        description: description.trim(),
        selected_ambulance_id: selectedAmbulanceId || null
      });

      const request = res.data?.request;
      if (request && request.id) {
        if (request.tracking_token) {
          localStorage.setItem(`request_token_${request.id}`, request.tracking_token);
        }
        navigate(`/request/${request.id}`);
      } else {
        throw new Error('Invalid emergency request response received.');
      }
    } catch (err) {
      console.error('Error creating emergency request:', err);
      setDispatchError(err.message || 'Failed to dispatch ambulance. Please try again.');
      setDispatching(false);
    }
  };

  const selectedAmbulance = ambulances.find(a => a.id === selectedAmbulanceId);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 text-sky-800 text-xs font-bold border border-sky-200 mb-2">
              <MapPin className="w-3.5 h-3.5 text-sky-600" />
              <span>Real-Time Ambulance Availability</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Find & Dispatch Nearby Ambulance
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1">
              Select an available responder unit and submit emergency symptoms for instant dispatch.
            </p>
          </div>

          {/* Location Status Pill & Radius Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div className={`px-3.5 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 ${
              locationSource === 'GPS' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${locationSource === 'GPS' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>{locationMessage}</span>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
              <span className="px-2">Radius:</span>
              {[10, 25, 50, 100].map((r) => (
                <button
                  key={r}
                  onClick={() => setRadius(r)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    radius === r ? 'bg-sky-600 text-white shadow-sm' : 'hover:bg-slate-200'
                  }`}
                >
                  {r}km
                </button>
              ))}
            </div>

            <button
              onClick={fetchNearbyAmbulances}
              disabled={loadingAmbulances}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors shadow-sm"
              title="Refresh nearby ambulances"
            >
              <RefreshCw className={`w-4 h-4 ${loadingAmbulances ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 2-Column Main Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Form & Available Ambulance Selector */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Emergency Symptom & Request Form */}
            <form onSubmit={handleDispatch} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-sky-600" />
                  1. Emergency Details & Triage
                </h2>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  Describe the patient's symptoms (AI will structure emergency priority for the driver).
                </p>
              </div>

              {dispatchError && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{dispatchError}</span>
                </div>
              )}

              <div>
                <label htmlFor="symptoms-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Patient Symptoms / Emergency Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="symptoms-input"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Patient experiencing severe chest pain, shortness of breath, and sweating..."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm font-medium text-slate-900 shadow-sm"
                  required
                />
              </div>

              {/* Selected Unit Summary */}
              {selectedAmbulance ? (
                <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-sky-900">Selected Unit:</span>
                    <span className="font-extrabold text-slate-900 ml-1.5">{selectedAmbulance.vehicleNumber} ({selectedAmbulance.ambulanceType})</span>
                    <div className="text-slate-600 font-medium mt-0.5">
                      {selectedAmbulance.distanceKm} km away • Est. ETA ~{selectedAmbulance.estimatedMinutes} mins
                    </div>
                  </div>
                  <CheckCircle2 className="w-6 h-6 text-sky-600 shrink-0" />
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-500">
                  {ambulances.length > 0 ? 'Select a responder unit below or closest will be auto-assigned.' : 'Broadcast dispatch to all on-duty network drivers.'}
                </div>
              )}

              <button
                type="submit"
                disabled={dispatching}
                className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-base shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-50"
              >
                {dispatching ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Dispatching Ambulance...</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-5 h-5" />
                    <span>DISPATCH EMERGENCY AMBULANCE</span>
                    <ArrowRight className="w-5 h-5 ml-1" />
                  </>
                )}
              </button>
            </form>

            {/* Nearby Ambulances List */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-sky-600" />
                  2. Nearby Available Ambulances ({ambulances.length})
                </h2>
                <span className="text-xs font-bold text-slate-500">Sorted by distance</span>
              </div>

              {loadingAmbulances ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-slate-500">Searching active ambulance units within {radius}km...</p>
                </div>
              ) : ambulanceError ? (
                <div className="p-6 text-center bg-red-50 rounded-2xl border border-red-200 space-y-3">
                  <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
                  <p className="text-xs font-bold text-red-800">{ambulanceError}</p>
                  <button onClick={fetchNearbyAmbulances} className="px-4 py-2 bg-red-600 text-white text-xs font-extrabold rounded-xl shadow-sm">
                    Retry Search
                  </button>
                </div>
              ) : ambulances.length === 0 ? (
                <div className="p-8 text-center bg-amber-50/70 rounded-2xl border border-amber-200 space-y-3">
                  <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto opacity-80" />
                  <h3 className="text-sm font-extrabold text-amber-900">No AVAILABLE Ambulances Nearby</h3>
                  <p className="text-xs font-medium text-amber-800 max-w-md mx-auto">
                    No active drivers are currently ON DUTY in this radius. You can still submit an emergency request to broadcast to the network, or start a driver in Driver Simulator.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                  {ambulances.map((amb) => {
                    const isSelected = selectedAmbulanceId === amb.id;
                    return (
                      <div
                        key={amb.id}
                        onClick={() => setSelectedAmbulanceId(amb.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                          isSelected
                            ? 'bg-sky-50 border-sky-500 shadow-md ring-2 ring-sky-400/30'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-2xl shadow-sm border border-slate-200 shrink-0">
                            🚑
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-extrabold text-slate-900">{amb.vehicleNumber}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase bg-sky-100 text-sky-800 border border-sky-200">
                                {amb.ambulanceType}
                              </span>
                            </div>
                            <div className="text-xs font-semibold text-slate-500 mt-0.5">
                              Driver: {amb.driverName} • {amb.driverPhone}
                            </div>
                            <div className="text-xs font-bold text-sky-700 mt-1 flex items-center gap-3">
                              <span>📍 {amb.distanceKm} km away</span>
                              <span>⏱️ ETA ~{amb.estimatedMinutes} mins</span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <input
                            type="radio"
                            name="selectedAmbulance"
                            checked={isSelected}
                            onChange={() => setSelectedAmbulanceId(amb.id)}
                            className="w-5 h-5 text-sky-600 focus:ring-sky-500 border-slate-300"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Interactive Map */}
          <div className="lg:col-span-6 flex flex-col h-[600px] bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-3 px-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-600" />
                Live Dispatch Map View
              </h3>
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {ambulances.length} Units Visible
              </span>
            </div>

            <div className="flex-1 rounded-2xl overflow-hidden">
              <AmbulanceTrackingMap
                patientLocation={patientLocation}
                ambulances={ambulances}
                assignedAmbulance={selectedAmbulance}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
