import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { usePolling } from '../hooks/usePolling';
import AmbulanceTrackingMap from '../components/map/AmbulanceTrackingMap';
import Logo from '../components/common/Logo';
import { Shield, Activity, Truck, AlertCircle, CheckCircle, RefreshCw, Filter, Phone, Clock } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [ambulances, setAmbulances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [trips, setTrips] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    try {
      const [sRes, aRes, rRes, tRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminAmbulances(),
        api.getAdminRequests(),
        api.getAdminTrips()
      ]);

      setStats(sRes.data.statistics);
      setAmbulances(aRes.data.ambulances || []);
      setRequests(rRes.data.requests || []);
      setTrips(tRes.data.trips || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setLoading(false);
    }
  };

  usePolling(fetchAdminData, 4000);

  const filteredAmbulances = statusFilter === 'ALL'
    ? ambulances
    : ambulances.filter((a) => a.status === statusFilter);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Operations Center Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <Logo size="md" />
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Operations & Dispatch Center
              </h1>
              <p className="text-slate-500 text-xs font-medium mt-0.5">
                Real-time regional fleet tracking & response monitoring console.
              </p>
            </div>
          </div>

          <button
            onClick={fetchAdminData}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Operations
          </button>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Fleet</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats?.totalAmbulances || 0}</div>
          </div>
          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">🟢 Available</div>
            <div className="text-2xl font-extrabold text-emerald-900 mt-1">{stats?.available || 0}</div>
          </div>
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">🟡 Busy</div>
            <div className="text-2xl font-extrabold text-amber-900 mt-1">{stats?.busy || 0}</div>
          </div>
          <div className="bg-sky-50 p-4 rounded-2xl border border-sky-200 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wider text-sky-700">🔵 En Route</div>
            <div className="text-2xl font-extrabold text-sky-900 mt-1">{stats?.enRoute || 0}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Active Requests</div>
            <div className="text-2xl font-extrabold text-purple-900 mt-1">{stats?.totalRequests || 0}</div>
          </div>
          <div className="bg-slate-100 p-4 rounded-2xl border border-slate-300 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Completed Trips</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats?.completedTrips || 0}</div>
          </div>
        </div>

        {/* Status Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-bold text-slate-500 uppercase mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Status Filter:
          </span>
          {['ALL', 'AVAILABLE', 'BUSY', 'EN_ROUTE', 'ARRIVED', 'ON_TRIP', 'OFF_DUTY'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === st
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Live Map & Fleet Table Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Fleet List Table */}
          <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Ambulance Units Fleet ({filteredAmbulances.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-medium text-slate-600">
                <thead className="bg-slate-50 text-slate-800 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Vehicle</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Driver</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAmbulances.map((amb) => (
                    <tr key={amb.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-extrabold text-slate-900 flex items-center gap-1.5">
                        <span>🚑</span> {amb.vehicle_number}
                      </td>
                      <td className="p-3 text-slate-500">{amb.ambulance_type}</td>
                      <td className="p-3 text-slate-800 font-semibold">{amb.driver_name || 'N/A'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          amb.status === 'AVAILABLE' ? 'badge-available' : amb.status === 'EN_ROUTE' ? 'badge-enroute' : 'badge-busy'
                        }`}>
                          {amb.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fleet Map */}
          <div className="lg:col-span-6 h-[420px]">
            <AmbulanceTrackingMap ambulances={filteredAmbulances} />
          </div>
        </div>

        {/* Trips Log Table (SQL JOIN Data) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
            Active Trips & SQL JOIN Audit Log ({trips.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium text-slate-600">
              <thead className="bg-slate-50 text-slate-800 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Trip ID</th>
                  <th className="p-3">Ambulance</th>
                  <th className="p-3">Driver</th>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Emergency Description</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trips.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-slate-400">No active or historic trips logged.</td>
                  </tr>
                ) : (
                  trips.map((t) => (
                    <tr key={t.trip_id} className="hover:bg-slate-50">
                      <td className="p-3 font-extrabold text-slate-900">#{t.trip_id}</td>
                      <td className="p-3 font-semibold text-sky-700">{t.vehicle_number}</td>
                      <td className="p-3 font-medium text-slate-800">{t.driver_name || 'Driver'}</td>
                      <td className="p-3 font-medium text-slate-800">{t.patient_name || 'Patient'}</td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">{t.emergency_description}</td>
                      <td className="p-3 font-bold text-sky-800 uppercase text-[10px]">{t.trip_status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
