import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, AlertCircle } from 'lucide-react';
import Logo from '../components/common/Logo';

export default function LoginPage() {
  const [email, setEmail] = useState('patient@resqlink.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await login(email, password);
      if (user.role === 'ADMIN') navigate('/admin');
      else if (user.role === 'DRIVER') navigate('/driver');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <Logo variant="large" className="mx-auto mb-2" />
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Log In to Your Account</h2>
          <p className="text-xs text-slate-500 font-medium">Access your emergency dispatch network portal.</p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Demo Credentials Quick Selector */}
        <div className="bg-sky-50/70 p-3 rounded-xl border border-sky-100 text-xs text-sky-900 space-y-1">
          <div className="font-bold">Demo Credentials (Pre-seeded):</div>
          <div className="flex gap-2 text-[11px] font-semibold">
            <button type="button" onClick={() => { setEmail('patient@resqlink.com'); setPassword('password123'); }} className="underline hover:text-sky-700">Patient</button>
            <span>•</span>
            <button type="button" onClick={() => { setEmail('driver1@resqlink.com'); setPassword('password123'); }} className="underline hover:text-sky-700">Driver 1</button>
            <span>•</span>
            <button type="button" onClick={() => { setEmail('admin@resqlink.com'); setPassword('password123'); }} className="underline hover:text-sky-700">Admin</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-xl shadow-md transition-all text-sm"
          >
            {loading ? 'Authenticating...' : 'LOG IN'}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500">
          Don't have an account? <Link to="/register" className="font-bold text-sky-600 hover:underline">Register here</Link>
        </div>
      </div>
    </div>
  );
}
