import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield, Truck, LogOut } from 'lucide-react';
import Logo from '../common/Logo';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <Link to="/" className="hover:opacity-90 transition-opacity flex items-center py-1">
            <Logo variant="navbar" />
          </Link>

          {/* Navigation Links depending on user auth state */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
            {!user && (
              <>
                <Link to="/" className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700 hover:text-sky-600 hover:bg-white transition-all">
                  Home
                </Link>
                <a href="#how-it-works" className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700 hover:text-sky-600 hover:bg-white transition-all">
                  How it Works
                </a>
              </>
            )}

            {user?.role === 'PATIENT' && (
              <>
                <Link to="/ambulances" className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700 hover:text-sky-600 hover:bg-white transition-all">
                  Find Ambulance
                </Link>
                <Link to="/booking/current" className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700 hover:text-sky-600 hover:bg-white transition-all">
                  My Current Booking
                </Link>
                <Link to="/history" className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700 hover:text-sky-600 hover:bg-white transition-all">
                  Booking History
                </Link>
              </>
            )}

            {user?.role === 'DRIVER' && (
              <>
                <Link to="/driver" className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700 hover:text-amber-700 hover:bg-white transition-all flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-amber-600" /> Driver Dashboard
                </Link>
                <Link to="/driver/current" className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700 hover:text-amber-700 hover:bg-white transition-all">
                  Current Booking
                </Link>
                <Link to="/driver/history" className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700 hover:text-amber-700 hover:bg-white transition-all">
                  Trip History
                </Link>
              </>
            )}

            {user?.role === 'ADMIN' && (
              <>
                <Link to="/admin" className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700 hover:text-sky-600 hover:bg-white transition-all flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-sky-600" /> Admin Dashboard
                </Link>
                <Link to="/admin/ambulances" className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700 hover:text-sky-600 hover:bg-white transition-all">
                  Ambulances
                </Link>
                <Link to="/admin/requests" className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700 hover:text-sky-600 hover:bg-white transition-all">
                  Requests
                </Link>
                <Link to="/admin/trips" className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700 hover:text-sky-600 hover:bg-white transition-all">
                  Trips
                </Link>
              </>
            )}
          </nav>

          {/* User Auth Buttons */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-900">{user.name}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 inline-block self-end">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-200"
                  title="Log Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-sky-600 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition-all"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
