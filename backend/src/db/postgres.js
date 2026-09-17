const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('../config/env');

let pool = null;
let inMemoryStore = null;

// Built-in Lightweight SQL Engine fallback if PostgreSQL daemon is unavailable locally
class InMemorySqlEngine {
  constructor() {
    this.tables = {
      users: [],
      driver_profiles: [],
      ambulances: [],
      emergency_requests: [],
      trips: [],
      ambulance_location_history: [],
      dispatch_attempts: []
    };
    this.autoIncrement = {
      users: 1,
      driver_profiles: 1,
      ambulances: 1,
      emergency_requests: 1,
      trips: 1,
      ambulance_location_history: 1,
      dispatch_attempts: 1
    };
  }

  query(text, params = []) {
    const trimmed = text.trim();
    const upper = trimmed.toUpperCase();

    // Handling BEGIN / COMMIT / ROLLBACK
    if (upper === 'BEGIN' || upper === 'COMMIT' || upper === 'ROLLBACK') {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }

    // SELECT
    if (upper.startsWith('SELECT')) {
      return this.handleSelect(trimmed, params);
    }
    // INSERT
    if (upper.startsWith('INSERT INTO')) {
      return this.handleInsert(trimmed, params);
    }
    // UPDATE
    if (upper.startsWith('UPDATE')) {
      return this.handleUpdate(trimmed, params);
    }
    // DELETE
    if (upper.startsWith('DELETE')) {
      return this.handleDelete(trimmed, params);
    }

    return Promise.resolve({ rows: [], rowCount: 0 });
  }

  handleInsert(text, params) {
    const match = text.match(/INSERT INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)(\s*RETURNING\s+(.+))?/i);
    if (!match) return Promise.resolve({ rows: [], rowCount: 0 });

    const tableName = match[1].toLowerCase();
    const columns = match[2].split(',').map(c => c.trim().toLowerCase());
    const returningClause = match[5];

    if (!this.tables[tableName]) {
      this.tables[tableName] = [];
      this.autoIncrement[tableName] = 1;
    }

    const row = { id: this.autoIncrement[tableName]++, created_at: new Date(), updated_at: new Date() };

    columns.forEach((col, idx) => {
      let val = params[idx];
      row[col] = val;
    });

    this.tables[tableName].push(row);

    let rows = [];
    if (returningClause) {
      rows = [row];
    }

