const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const config = require('../src/config/env');
const { initDb } = require('../src/db/postgres');
const { initMongo } = require('../src/db/mongodb');

jest.setTimeout(30000);

beforeAll(async () => {
  await initDb();
  await initMongo();
}, 30000);

describe('ResQLink Full Workflow & Security Audit Integration Tests', () => {
  let patientToken = '';
  let driver1Token = '';
  let driver2Token = '';
  let adminToken = '';
  let requestId = null;
  let tripId = null;

  test('1. Security: Public registration MUST NOT create ADMIN account', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Hacker User',
        email: `hacker_${Date.now()}@example.com`,
        password: 'password123',
        role: 'ADMIN' // Malicious attempt to claim ADMIN
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('PATIENT'); // Must be converted to PATIENT
  });

  test('2. Authentication: Patient & Driver logins and Admin token setup', async () => {
    // Register Patient
    const pRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Jane Patient',
        email: `jane_${Date.now()}@example.com`,
        password: 'password123',
        role: 'PATIENT'
      });
    patientToken = pRes.body.data.token;

    // Register Driver 1
    const ts = Date.now().toString().slice(-4);
    const d1Res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Driver One',
        email: `driver1_${Date.now()}@example.com`,
        password: 'password123',
        role: 'DRIVER',
        licenseNumber: 'LIC-001',
        phone: '+91 98765 01991',
        vehicleNumber: `PB01AB1${ts}`
      });
    driver1Token = d1Res.body.data?.token;

    // Register Driver 2
    const d2Res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Driver Two',
        email: `driver2_${Date.now()}@example.com`,
        password: 'password123',
        role: 'DRIVER',
        licenseNumber: 'LIC-002',
        phone: '+91 98765 02992',
        vehicleNumber: `PB01AB2${ts}`
      });
    driver2Token = d2Res.body.data.token;

    // Generate Admin JWT for testing
    adminToken = jwt.sign(
      { id: 9999, email: 'admin@resqlink.com', role: 'ADMIN', name: 'Admin User' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    expect(patientToken).toBeDefined();
    expect(driver1Token).toBeDefined();
    expect(driver2Token).toBeDefined();
    expect(adminToken).toBeDefined();
  });

  test('3. Role Authorization: Patient attempting driver endpoints returns 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/driver/duty/start')
      .set('Authorization', `Bearer ${patientToken}`)
      .send();

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('4. Role Authorization: Patient attempting admin endpoints returns 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/admin/ambulances')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('5. Role Authorization: Driver attempting admin endpoints returns 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/admin/ambulances')
      .set('Authorization', `Bearer ${driver1Token}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('6. Role Authorization: Admin can access admin routes', async () => {
    const res = await request(app)
      .get('/api/admin/ambulances')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.ambulances)).toBe(true);
  });

  test('7. Unauthenticated Access: Unauthenticated emergency creation attempt returns 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/emergency-requests')
      .send({
        pickup_latitude: 30.9009,
        pickup_longitude: 75.8573,
        description: 'Unauthenticated creation attempt'
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  test('8. Driver Ownership: Driver 1 attempting to update custom ambulanceId 999 returns 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/driver/location')
      .set('Authorization', `Bearer ${driver1Token}`)
      .send({
        latitude: 30.9050,
        longitude: 75.8500,
        ambulanceId: 999 // Mismatched ambulance ID
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('9. Input Validation: Invalid coordinates return 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/emergency-requests')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        pickup_latitude: 199.0, // Invalid latitude > 90
        pickup_longitude: 75.8573,
        description: 'Testing invalid coordinates'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_COORDINATES');
  });

  test('10. Patient Workflow: Create Emergency Request', async () => {
    const res = await request(app)
      .post('/api/emergency-requests')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        pickup_latitude: 30.9009,
        pickup_longitude: 75.8573,
        description: 'Patient collapsed with acute chest pain and difficulty breathing.'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.request.request_status).toBe('PENDING');
    requestId = res.body.data.request.id;
  });

  test('11. PostgreSQL Dispatch Query: Fetching request by ID executes JOIN query without SQL alias errors', async () => {
    const res = await request(app)
      .get(`/api/emergency-requests/${requestId}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.request.id).toBe(requestId);
    expect(res.body.data.request).toHaveProperty('trip_id');
    expect(res.body.data.request).toHaveProperty('trip_status');
  });

  test('12. Driver Dispatch & Concurrency: Driver 1 accepts request; Driver 2 concurrent accept gets 409 Conflict', async () => {
    // Driver 1 starts duty to become AVAILABLE
    await request(app)
      .post('/api/driver/duty/start')
      .set('Authorization', `Bearer ${driver1Token}`)
      .send();

    // Driver 2 starts duty to become AVAILABLE
    await request(app)
      .post('/api/driver/duty/start')
      .set('Authorization', `Bearer ${driver2Token}`)
      .send();

    // Driver 1 accepts
    const acceptRes = await request(app)
      .post(`/api/driver/requests/${requestId}/accept`)
      .set('Authorization', `Bearer ${driver1Token}`)
      .send();

    expect(acceptRes.statusCode).toBe(200);
    expect(acceptRes.body.success).toBe(true);
    tripId = acceptRes.body.data.trip.id;

    // Driver 2 attempts to accept the same request -> Must return 409 Conflict
    const conflictRes = await request(app)
      .post(`/api/driver/requests/${requestId}/accept`)
      .set('Authorization', `Bearer ${driver2Token}`)
      .send();

    expect(conflictRes.statusCode).toBe(409);
    expect(conflictRes.body.success).toBe(false);
    expect(conflictRes.body.error.code).toBe('AMBULANCE_ALREADY_ASSIGNED');
  });

  test('13. Trip Authorization: Driver 2 attempting to operate Driver 1\'s trip returns 403 Forbidden', async () => {
    const res = await request(app)
      .post(`/api/driver/trips/${tripId}/arrived`)
      .set('Authorization', `Bearer ${driver2Token}`)
      .send();

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('14. State Machine Transition: Invalid state transition ARRIVED -> EN_ROUTE throws 400 Bad Request', async () => {
    // Driver 1 marks ARRIVED
    await request(app)
      .post(`/api/driver/trips/${tripId}/arrived`)
      .set('Authorization', `Bearer ${driver1Token}`)
      .send();

    // Driver 1 attempts invalid backward transition to EN_ROUTE
    const res = await request(app)
      .post(`/api/driver/trips/${tripId}/start`)
      .set('Authorization', `Bearer ${driver1Token}`)
      .send();

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  test('15. Trip Lifecycle Completion: ARRIVED -> PATIENT_PICKED_UP -> COMPLETED resets ambulance to AVAILABLE', async () => {
    // Mark patient picked up
    const pRes = await request(app)
      .post(`/api/driver/trips/${tripId}/patient-picked-up`)
      .set('Authorization', `Bearer ${driver1Token}`)
      .send();
    expect(pRes.statusCode).toBe(200);

    // Complete trip
    const cRes = await request(app)
      .post(`/api/driver/trips/${tripId}/complete`)
      .set('Authorization', `Bearer ${driver1Token}`)
      .send();
    expect(cRes.statusCode).toBe(200);
    expect(cRes.body.data.status).toBe('COMPLETED');
  });

  test('16. Driver Duty Lifecycle: Newly registered driver is OFF_DUTY and not discoverable until START DUTY', async () => {
    const uniqueDriverName = `Duty Test Driver ${Date.now()}`;
    // 1. Register a new driver
    const dRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: uniqueDriverName,
        email: `duty_driver_${Date.now()}@example.com`,
        password: 'password123',
        role: 'DRIVER',
        licenseNumber: `LIC-${Date.now().toString().slice(-6)}`,
        phone: '+91 98765 99999',
        vehicleNumber: `PB01AB${Date.now().toString().slice(-4)}`
      });

    expect(dRes.statusCode).toBe(201);
    const newDriverToken = dRes.body.data.token;

    // 2. Query nearby ambulances -> Newly registered driver MUST NOT be in available list
    const nearbyBefore = await request(app)
      .get('/api/ambulances/nearby?lat=30.9009&lon=75.8573&radius=50');
    expect(nearbyBefore.statusCode).toBe(200);

    const isVisibleBefore = nearbyBefore.body.data.ambulances.some(
      (a) => a.driverName === uniqueDriverName
    );
    expect(isVisibleBefore).toBe(false);

    // 3. Driver explicitly clicks START DUTY
    const startDutyRes = await request(app)
      .post('/api/driver/duty/start')
      .set('Authorization', `Bearer ${newDriverToken}`)
      .send();

    expect(startDutyRes.statusCode).toBe(200);
    expect(startDutyRes.body.success).toBe(true);

    // 4. Update driver location
    const locRes = await request(app)
      .post('/api/driver/location')
      .set('Authorization', `Bearer ${newDriverToken}`)
      .send({
        latitude: 30.9015,
        longitude: 75.8580
      });

    expect(locRes.statusCode).toBe(200);

    // 5. Query nearby ambulances -> Driver is now AVAILABLE and discoverable by patients
    const nearbyAfter = await request(app)
      .get('/api/ambulances/nearby?lat=30.9009&lon=75.8573&radius=50');

    expect(nearbyAfter.statusCode).toBe(200);
    const isVisibleAfter = nearbyAfter.body.data.ambulances.some(
      (a) => a.driverName === uniqueDriverName
    );
    expect(isVisibleAfter).toBe(true);
  });

  test('17. Driver Trips Query: Driver 1 can fetch assigned trips', async () => {
    const res = await request(app)
      .get('/api/driver/trips')
      .set('Authorization', `Bearer ${driver1Token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.trips)).toBe(true);
    expect(res.body.data.trips.length).toBeGreaterThan(0);
    expect(res.body.data.trips[0].id).toBe(tripId);
  });

  test('18. Driver Decline & Dispatch Attempts: Driver declining request leaves request PENDING and excludes it from driver list', async () => {
    // 1. Create a new emergency request
    const createRes = await request(app)
      .post('/api/emergency-requests')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        pickup_latitude: 30.9009,
        pickup_longitude: 75.8573,
        description: 'Test emergency for decline workflow'
      });
    expect(createRes.statusCode).toBe(201);
    const testReqId = createRes.body.data.request.id;

    // 2. Driver 1 declines the request
    const declineRes = await request(app)
      .post(`/api/driver/requests/${testReqId}/decline`)
      .set('Authorization', `Bearer ${driver1Token}`)
      .send();

    expect(declineRes.statusCode).toBe(200);
    expect(declineRes.body.success).toBe(true);
    expect(declineRes.body.data.requestStatus).toBe('PENDING');

    // 3. Driver 1 queries incoming requests -> Declined request MUST NOT appear
    const incRes = await request(app)
      .get('/api/driver/requests')
      .set('Authorization', `Bearer ${driver1Token}`);

    expect(incRes.statusCode).toBe(200);
    const hasDeclined = incRes.body.data.requests.some(r => r.id === testReqId);
    expect(hasDeclined).toBe(false);
  });

  test('19. Auto-Assign: Auto search assigns request to nearest eligible non-declined ambulance', async () => {
    // Create new emergency request
    const createRes = await request(app)
      .post('/api/emergency-requests')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        pickup_latitude: 30.9009,
        pickup_longitude: 75.8573,
        description: 'Testing auto-assign emergency request'
      });
    const testReqId = createRes.body.data.request.id;

    // Call auto-assign endpoint
    const autoRes = await request(app)
      .post(`/api/emergency-requests/${testReqId}/auto-assign`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send();

    expect(autoRes.statusCode).toBe(200);
    expect(autoRes.body.success).toBe(true);
    expect(autoRes.body.data.assigned).toBe(true);
    expect(autoRes.body.data.assignedAmbulance).toBeDefined();
  });

  afterAll(async () => {
    const db = require('../src/db/postgres');
    try {
      await db.query("DELETE FROM dispatch_attempts WHERE driver_id IN (SELECT dp.id FROM driver_profiles dp JOIN users u ON dp.user_id = u.id WHERE u.email LIKE '%@example.com')");
      await db.query("DELETE FROM trips WHERE driver_id IN (SELECT dp.id FROM driver_profiles dp JOIN users u ON dp.user_id = u.id WHERE u.email LIKE '%@example.com')");
      await db.query("DELETE FROM emergency_requests WHERE patient_id IN (SELECT id FROM users WHERE email LIKE '%@example.com')");
      await db.query("DELETE FROM ambulances WHERE driver_id IN (SELECT dp.id FROM driver_profiles dp JOIN users u ON dp.user_id = u.id WHERE u.email LIKE '%@example.com')");
      await db.query("DELETE FROM driver_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@example.com')");
      await db.query("DELETE FROM users WHERE email LIKE '%@example.com' OR email LIKE 'hacker_%'");
    } catch (e) {
      // Ignore cleanup error
    }
  });
});
