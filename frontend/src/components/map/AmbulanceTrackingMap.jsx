import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom Leaflet DivIcons for Light Theme Aesthetics
const createPatientIcon = () => {
  return L.divIcon({
    className: 'custom-patient-marker',
    html: `<div class="patient-pulse-marker flex items-center justify-center text-white text-xs font-bold">📍</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

const createAmbulanceIcon = (vehicleNum, status) => {
  const isEnRoute = status === 'EN_ROUTE' || status === 'ON_TRIP';
  return L.divIcon({
    className: 'custom-ambulance-marker',
    html: `
      <div class="flex flex-col items-center">
        <div class="bg-white px-2 py-0.5 rounded-md shadow-md border border-slate-200 text-[10px] font-bold text-slate-800 flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full ${isEnRoute ? 'bg-sky-500 animate-ping' : 'bg-emerald-500'}"></span>
          ${vehicleNum}
        </div>
        <div class="text-2xl hover:scale-125 transition-transform cursor-pointer">🚑</div>
      </div>
    `,
    iconSize: [60, 45],
    iconAnchor: [30, 25]
  });
};

// Component to dynamically re-center map when focused item changes
function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
}

// Component to force Leaflet to recalculate container bounds & prevent grey tiles
function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);
  return null;
}

// Marker component with smooth coordinate interpolation (linear lerp)
function InterpolatedAmbulanceMarker({ ambulance }) {
  const [currentPos, setCurrentPos] = useState([ambulance.latitude, ambulance.longitude]);
  const targetPosRef = useRef([ambulance.latitude, ambulance.longitude]);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    targetPosRef.current = [ambulance.latitude, ambulance.longitude];

    const animateMove = () => {
      setCurrentPos((prev) => {
        const [lat1, lon1] = prev;
        const [lat2, lon2] = targetPosRef.current;

        const dLat = lat2 - lat1;
        const dLon = lon2 - lon1;

        // Linear interpolation factor (0.15 for smooth transitions)
        if (Math.abs(dLat) < 0.00001 && Math.abs(dLon) < 0.00001) {
          return [lat2, lon2];
        }

        const nextLat = lat1 + dLat * 0.15;
        const nextLon = lon1 + dLon * 0.15;

        animationFrameRef.current = requestAnimationFrame(animateMove);
        return [nextLat, nextLon];
      });
    };

    animationFrameRef.current = requestAnimationFrame(animateMove);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [ambulance.latitude, ambulance.longitude]);

  return (
    <Marker
      position={currentPos}
      icon={createAmbulanceIcon(ambulance.vehicleNumber || ambulance.vehicle_number || 'AMB', ambulance.status)}
    >
      <Popup>
        <div className="p-1 text-slate-800">
          <div className="font-bold text-sm text-sky-700">{ambulance.vehicleNumber || ambulance.vehicle_number}</div>
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 my-0.5">{ambulance.status}</div>
          {ambulance.distanceKm && <div className="text-xs text-slate-600">Distance: <b>{ambulance.distanceKm} km</b></div>}
          {ambulance.estimatedMinutes && <div className="text-xs text-slate-600">ETA: <b>{ambulance.estimatedMinutes} mins</b></div>}
        </div>
      </Popup>
    </Marker>
  );
}

export default function AmbulanceTrackingMap({ patientLocation, ambulances = [], assignedAmbulance = null }) {
  const defaultCenter = patientLocation ? [patientLocation.lat, patientLocation.lon] : [30.9009, 75.8573];

  return (
    <div className="w-full h-full min-h-[380px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative flex flex-col">
      <MapContainer 
        center={defaultCenter} 
        zoom={13} 
        scrollWheelZoom={false}
        className="w-full h-full min-h-[380px]"
        style={{ width: '100%', height: '100%', minHeight: '380px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapRecenter center={defaultCenter} />
        <MapResizeHandler />

        {/* Patient Location Marker */}
        {patientLocation && (
          <Marker position={[patientLocation.lat, patientLocation.lon]} icon={createPatientIcon()}>
            <Popup>
              <div className="p-1 font-bold text-sm text-red-600">📍 Emergency Pickup Location</div>
            </Popup>
          </Marker>
        )}

        {/* Available Ambulances Markers */}
        {ambulances.map((amb) => (
          <InterpolatedAmbulanceMarker key={amb.id} ambulance={amb} />
        ))}

        {/* Assigned Ambulance Marker */}
        {assignedAmbulance && (
          <InterpolatedAmbulanceMarker ambulance={assignedAmbulance} />
        )}

        {/* Route Line connecting Assigned Ambulance to Patient */}
        {assignedAmbulance && patientLocation && (
          <Polyline
            positions={[
              [assignedAmbulance.latitude || assignedAmbulance.amb_lat, assignedAmbulance.longitude || assignedAmbulance.amb_lon],
              [patientLocation.lat, patientLocation.lon]
            ]}
            pathOptions={{ color: '#0284c7', weight: 4, dashArray: '8, 8' }}
          />
        )}
      </MapContainer>

      {/* Map Control Overlay Badge */}
      <div className="absolute top-3 right-3 z-[400] bg-white/95 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200 shadow-md text-xs font-bold text-slate-700 flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        Live GPS Tracking Active
      </div>
    </div>
  );
}
