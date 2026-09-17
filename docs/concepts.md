# Full-Stack Engineering Concept Mapping Reference

| Concept | Implementation Description | Primary Location in Codebase |
| :--- | :--- | :--- |
| **LLM API Integration** | Safe non-diagnostic prompt execution & structured output extraction | [`aiService.js`](file:///c:/Users/HARJOT/Desktop/Ambulance%20availability/backend/src/services/aiService.js) |
| **Prompt Engineering** | System instructions instructing AI never to diagnose or prescribe | [`aiService.js`](file:///c:/Users/HARJOT/Desktop/Ambulance%20availability/backend/src/services/aiService.js) |
| **Structured Output Validation** | JSON schema parsing & category enforcement | [`aiService.js`](file:///c:/Users/HARJOT/Desktop/Ambulance%20availability/backend/src/services/aiService.js) |
| **HTTP Status Codes** | Explicit usage of 200, 201, 400, 401, 403, 404, 409 Conflict, 500 | [`errorMiddleware.js`](file:///c:/Users/HARJOT/Desktop/Ambulance%20availability/backend/src/middleware/errorMiddleware.js) |
| **Middleware Chain** | Auth, Role protection, logging, and error handling | [`authMiddleware.js`](file:///c:/Users/HARJOT/Desktop/Ambulance%20availability/backend/src/middleware/authMiddleware.js) |
| **State Machine Modeling** | Status transition validator enforcing legal workflows | [`dispatchService.js`](file:///c:/Users/HARJOT/Desktop/Ambulance%20availability/backend/src/services/dispatchService.js) |
| **Database Transactions** | PostgreSQL atomic locking during request acceptance preventing double assignment | [`dispatchService.js`](file:///c:/Users/HARJOT/Desktop/Ambulance%20availability/backend/src/services/dispatchService.js) |
| **Haversine Formula** | Great circle distance calculation between GPS points | [`haversine.js`](file:///c:/Users/HARJOT/Desktop/Ambulance%20availability/backend/src/utils/haversine.js) |
| **JavaScript Closures** | Rate limiter sliding window preserving request history | [`closureHelpers.js`](file:///c:/Users/HARJOT/Desktop/Ambulance%20availability/backend/src/utils/closureHelpers.js) |
| **Async / Await & Promises** | Asynchronous HTTP fetching and database queries | [`ambulanceService.js`](file:///c:/Users/HARJOT/Desktop/Ambulance%20availability/backend/src/services/ambulanceService.js) |
| **React Component Composition** | Modular view components with hooks and clean layout wrappers | [`PatientDashboard.jsx`](file:///c:/Users/HARJOT/Desktop/Ambulance%20availability/frontend/src/pages/PatientDashboard.jsx) |
| **Smooth Map Interpolation** | Linear lerp over animation frames for marker movement | [`AmbulanceTrackingMap.jsx`](file:///c:/Users/HARJOT/Desktop/Ambulance%20availability/frontend/src/components/map/AmbulanceTrackingMap.jsx) |
| **SQL JOIN Queries** | 5-table JOIN compiling audit log across trips, ambulances, drivers, and users | [`adminController.js`](file:///c:/Users/HARJOT/Desktop/Ambulance%20availability/backend/src/controllers/adminController.js) |
| **MongoDB Schema & CRUD** | Flexible document storage for AI request analyses and system events | [`aiAnalysisModel.js`](file:///c:/Users/HARJOT/Desktop/Ambulance%20availability/backend/src/models/aiAnalysisModel.js) |
| **PostgreSQL PK/FK DDL** | Relational schema with cascading delete and performance indexes | [`001_init_schema.sql`](file:///c:/Users/HARJOT/Desktop/Ambulance%20availability/database/migrations/001_init_schema.sql) |
