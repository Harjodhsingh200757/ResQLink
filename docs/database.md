# ResQLink Database Design & Schema Specification

## 1. PostgreSQL Relational Schema

```sql
users (id PK, name, email UNIQUE, password_hash, role, created_at, updated_at)
  │
  ├── driver_profiles (id PK, user_id FK -> users.id, license_number, phone, is_on_duty, availability_status)
  │     │
  │     └── ambulances (id PK, driver_id FK -> driver_profiles.id, vehicle_number UNIQUE, ambulance_type, latitude, longitude, status)
  │           │
  │           ├── emergency_requests (id PK, patient_id FK -> users.id, pickup_lat, pickup_lon, description, request_status, assigned_ambulance_id FK -> ambulances.id)
  │           │     │
  │           │     └── trips (id PK, request_id FK, ambulance_id FK, started_at, arrived_at, patient_picked_up_at, completed_at, status)
  │           │
  │           └── ambulance_location_history (id PK, ambulance_id FK, latitude, longitude, recorded_at)
```

---

## 2. SQL JOIN Query Demonstration

The Admin Operations Console executes a complex 5-table INNER/LEFT JOIN to compile complete trip audit trails:

```sql
SELECT t.id as trip_id, t.status as trip_status, t.started_at, t.completed_at,
       a.vehicle_number, a.ambulance_type,
       d.license_number, d.phone as driver_phone,
       du.name as driver_name,
       pu.name as patient_name, pu.email as patient_email,
       r.description as emergency_description
FROM trips t
INNER JOIN ambulances a ON t.ambulance_id = a.id
LEFT JOIN driver_profiles d ON a.driver_id = d.id
LEFT JOIN users du ON d.user_id = du.id
INNER JOIN emergency_requests r ON t.request_id = r.id
INNER JOIN users pu ON r.patient_id = pu.id
ORDER BY t.started_at DESC;
```

---

## 3. MongoDB AI Document Model

```json
{
  "_id": "66479a0b12f4d1a4e8b91234",
  "requestId": 101,
  "patientId": 2,
  "description": "Family member collapsed with chest pain",
  "category": "cardiac_respiratory",
  "urgencyFlag": "CRITICAL",
  "reportedSymptoms": ["chest pain", "sudden collapse"],
  "summary": "User reports sudden collapse accompanied by acute chest pain.",
  "dispatcherAttention": true,
  "disclaimer": "AI-generated information. Not a medical diagnosis.",
  "generatedAt": "2026-09-16T12:00:00Z"
}
```
