const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('resqlink_token');
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error?.message || 'API request failed');
    error.statusCode = response.status;
    error.code = data.error?.code;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  getMe: () => request('/auth/me'),
  logout: () => {
    localStorage.removeItem('resqlink_token');
    return Promise.resolve({ success: true });
  },

  // Patient
  getNearbyAmbulances: (lat, lon, radius = 50) => request(`/ambulances/nearby?lat=${lat}&lon=${lon}&radius=${radius}`),
  createEmergencyRequest: (reqData) => request('/emergency-requests', { method: 'POST', body: JSON.stringify(reqData) }),
  getMyRequests: () => request('/emergency-requests'),
  getRequestById: (id, token) => request(`/emergency-requests/${id}${token ? `?token=${encodeURIComponent(token)}` : ''}`),
  cancelRequest: (id, token) => request(`/emergency-requests/${id}/cancel${token ? `?token=${encodeURIComponent(token)}` : ''}`, { method: 'PATCH' }),
  autoAssignEmergencyRequest: (id) => request(`/emergency-requests/${id}/auto-assign`, { method: 'POST' }),

  // Driver
  startDuty: () => request('/driver/duty/start', { method: 'POST' }),
  endDuty: () => request('/driver/duty/end', { method: 'POST' }),
  updateDriverStatus: (status) => request('/driver/status', { method: 'PATCH', body: JSON.stringify({ status }) }),
  updateDriverLocation: (lat, lon, ambulanceId) => request('/driver/location', { method: 'POST', body: JSON.stringify({ latitude: lat, longitude: lon, ambulanceId }) }),
  getIncomingRequests: () => request('/driver/requests'),
  getDriverTrips: () => request('/driver/trips'),
  getDriverTripById: (id) => request(`/driver/trips/${id}`),
  acceptRequest: (id) => request(`/driver/requests/${id}/accept`, { method: 'POST' }),
  rejectRequest: (id) => request(`/driver/requests/${id}/reject`, { method: 'POST' }),
  declineRequest: (id) => request(`/driver/requests/${id}/decline`, { method: 'POST' }),
  startTrip: (id) => request(`/driver/trips/${id}/start`, { method: 'POST' }),
  markArrived: (id) => request(`/driver/trips/${id}/arrived`, { method: 'POST' }),
  markPatientPickedUp: (id) => request(`/driver/trips/${id}/patient-picked-up`, { method: 'POST' }),
  completeTrip: (id) => request(`/driver/trips/${id}/complete`, { method: 'POST' }),

  // Admin
  getAdminAmbulances: () => request('/admin/ambulances'),
  getAdminRequests: () => request('/admin/requests'),
  getAdminTrips: () => request('/admin/trips'),
  getAdminStats: () => request('/admin/statistics'),
  getAdminLocations: () => request('/admin/locations'),
  getAdminEvents: () => request('/admin/events'),
  updateAdminAmbulanceStatus: (id, status) => request(`/admin/ambulances/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
};
