import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { usePolling } from '../hooks/usePolling';
import Logo from '../components/common/Logo';
import { Truck, Navigation, Play, Square, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Phone, MapPin, XCircle, Volume2 } from 'lucide-react';

export default function DriverSimulatorPage() {
  const [driverProfile, setDriverProfile] = useState(null);
  const [ambulance, setAmbulance] = useState(null);
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [status, setStatus] = useState('AVAILABLE');
  const [location, setLocation] = useState({ lat: 30.9050, lon: 75.8500 });
  const [autoMove, setAutoMove] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);
  const [activeRequest, setActiveRequest] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [modalRequest, setModalRequest] = useState(null);

  const notifiedReqIdsRef = useRef(new Set());
  const isInitialLoadRef = useRef(true);

  // Web Audio API Synthesizer Emergency Alert Tone
  const playEmergencySound = () => {
    if (!audioEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const now = ctx.currentTime;

      // Double-beep siren tone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.setValueAtTime(1174, now + 0.15);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.35);
      osc2.frequency.setValueAtTime(1174, now + 0.5);
      gain2.gain.setValueAtTime(0.3, now + 0.35);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.65);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.35);
      osc2.stop(now + 0.65);
    } catch (e) {
      console.warn('Audio alert playback error:', e);
    }
  };

  // Poll driver profile & incoming requests
  const fetchDriverData = async () => {
    try {
      const meRes = await api.getMe();
      if (meRes.data?.user?.driverProfile) {
        const dp = meRes.data.user.driverProfile;
        setDriverProfile(dp);
        setIsOnDuty(dp.is_on_duty);
        
        // Resolve real linked ambulance object
        const amb = dp.ambulance || (dp.ambulance_id ? {
          id: dp.ambulance_id,
          vehicle_number: dp.vehicle_number,
          status: dp.ambulance_status || 'OFF_DUTY',
          latitude: dp.latitude || 30.9009,
          longitude: dp.longitude || 75.8573
        } : null);
        
        setAmbulance(amb);
        if (amb && amb.latitude && amb.longitude) {
          setLocation({ lat: amb.latitude, lon: amb.longitude });
        }
      }

      const reqRes = await api.getIncomingRequests();
      const reqs = reqRes.data?.requests || [];
      setIncomingRequests(reqs);

      if (isInitialLoadRef.current) {
        // Baseline existing requests on initial mount/login (do not show popup or sound for pre-existing requests)
        reqs.forEach(r => notifiedReqIdsRef.current.add(r.id));
        isInitialLoadRef.current = false;
      } else {
        // Trigger popup and audio alert ONLY for newly created requests arriving after login/initial load
        const newReqs = reqs.filter(r => !notifiedReqIdsRef.current.has(r.id));
        if (newReqs.length > 0) {
          newReqs.forEach(r => notifiedReqIdsRef.current.add(r.id));
          playEmergencySound();
          setModalRequest(newReqs[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching driver data:', err);
    }
  };

  usePolling(fetchDriverData, 3000);

  // Auto-Movement Loop
  useEffect(() => {
    if (!autoMove || !ambulance?.id) return;

    const interval = setInterval(async () => {
      setLocation((prev) => {
        const dLat = (30.9009 - prev.lat) * 0.15;
        const dLon = (75.8573 - prev.lon) * 0.15;

        const newLat = parseFloat((prev.lat + (dLat !== 0 ? dLat : 0.0008)).toFixed(4));
        const newLon = parseFloat((prev.lon + (dLon !== 0 ? dLon : 0.0008)).toFixed(4));

        api.updateDriverLocation(newLat, newLon, ambulance.id)
          .catch((e) => console.error('Location update failed:', e));

        return { lat: newLat, lon: newLon };
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [autoMove, ambulance]);

  // Manual D-Pad step movement
  const moveDirection = async (dir) => {
    if (!ambulance?.id) {
      alert('No active ambulance registered for this driver profile.');
      return;
    }

    let { lat, lon } = location;
    const step = 0.0015;

    if (dir === 'NORTH') lat += step;
    if (dir === 'SOUTH') lat -= step;
    if (dir === 'EAST') lon += step;
    if (dir === 'WEST') lon -= step;

    lat = parseFloat(lat.toFixed(4));
    lon = parseFloat(lon.toFixed(4));
    setLocation({ lat, lon });

    try {
      await api.updateDriverLocation(lat, lon, ambulance.id);
    } catch (err) {
      console.error('Manual movement failed:', err);
    }
  };

  const handleToggleDuty = async () => {
    try {
      if (isOnDuty) {
        await api.endDuty();
        setIsOnDuty(false);
        setStatus('OFF_DUTY');
      } else {
        await api.startDuty();
        setIsOnDuty(true);
        setStatus('AVAILABLE');
      }
      fetchDriverData();
    } catch (err) {
      alert(err.message || 'Failed to toggle duty state.');
    }
  };

  const handleAcceptRequest = async (reqId) => {
    try {
      const res = await api.acceptRequest(reqId);
      setActiveTrip(res.data.trip);
      const targetReq = incomingRequests.find((r) => r.id === reqId);
      setActiveRequest(targetReq);
      setStatus('EN_ROUTE');
      if (modalRequest?.id === reqId) {
        setModalRequest(null);
      }
      fetchDriverData();
    } catch (err) {
      alert(err.message || 'Failed to accept request (may already be assigned to another driver).');
    }
  };

  const handleDeclineRequest = async (reqId) => {
    try {
      await api.declineRequest(reqId);
      setIncomingRequests(prev => prev.filter(r => r.id !== reqId));
      if (modalRequest?.id === reqId) {
        setModalRequest(null);
      }
      fetchDriverData();
    } catch (err) {
      alert(err.message || 'Failed to decline request.');
    }
  };

  const handleMarkArrived = async () => {
    if (!activeTrip) return;
    try {
      await api.markArrived(activeTrip.id);
      setStatus('ARRIVED');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleMarkPickedUp = async () => {
    if (!activeTrip) return;
    try {
      await api.markPatientPickedUp(activeTrip.id);
      setStatus('PATIENT_PICKED_UP');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCompleteTrip = async () => {
    if (!activeTrip) return;
    try {
      await api.completeTrip(activeTrip.id);
      setActiveTrip(null);
      setActiveRequest(null);
      setStatus('AVAILABLE');
      setAutoMove(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const currentModalRequest = modalRequest && incomingRequests.some(r => r.id === modalRequest.id) && !activeTrip ? modalRequest : null;

  const renderStatusBadge = () => {
    if (!isOnDuty) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-200 text-slate-700 border border-slate-300">
          OFF DUTY
        </span>
      );
    }
    switch (status) {
      case 'EN_ROUTE':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-sky-100 text-sky-800 border border-sky-300 animate-pulse">
            EN ROUTE TO PATIENT
          </span>
        );
      case 'ARRIVED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
            ARRIVED AT SCENE
          </span>
        );
      case 'PATIENT_PICKED_UP':
      case 'ON_TRIP':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-900 border border-purple-300">
            PATIENT PICKED UP
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
            ON DUTY • AVAILABLE
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 relative">
      
      {/* REAL EMERGENCY DRIVER POPUP MODAL */}
      {currentModalRequest && (
        <div className="fixed inset-0 z-[500] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full border-4 border-red-500 shadow-2xl overflow-hidden transform transition-all scale-100">
            {/* Header Siren Bar */}
            <div className="bg-gradient-to-r from-red-600 via-red-500 to-red-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl animate-bounce">🚨</span>
                <div>
                  <h2 className="text-xl font-extrabold uppercase tracking-wide">Emergency Dispatch Alert</h2>
                  <p className="text-xs text-red-100 font-semibold">Immediate Response Requested</p>
                </div>
              </div>
              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1"
                title="Toggle audio alerts"
              >
                <Volume2 className="w-4 h-4" />
                <span>{audioEnabled ? 'Audio On' : 'Muted'}</span>
              </button>
            </div>

            {/* Content Details */}
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Request #{currentModalRequest.id}</span>
                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-red-100 text-red-800 border border-red-200 uppercase animate-pulse">
                  CRITICAL DISPATCH
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Patient Emergency Symptoms</label>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 leading-relaxed">
                  "{currentModalRequest.description}"
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-100">
                  <span className="text-[10px] font-bold text-sky-700 uppercase block">Pickup Location</span>
                  <span className="font-extrabold text-slate-900">
                    {parseFloat(currentModalRequest.pickup_latitude).toFixed(4)}° N, {parseFloat(currentModalRequest.pickup_longitude).toFixed(4)}° E
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">Distance to Scene</span>
                  <span className="font-extrabold text-slate-900">Nearby Unit</span>
                </div>
              </div>

              {/* Action Buttons: DECLINE vs ACCEPT */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <button
                  onClick={() => handleDeclineRequest(currentModalRequest.id)}
                  className="py-4 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-sm border border-slate-300 flex items-center justify-center gap-2 transition-all"
                >
                  <XCircle className="w-5 h-5 text-slate-500" />
                  DECLINE
                </button>

                <button
                  onClick={() => handleAcceptRequest(currentModalRequest.id)}
                  className="py-4 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 transition-all hover:scale-105"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  ACCEPT REQUEST
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Mobile App Console Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Logo size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Driver Console</h1>
                <span className="text-[10px] font-extrabold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                  {ambulance?.vehicle_number || 'OFF DUTY'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Real-time emergency responder dispatch and location simulation unit.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {renderStatusBadge()}
            <button
              onClick={handleToggleDuty}
              className={`px-5 py-2.5 rounded-xl font-extrabold text-xs shadow-sm transition-all ${
                isOnDuty
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isOnDuty ? 'GO OFF DUTY' : 'START DUTY'}
            </button>
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Movement Pad & Active Trip Control */}
          <div className="lg:col-span-6 space-y-6">
            {/* GPS Simulation D-Pad Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-md font-extrabold text-slate-900 flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-sky-600" />
                  Vehicle GPS Location Controller
                </h3>
                <span className="text-[11px] font-bold text-slate-500">
                  {location.lat}° N, {location.lon}° E
                </span>
              </div>

              {/* D-Pad Controls */}
              <div className="flex flex-col items-center gap-2 py-2">
                <button
                  onClick={() => moveDirection('NORTH')}
                  disabled={!isOnDuty}
                  className="p-3 bg-slate-100 hover:bg-sky-50 text-slate-800 rounded-xl border border-slate-200 font-bold disabled:opacity-40 transition-colors"
                >
                  <ArrowUp className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => moveDirection('WEST')}
                    disabled={!isOnDuty}
                    className="p-3 bg-slate-100 hover:bg-sky-50 text-slate-800 rounded-xl border border-slate-200 font-bold disabled:opacity-40 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setAutoMove(!autoMove)}
                    disabled={!isOnDuty}
                    className={`px-4 py-3 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-sm ${
                      autoMove
                        ? 'bg-amber-500 text-slate-950 animate-pulse'
                        : 'bg-sky-600 hover:bg-sky-700 text-white'
                    }`}
                  >
                    {autoMove ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {autoMove ? 'PAUSE GPS' : 'AUTO DRIVE'}
                  </button>
                  <button
                    onClick={() => moveDirection('EAST')}
                    disabled={!isOnDuty}
                    className="p-3 bg-slate-100 hover:bg-sky-50 text-slate-800 rounded-xl border border-slate-200 font-bold disabled:opacity-40 transition-colors"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
                <button
                  onClick={() => moveDirection('SOUTH')}
                  disabled={!isOnDuty}
                  className="p-3 bg-slate-100 hover:bg-sky-50 text-slate-800 rounded-xl border border-slate-200 font-bold disabled:opacity-40 transition-colors"
                >
                  <ArrowDown className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Active Emergency Trip State Controls */}
            {activeTrip && (
              <div className="bg-white p-6 rounded-3xl border-2 border-sky-500 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-md font-extrabold text-slate-900 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-sky-600" />
                    Active Trip Lifecycle Control
                  </h3>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 uppercase">
                    Trip #{activeTrip.id}
                  </span>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleMarkArrived}
                    disabled={status === 'ARRIVED' || status === 'PATIENT_PICKED_UP' || status === 'COMPLETED'}
                    className="w-full py-3.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all disabled:opacity-40 shadow-sm"
                  >
                    1. Mark Arrived at Patient Location
                  </button>

                  <button
                    onClick={handleMarkPickedUp}
                    disabled={status !== 'ARRIVED'}
                    className="w-full py-3.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all disabled:opacity-40 shadow-sm"
                  >
                    2. Mark Patient Picked Up
                  </button>

                  <button
                    onClick={handleCompleteTrip}
                    disabled={status !== 'PATIENT_PICKED_UP' && status !== 'ON_TRIP'}
                    className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all disabled:opacity-40 shadow-md"
                  >
                    3. Complete Emergency Trip & Reset to Available
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Incoming Emergency Dispatches */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-md font-extrabold text-slate-900">Incoming Emergency Requests</h3>
                  <p className="text-xs text-slate-500 font-medium">Pending emergency dispatches nearby.</p>
                </div>
                <span className="text-xs bg-amber-100 text-amber-900 font-bold px-3 py-1 rounded-full border border-amber-200">
                  {incomingRequests.length} Pending
                </span>
              </div>

              {incomingRequests.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm font-medium bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
                  <div>No pending emergency requests right now.</div>
                  <div className="text-xs text-slate-400">New emergency requests created by patients will appear here immediately.</div>
                </div>
              ) : (
                <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                  {incomingRequests.map((req) => (
                    <div key={req.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:border-slate-300 transition-all space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🚨</span>
                          <div>
                            <div className="text-sm font-extrabold text-slate-900">Emergency Request #{req.id}</div>
                            <div className="text-[11px] font-semibold text-slate-500">Patient ID: {req.patient_id || 'Registered Patient'}</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full border border-red-200 uppercase">
                          HIGH PRIORITY
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800">
                        "{req.description}"
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handleDeclineRequest(req.id)}
                          className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl border border-slate-300 transition-all flex items-center justify-center gap-1.5"
                        >
                          <XCircle className="w-4 h-4 text-slate-500" />
                          DECLINE
                        </button>

                        <button
                          onClick={() => handleAcceptRequest(req.id)}
                          className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          ACCEPT
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
