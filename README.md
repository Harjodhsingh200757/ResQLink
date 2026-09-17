# 🚑 ResQLink
### AI-Powered Real-Time Ambulance Availability & Dispatch Network

ResQLink is a full-stack emergency ambulance availability and dispatch network. It addresses real-world emergency transport coordination by connecting patients with nearby available ambulances through real-time GPS tracking, structured AI emergency text summaries, a realistic Driver Simulator operating on backend APIs, and an Admin Operations Console.

---

## 🌟 Key Features

- ☀️ **Light-Theme First Design**: Modern, clean healthcare interface built with high-contrast slate surfaces, soft medical blue, subtle medical greens, and restrained emergency badges.
- 🚑 **Real-Time GPS Map Tracking**: Leaflet map displaying nearby available ambulances with **smooth position interpolation** (linear lerp) as driver location updates arrive.
- 🤖 **AI-Assisted Emergency Text Structuring**: Converts free-text patient descriptions into structured urgency flags for dispatcher preparation. Strictly non-diagnostic with safety disclaimers and graceful degradation.
- 📱 **Driver Simulator**: Built-in simulator reproducing real mobile driver hardware via backend APIs (`POST /api/driver/location`, duty state toggles, auto-drive coordinate loop).
- 🔒 **Concurrency & Double-Assignment Protection**: PostgreSQL atomic transactions preventing race conditions (returning `409 Conflict` if assigned).
- 📊 **Admin Operations Center**: Regional fleet overview, active trips log compiled via complex **5-table SQL JOIN**, status filters, and performance metrics.
- 📚 **Comprehensive Documentation**: Complete system architecture, database ERD, API specs, concept mapping, demo script, and interview questions.

---

## 🏗️ System Architecture

```
                  PATIENT
                     │
                  DRIVER
                     │
                  ADMIN
                     │
              DRIVER SIMULATOR
                     │
                     ▼
               REACT FRONTEND (Vite + Leaflet + Three.js)
                     │
                     │ HTTP / REST APIs (Polling)
                     ▼
               EXPRESS BACKEND (Node.js)
                     │
      ┌──────────────┼──────────────┐
      │              │              │
      ▼              ▼              ▼
 PostgreSQL       MongoDB        LLM Service
 Core Relational  AI Analyses    Structured Text
 Data & History   & Events       Processing
```

---

## 🚀 Quick Setup Instructions

### 1. Environment Configuration
Create `.env` at root (pre-configured defaults provided):

```env
PORT=5000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/resqlink
MONGODB_URI=mongodb://localhost:27017/resqlink
JWT_SECRET=resqlink_super_secret_jwt_key_2026
CLIENT_URL=http://localhost:5173
POLL_INTERVAL_MS=3000
AVERAGE_AMBULANCE_SPEED_KMH=40
```

### 2. Install Dependencies & Start Application

```bash
# Install root, backend, and frontend dependencies
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Run backend API server & auto-seed demo data
npm run server

# In a separate terminal, launch Vite frontend app
cd frontend && npm run dev
```

App will be live at:
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000/api/health`

---

## 🔐 Pre-seeded Demo Credentials

| Role | Email | Password | Pre-seeded Ambulance |
| :--- | :--- | :--- | :--- |
| **Patient** | `patient@resqlink.com` | `password123` | N/A |
| **Driver 1** | `driver1@resqlink.com` | `password123` | `AMB-001` (Available) |
| **Driver 2** | `driver2@resqlink.com` | `password123` | `AMB-002` (Available) |
| **Admin** | `admin@resqlink.com` | `password123` | N/A (Fleet Operations) |

---

## 🎬 End-to-End Demo Walkthrough

1. Open `http://localhost:5173` and click **Find an Ambulance Now**.
2. Type an emergency description (e.g. *"Patient collapsed and having chest pain"*).
3. View nearby ambulances (`AMB-001`, `AMB-002`) and click **DISPATCH AMBULANCE NOW**.
4. In another browser tab, navigate to `/driver-simulator`.
5. Click **ACCEPT EMERGENCY DISPATCH** on Request `#1`.
6. Click **AUTO DRIVE** in the Simulator to post GPS location updates every 3 seconds.
7. Return to Patient view -> Watch `AMB-001` marker **smoothly interpolate on the map** as ETA counts down!
8. In Simulator, complete trip workflow: **1. ARRIVED** -> **2. PATIENT PICKED UP** -> **3. COMPLETE TRIP**.
9. Visit `/admin` to inspect real-time statistics and 5-table SQL JOIN trip log.

---

## 🧪 Running Automated Tests

```bash
# Execute Jest unit & state machine tests
npm test
```

---

## ⚠️ Prototype Limitations & Production Roadmap
- **Driver Simulator**: The Driver Simulator reproduces the behavior of a real ambulance driver's mobile application for demonstration purposes. It can later be replaced by a real mobile application sending GPS updates.
- **Polling vs. WebSockets**: Prototype uses polling (`POLL_INTERVAL_MS=3000`). WebSockets / SSE can be introduced in production.
- **Traffic Routing**: Uses Haversine distance and constant average speed (`40 km/h`). Can be extended with traffic-aware routing APIs.
