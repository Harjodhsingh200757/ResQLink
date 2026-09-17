import React from 'react';
import hero3dImg from '../../assets/hero_3d_dispatch.jpg';

export default function HeroAmbulanceCanvas() {
  return (
    <div className="relative w-full max-w-xl mx-auto">
      {/* Background Soft Glow & Blur */}
      <div className="absolute -inset-2 bg-gradient-to-r from-sky-400/20 via-cyan-400/20 to-blue-500/20 rounded-3xl blur-xl opacity-70 pointer-events-none" />

      {/* Main Image Container */}
      <div className="relative rounded-2xl overflow-hidden bg-white border border-sky-100 shadow-xl transition-transform duration-500 hover:scale-[1.01]">
        <img
          src={hero3dImg}
          alt="ResQLink 3D Emergency Dispatch & Real-Time Ambulance Tracking"
          className="w-full h-auto object-cover block rounded-2xl"
        />

        {/* Subtle Live Badge Overlay */}
        <div className="absolute top-4 left-4 sm:top-5 sm:left-5 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-sm text-xs font-bold text-slate-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-Time Dispatch Engine</span>
        </div>

        {/* Subtle Tracking Status Overlay */}
        <div className="absolute bottom-4 right-4 sm:bottom-5 sm:right-5 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/85 backdrop-blur-md border border-slate-700 shadow-md text-xs font-semibold text-sky-300">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
          <span>Active GPS Routing</span>
        </div>
      </div>
    </div>
  );
}

