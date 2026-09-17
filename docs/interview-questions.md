# ResQLink Technical Interview Questions & Answers

### Q1: How does ResQLink prevent race conditions where two drivers accept the same emergency request?
**Answer**: ResQLink uses PostgreSQL atomic transactions with `FOR UPDATE` row locks in [`dispatchService.js`](file:///c:/Users/HARJOT/Desktop/Ambulance%20availability/backend/src/services/dispatchService.js). The transaction checks `WHERE request_status = 'PENDING'` inside the locked query. If a second driver attempts to accept concurrently, the state check fails and returns `409 Conflict` (`AMBULANCE_ALREADY_ASSIGNED`).

---

### Q2: How does the AI integration maintain patient safety and medical compliance?
**Answer**: As implemented in [`aiService.js`](file:///c:/Users/HARJOT/Desktop/Ambulance%20availability/backend/src/services/aiService.js), system prompts strictly instruct the LLM never to diagnose, prescribe, or recommend treatment. The output is validated against a JSON schema extracting only logistical parameters (`category`, `urgencyFlag`, `summary`). Mandatory UI disclaimers state: *"AI-generated information. Not a medical diagnosis."* Additionally, if the AI service fails, core request creation completes normally via graceful degradation.

---

### Q3: How is smooth ambulance movement achieved on the Leaflet map?
**Answer**: In [`AmbulanceTrackingMap.jsx`](file:///c:/Users/HARJOT/Desktop/Ambulance%20availability/frontend/src/components/map/AmbulanceTrackingMap.jsx), markers use linear coordinate interpolation (lerp) powered by `requestAnimationFrame`. When backend GPS polling delivers new coordinates, position state smoothly steps toward target coordinates over animation frames instead of jumping instantly.

---

### Q4: How is database selection divided between PostgreSQL and MongoDB?
**Answer**: PostgreSQL stores core relational entities requiring foreign key constraints and transactional consistency (`users`, `driver_profiles`, `ambulances`, `emergency_requests`, `trips`). MongoDB stores flexible, unstructured AI document outputs (`ai_request_analyses`) and system event metadata.
