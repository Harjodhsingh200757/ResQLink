# ResQLink REST API Documentation Reference

## Authentication Endpoints
- `POST /api/auth/register` - Create user account (`PATIENT`, `DRIVER`, `ADMIN`)
- `POST /api/auth/login` - Authenticate user & receive JWT token
- `POST /api/auth/logout` - Clear session token
- `GET /api/auth/me` - Fetch authenticated user profile

## Patient Endpoints
- `GET /api/ambulances/nearby?lat=30.9009&lon=75.8573` - Find nearby available ambulances with ETA
- `POST /api/emergency-requests` - Submit emergency request & run AI text analysis
- `GET /api/emergency-requests` - List patient's emergency requests
- `GET /api/emergency-requests/:id` - Fetch single request details
- `PATCH /api/emergency-requests/:id/cancel` - Cancel active request

## Driver Endpoints
- `POST /api/driver/duty/start` - Activate ON_DUTY status
- `POST /api/driver/duty/end` - Set OFF_DUTY status
- `PATCH /api/driver/status` - Transition availability status
- `POST /api/driver/location` - Update GPS location coordinates & append history
- `GET /api/driver/requests` - Fetch pending dispatch requests
- `POST /api/driver/requests/:id/accept` - Accept emergency dispatch assignment (Transaction Safe)
- `POST /api/driver/trips/:id/arrived` - Mark arrival at patient location
- `POST /api/driver/trips/:id/patient-picked-up` - Mark patient loaded in vehicle
- `POST /api/driver/trips/:id/complete` - Complete trip and reset ambulance status to AVAILABLE

## Admin Endpoints
- `GET /api/admin/statistics` - Fleet statistics summary
- `GET /api/admin/ambulances` - Complete fleet listing
- `GET /api/admin/requests` - All emergency requests history
- `GET /api/admin/trips` - Detailed trip log (SQL JOIN data)
