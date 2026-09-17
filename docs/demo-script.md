# ResQLink Demonstration Presentation Script

## Demo Scenario Walkthrough (3 Minutes)

### Phase 1: Landing Page & Vision (0:00 - 0:30)
1. Open ResQLink Landing Page (`http://localhost:5173`).
2. Highlight the Light-Theme design, clean healthcare aesthetics, and interactive 3D Ambulance Hero.
3. Click **Find an Ambulance Now**.

### Phase 2: Patient Emergency Request & AI Summary (0:30 - 1:15)
1. On Patient Dashboard, view nearby available ambulances (`AMB-001`, `AMB-002`, `AMB-005`).
2. Enter text: *"My father suddenly collapsed and is having severe difficulty breathing."*
3. Highlight the AI notice disclaimer: **"AI-generated information. Not a medical diagnosis."**
4. Click **DISPATCH AMBULANCE NOW**.
5. Observe redirection to live tracking view (`/request/:id`).

### Phase 3: Driver Simulator & Acceptance (1:15 - 2:00)
1. In a split window or tab, open `/driver-simulator`.
2. Notice incoming dispatch request for Request `#1`.
3. Click **ACCEPT DISPATCH**.
4. Observe driver status transition from `AVAILABLE` to `EN_ROUTE`.

### Phase 4: GPS Auto-Movement & Smooth Map Interpolation (2:00 - 2:30)
1. On Driver Simulator, click **AUTO DRIVE**.
2. Switch back to Patient Map view.
3. Watch ambulance marker `AMB-001` smoothly interpolate along coordinates toward patient marker 📍 without instant jumping!
4. Observe ETA countdown dynamically updating.

### Phase 5: Trip Completion & Operations Center (2:30 - 3:00)
1. In Driver Simulator, walk through workflow: **1. ARRIVED** -> **2. PATIENT PICKED UP** -> **3. COMPLETE TRIP**.
2. Open Admin Operations Console (`/admin`).
3. View updated metrics (Completed Trips incremented) and verify SQL JOIN trip audit log.
