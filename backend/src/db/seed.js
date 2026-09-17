const bcrypt = require('bcryptjs');
const db = require('./postgres');

async function seedDatabase() {
  try {
    // Check if seeding is needed
    const userCheck = await db.query('SELECT COUNT(*) as count FROM users');
    const count = parseInt(userCheck.rows[0]?.count || 0, 10);
    if (count > 0) {
      console.log('🌱 Database already contains seed records. Skipping automated seed.');
      return;
    }

    console.log('🌱 Seeding ResQLink demo dataset...');
    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash('password123', salt);

    // 1. Seed Admin
    await db.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)`,
      ['ResQLink Admin', 'admin@resqlink.com', passHash, 'ADMIN']
    );

    // 2. Seed Demo Patient
    await db.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)`,
      ['Sarah Jenkins', 'patient@resqlink.com', passHash, 'PATIENT']
    );

    // 3. Seed 5 Development Drivers & Ambulances (OFF_DUTY by default until driver clicks START DUTY)
    const driversData = [
      { name: 'Robert Vance', email: 'driver1@resqlink.com', vehicle: 'PB01AB1001', type: 'ADVANCED', status: 'OFF_DUTY', lat: 30.9050, lon: 75.8500, lic: 'LIC-98412', phone: '+91 98765 43210' },
      { name: 'Marcus Brody', email: 'driver2@resqlink.com', vehicle: 'PB01AB1002', type: 'ADVANCED', status: 'OFF_DUTY', lat: 30.8950, lon: 75.8650, lic: 'LIC-98413', phone: '+91 87654 32109' },
      { name: 'Elena Rostova', email: 'driver3@resqlink.com', vehicle: 'PB01AB1003', type: 'ICU', status: 'OFF_DUTY', lat: 30.9150, lon: 75.8450, lic: 'LIC-98414', phone: '+91 76543 21098' },
      { name: 'David Miller', email: 'driver4@resqlink.com', vehicle: 'PB01AB1004', type: 'BASIC', status: 'OFF_DUTY', lat: 30.8800, lon: 75.8300, lic: 'LIC-98415', phone: '+91 65432 10987' },
      { name: 'Aisha Patel', email: 'driver5@resqlink.com', vehicle: 'PB01AB1005', type: 'NEONATAL', status: 'OFF_DUTY', lat: 30.9200, lon: 75.8700, lic: 'LIC-98416', phone: '+91 91234 56789' }
    ];

    for (const d of driversData) {
      const uRes = await db.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [d.name, d.email, passHash, 'DRIVER']
      );
      const userId = uRes.rows[0].id;

      const dpRes = await db.query(
        `INSERT INTO driver_profiles (user_id, license_number, phone, is_on_duty, availability_status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [userId, d.lic, d.phone, false, 'OFF_DUTY']
      );
      const driverProfileId = dpRes.rows[0].id;

      await db.query(
        `INSERT INTO ambulances (driver_id, vehicle_number, ambulance_type, latitude, longitude, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [driverProfileId, d.vehicle, d.type, d.lat, d.lon, 'OFF_DUTY']
      );
    }

    console.log('✅ Demo dataset successfully seeded: Admin, Patient, and 5 Ambulances (PB01AB1001 through PB01AB1005).');
  } catch (err) {
    console.error('❌ Error seeding database:', err.message);
  }
}

if (require.main === module) {
  seedDatabase().then(() => process.exit(0));
}

module.exports = { seedDatabase };
