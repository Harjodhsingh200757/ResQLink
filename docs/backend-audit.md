# ResQLink Backend Security, Integrity & Architecture Audit Report

## 1. Executive Summary & Overview
This document records the security, authorization, data integrity, concurrency, and validation fixes implemented across the **ResQLink** backend services to enforce a trustworthy emergency dispatch workflow.

---

## 2. Problems Discovered & Fixes Implemented

| Category | Problem Discovered | Resolution & Architectural Fix |
| :--- | :--- | :--- |
| **Role Authorization** | Protected routes lacked backend role checks, relying on client routing. Drivers could access another driver's ambulance or trip by tampering parameters. | Applied `roleMiddleware(['PATIENT', 'DRIVER', 'ADMIN'])` to all routes. Driver endpoints derive ownership strictly from `req.user.id -> driver_profile -> ambulance -> trip`, returning `403 Forbidden` for unauthorized attempts. |
| **Admin Privilege Escalation** | Public registration `POST /api/auth/register` accepted `role: "ADMIN"`. | Enforced `safeRole` in `authService.js` to strip client-supplied `ADMIN` during public registration (forcing `PATIENT` or `DRIVER`). Updated `RegisterPage.jsx` UI to remove `ADMIN` dropdown choice. |
| **Driver Rejection Persistence** | `POST /api/driver/requests/:id/reject` returned fake success without updating database state. | Updated `rejectRequest` in `driverController.js` to unassign `assigned_ambulance_id = NULL` on the request, set `updated_at = CURRENT_TIMESTAMP`, and record a system rejection event. |
| **Driver Ownership & Trip Security** | `updateLocation` accepted `ambulanceId` from payload; trip operations (`/trips/:id/arrived`, etc.) didn't verify trip ownership. | Strict validation: `updateLocation` rejects client-supplied `ambulanceId` mismatches with `403 Forbidden`. All trip operations verify `trip.ambulance_id === ambulance.id`. |
| **Dispatch Concurrency** | Race condition could allow two drivers to accept the same request or ambulance. | PostgreSQL atomic transactions using `SELECT ... FOR UPDATE` row locks. Active trip checks throw `409 Conflict` (`AMBULANCE_ALREADY_ASSIGNED`) on collision. |
| **Database Constraints** | Schema lacked unique driver user constraints and coordinate validation. | Applied Migration `002_add_constraints.sql` adding `UNIQUE(user_id)` on `driver_profiles`, `CHECK (-90 <= lat <= 90)`, `CHECK (-180 <= lon <= 180)`, status value checks, and partial unique index on active trips per ambulance. |
| **Updated_At Timestamps** | `updated_at` was not explicitly updated on `UPDATE` queries. | Added `updated_at = CURRENT_TIMESTAMP` to all SQL `UPDATE` statements across emergency requests, driver profiles, and ambulances. |
| **AI Rate Limiting** | AI rate limiter merely logged `console.warn()` without halting execution. | Rate limiter in `aiService.js` now throws `429 Too Many Requests` returning standard `{ success: false, error: { code: "TOO_MANY_REQUESTS", message: "..." } }`. |
| **Input Validation** | Missing backend input validation for coordinates, emails, descriptions, and IDs. | Added `validatorMiddleware.js` verifying emails, password length (>=6), coordinates (-90 to 90, -180 to 180), descriptions, and IDs before executing SQL. |

---

## 3. Role-Based Authorization Model

```
PATIENT  ──> [ nearby ambulances search | create own request | view own requests | cancel own request ]
DRIVER   ──> [ duty start/end | status toggle | own location update | view eligible requests | accept/reject request | operate own trips ]
ADMIN    ──> [ operational stats | all fleet listing | all requests | all trips log | location telemetry | status override ]
```

---

## 4. Dispatch Concurrency Strategy (PostgreSQL Transactions)

```sql
BEGIN;
SELECT * FROM emergency_requests WHERE id = $1 FOR UPDATE; -- Lock request
SELECT * FROM ambulances WHERE id = $2 FOR UPDATE;         -- Lock ambulance
SELECT * FROM trips WHERE ambulance_id = $2 AND status IN ('ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'PATIENT_PICKED_UP') FOR UPDATE;

-- Verify request is PENDING and ambulance is AVAILABLE. If taken:
ROLLBACK; --> Return HTTP 409 Conflict

-- If valid:
UPDATE emergency_requests SET request_status = 'ACCEPTED', assigned_ambulance_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1;
UPDATE ambulances SET status = 'EN_ROUTE', updated_at = CURRENT_TIMESTAMP WHERE id = $2;
UPDATE driver_profiles SET availability_status = 'EN_ROUTE', updated_at = CURRENT_TIMESTAMP WHERE id = $3;
INSERT INTO trips (request_id, ambulance_id, started_at, status) VALUES ($1, $2, CURRENT_TIMESTAMP, 'EN_ROUTE');
COMMIT;
```

---

## 5. HTTP Status Code Policy & Response Envelope

- `200 OK`: Successful resource queries and state updates.
- `201 Created`: User registration and emergency request creation.
- `400 Bad Request`: Invalid parameters, malformed JSON, weak password, or illegal state transitions.
- `401 Unauthorized`: Missing or invalid JWT Bearer token.
- `403 Forbidden`: Unauthorized role access or operating on another driver's ambulance/trip.
- `404 Not Found`: Non-existent emergency request, driver profile, or trip ID.
- `409 Conflict`: Concurrency conflict (request or ambulance already assigned/busy).
- `429 Too Many Requests`: Rate limit exceeded on AI description analysis.
- `500 Internal Server Error`: Centralized uncaught server error handling.

### Response Envelope Standards
**Success**:
```json
{
  "success": true,
  "data": {}
}
```

**Error**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable explanation"
  }
}
```
