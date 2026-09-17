-- ResQLink Database Initialization Migration

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('PATIENT', 'DRIVER', 'ADMIN')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS driver_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    license_number VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    is_on_duty BOOLEAN DEFAULT FALSE,
    availability_status VARCHAR(50) DEFAULT 'OFF_DUTY',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ambulances (
    id SERIAL PRIMARY KEY,
    driver_id INT REFERENCES driver_profiles(id) ON DELETE SET NULL,
    vehicle_number VARCHAR(50) UNIQUE NOT NULL,
    ambulance_type VARCHAR(50) DEFAULT 'ADVANCED',
    latitude DOUBLE PRECISION DEFAULT 30.9009,
    longitude DOUBLE PRECISION DEFAULT 75.8573,
    last_location_update TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'OFF_DUTY',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emergency_requests (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES users(id) ON DELETE CASCADE,
    pickup_latitude DOUBLE PRECISION NOT NULL,
    pickup_longitude DOUBLE PRECISION NOT NULL,
    description TEXT NOT NULL,
    request_status VARCHAR(50) DEFAULT 'PENDING',
    ai_analysis_id VARCHAR(24),
    assigned_ambulance_id INT REFERENCES ambulances(id) ON DELETE SET NULL,
    tracking_token VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trips (
    id SERIAL PRIMARY KEY,
    request_id INT NOT NULL REFERENCES emergency_requests(id) ON DELETE CASCADE,
    ambulance_id INT NOT NULL REFERENCES ambulances(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    arrived_at TIMESTAMP WITH TIME ZONE,
    patient_picked_up_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'ASSIGNED'
);

CREATE TABLE IF NOT EXISTS ambulance_location_history (
    id SERIAL PRIMARY KEY,
    ambulance_id INT NOT NULL REFERENCES ambulances(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_ambulances_status ON ambulances(status);
CREATE INDEX IF NOT EXISTS idx_ambulances_location ON ambulances(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_requests_patient ON emergency_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON emergency_requests(request_status);
CREATE INDEX IF NOT EXISTS idx_trips_request ON trips(request_id);
CREATE INDEX IF NOT EXISTS idx_location_history_ambulance ON ambulance_location_history(ambulance_id);
