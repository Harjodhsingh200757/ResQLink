import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/layout/Navbar';

import LandingPage from './pages/LandingPage';
import PatientDashboard from './pages/PatientDashboard';
import FindAmbulancePage from './pages/FindAmbulancePage';
import PatientCurrentBookingPage from './pages/PatientCurrentBookingPage';
import PatientBookingHistoryPage from './pages/PatientBookingHistoryPage';
import RequestTrackingPage from './pages/RequestTrackingPage';
import DriverSimulatorPage from './pages/DriverSimulatorPage';
import DriverCurrentBookingPage from './pages/DriverCurrentBookingPage';
import DriverTripHistoryPage from './pages/DriverTripHistoryPage';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Protected Route Guard
function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    if (user.role === 'DRIVER') return <Navigate to="/driver" replace />;
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              {/* Patient Routes (Protected) */}
              <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}><PatientDashboard /></ProtectedRoute>} />
              <Route path="/ambulances" element={<ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}><FindAmbulancePage /></ProtectedRoute>} />
              <Route path="/booking/current" element={<ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}><PatientCurrentBookingPage /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}><PatientBookingHistoryPage /></ProtectedRoute>} />
              <Route path="/request/:id" element={<ProtectedRoute allowedRoles={['PATIENT', 'DRIVER', 'ADMIN']}><RequestTrackingPage /></ProtectedRoute>} />

              {/* Driver & Simulator Routes (Protected) */}
              <Route path="/driver" element={<ProtectedRoute allowedRoles={['DRIVER']}><DriverSimulatorPage /></ProtectedRoute>} />
              <Route path="/driver/current" element={<ProtectedRoute allowedRoles={['DRIVER']}><DriverCurrentBookingPage /></ProtectedRoute>} />
              <Route path="/driver/history" element={<ProtectedRoute allowedRoles={['DRIVER']}><DriverTripHistoryPage /></ProtectedRoute>} />
              <Route path="/driver-simulator" element={<ProtectedRoute allowedRoles={['DRIVER']}><DriverSimulatorPage /></ProtectedRoute>} />

              {/* Admin Routes (Protected) */}
              <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/ambulances" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/requests" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/trips" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}