    return Promise.resolve({ rows, rowCount: 1 });
  }

  handleSelect(text, params) {
    let tableName = 'users';
    for (const t of Object.keys(this.tables)) {
      if (new RegExp(`FROM\\s+${t}`, 'i').test(text)) {
        tableName = t;
        break;
      }
    }

    let rows = [...(this.tables[tableName] || [])];

    if (tableName === 'driver_profiles') {
      rows = rows.map(r => {
        const amb = (this.tables.ambulances || []).find(a => Number(a.driver_id) === Number(r.id));
        return {
          ...r,
          ambulance_id: amb ? amb.id : null,
          vehicle_number: amb ? amb.vehicle_number : null,
          ambulance_status: amb ? amb.status : null,
          latitude: amb ? amb.latitude : (r.latitude || 30.9009),
          longitude: amb ? amb.longitude : (r.longitude || 75.8573)
        };
      });
    }

    // Specific WHERE filters (order matters: check composite foreign key fields before generic 'id =')
    if (text.includes('WHERE')) {
      if (text.includes('email =') && params.length >= 1) {
        rows = rows.filter(r => r.email === params[0]);
      } else if (text.includes('user_id =') && params.length >= 1) {
        rows = rows.filter(r => Number(r.user_id) === Number(params[0]));
      } else if (text.includes('driver_id =') && params.length >= 1) {
        rows = rows.filter(r => Number(r.driver_id) === Number(params[0]));
      } else if (text.includes('patient_id =') && params.length >= 1) {
        rows = rows.filter(r => Number(r.patient_id) === Number(params[0]));
      } else if (text.includes('request_id =') && params.length >= 1) {
        rows = rows.filter(r => Number(r.request_id) === Number(params[0]));
      } else if (text.includes('ambulance_id =') && params.length >= 1) {
        rows = rows.filter(r => Number(r.ambulance_id) === Number(params[0]));
      } else if (text.includes('id =') && params.length >= 1) {
        rows = rows.filter(r => Number(r.id) === Number(params[0]));
      } else if (text.includes('status =') && params.length >= 1) {
        rows = rows.filter(r => r.status === params[0]);
      }
    }

    // Sorting
    if (text.includes('ORDER BY created_at DESC') || text.includes('ORDER BY id DESC')) {
      rows.sort((a, b) => (b.id || 0) - (a.id || 0));
    }

    return Promise.resolve({ rows, rowCount: rows.length });
  }

  handleUpdate(text, params) {
    const match = text.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)/i);
    if (!match) return Promise.resolve({ rows: [], rowCount: 0 });

    const tableName = match[1].toLowerCase();
    const whereClause = match[3];

    let count = 0;
    const rows = this.tables[tableName] || [];

    rows.forEach(r => {
      if (whereClause.includes('id =')) {
        const targetId = params[params.length - 1];
        if (Number(r.id) === Number(targetId)) {
          if (text.includes('latitude =')) {
            r.latitude = params[0];
            r.longitude = params[1];
            r.last_location_update = new Date();
          }
          if (text.includes('status =')) {
            const statusIdx = params.findIndex(p => typeof p === 'string' && ['AVAILABLE','BUSY','EN_ROUTE','ARRIVED','ON_TRIP','OFF_DUTY','ASSIGNED','PATIENT_PICKED_UP','COMPLETED','ACCEPTED','REJECTED','CANCELLED','PENDING'].includes(p));
            if (statusIdx !== -1) r.status = params[statusIdx];
          }
          if (text.includes('request_status =')) {
            r.request_status = params[0];
          }
          if (text.includes('assigned_ambulance_id =')) {
            r.assigned_ambulance_id = params[0];
          }
          r.updated_at = new Date();
          count++;
        }
      }
    });

    return Promise.resolve({ rows, rowCount: count });
  }

  handleDelete(text, params) {
    return Promise.resolve({ rows: [], rowCount: 0 });
  }
}

async function initDb() {
  try {
    const poolOptions = {
      connectionString: config.databaseUrl,
      connectionTimeoutMillis: 10000
    };

    // Configure SSL for remote Neon PostgreSQL or connections requesting SSL
    if (config.databaseUrl && (config.databaseUrl.includes('neon.tech') || config.databaseUrl.includes('sslmode=') || process.env.DB_SSL === 'true')) {
      poolOptions.ssl = { rejectUnauthorized: false };
    }

    pool = new Pool(poolOptions);

    // Test Postgres connection & run DDL migrations
    const client = await pool.connect();
    const schemaSql = fs.readFileSync(path.join(__dirname, '../../../database/migrations/001_init_schema.sql'), 'utf-8');
    await client.query(schemaSql);
    
    const constraintsSql = fs.readFileSync(path.join(__dirname, '../../../database/migrations/002_add_constraints.sql'), 'utf-8');
    await client.query(constraintsSql);

    const anonSql = fs.readFileSync(path.join(__dirname, '../../../database/migrations/003_allow_anonymous_requests.sql'), 'utf-8');
    await client.query(anonSql);

    const dispatchAttemptsSql = fs.readFileSync(path.join(__dirname, '../../../database/migrations/004_dispatch_attempts.sql'), 'utf-8');
    await client.query(dispatchAttemptsSql);

    client.release();
    console.log('✅ PostgreSQL connected, migrations & integrity constraints verified.');
  } catch (err) {
    console.warn('⚠️ PostgreSQL connection unavailable. Fallback to resilient in-memory Database Engine:', err.message);
    pool = null;
    inMemoryStore = new InMemorySqlEngine();
  }
}

async function query(text, params) {
  if (pool) {
    return pool.query(text, params);
  } else if (inMemoryStore) {
    return inMemoryStore.query(text, params);
  }
  throw new Error('Database layer not initialized.');
}

async function getClient() {
  if (pool) {
    return pool.connect();
  }
  return {
    query: (text, params) => inMemoryStore.query(text, params),
    release: () => {}
  };
}

module.exports = {
  initDb,
  query,
  getClient,
  getPool: () => pool,
  getInMemoryStore: () => inMemoryStore
};
