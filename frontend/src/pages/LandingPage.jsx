import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import HeroAmbulanceCanvas from '../components/3d/HeroAmbulanceCanvas';
import { Shield, Clock, MapPin, Cpu, ArrowRight, CheckCircle2, UserCheck } from 'lucide-react';

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleFindAmbulanceClick = () => {
    if (user) {
      if (user.role === 'DRIVER') navigate('/driver');
      else if (user.role === 'ADMIN') navigate('/admin');
      else navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-16 lg:pt-12 lg:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-100 text-sky-800 text-xs font-bold border border-sky-200">
                <span className="w-2 h-2 rounded-full bg-sky-600 animate-pulse" />
                AI-Powered Emergency Response Network
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Emergency Help Is <span className="text-sky-600 underline decoration-sky-300 decoration-wavy">Closer</span> Than You Think.
              </h1>

              <p className="text-lg text-slate-600 font-medium leading-relaxed">
                ResQLink dynamically pairs emergency patients with nearby available ambulances using real-time GPS tracking and AI symptom structuring.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  onClick={handleFindAmbulanceClick}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all hover:scale-105"
                >
                  <MapPin className="w-5 h-5" />
                  Find an Ambulance
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>

                {!user && (
                  <Link
                    to="/register"
                    className="w-full sm:w-auto px-6 py-4 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-300 shadow-sm flex items-center justify-center gap-2 transition-all"
                  >
                    Create Account
                  </Link>
                )}
              </div>

              {/* Trust Indicators */}
              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-slate-200 text-center lg:text-left">
                <div>
                  <div className="text-2xl font-extrabold text-slate-900">&lt; 4 min</div>
                  <div className="text-xs font-semibold text-slate-500">Average ETA</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-slate-900">24/7</div>
                  <div className="text-xs font-semibold text-slate-500">Emergency Network</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-slate-900">AI Structuring</div>
                  <div className="text-xs font-semibold text-slate-500">Smart Triage</div>
                </div>
              </div>
            </div>

            {/* Right 3D Visual Section */}
            <div className="lg:col-span-6">
              <HeroAmbulanceCanvas />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              How ResQLink Works
            </h2>
            <p className="mt-3 text-slate-600 font-medium">
              A 3-step rapid dispatch pipeline engineered for patient care and location precision.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center mb-4">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">1. Secure Authentication</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Log in or sign up quickly to access the patient emergency dashboard and start an ambulance request.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">2. AI Symptom Triage</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Enter emergency details. AI analyzes descriptions into structured urgency summaries for emergency responders.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">3. Live GPS Dispatch & Tracking</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Instantly connect with nearby on-duty ambulances and track their real-time arrival on an interactive live map.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-sky-700 to-sky-900 rounded-3xl p-8 lg:p-12 text-white shadow-xl flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-3 text-center lg:text-left">
              <h2 className="text-3xl font-extrabold tracking-tight">Ready for Immediate Response?</h2>
              <p className="text-sky-100 font-medium max-w-xl">
                Create an account or log in now to access real-time ambulance dispatch capabilities.
              </p>
            </div>
            <button
              onClick={handleFindAmbulanceClick}
              className="px-8 py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold shadow-lg shadow-red-600/30 transition-all hover:scale-105 shrink-0"
            >
              Find an Ambulance
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
