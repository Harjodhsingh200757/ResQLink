-- ResQLink Migration 002: Data Integrity & Security Constraints

-- 1. Unique Driver Profile constraint
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_driver_user_id'
    ) THEN 
        ALTER TABLE driver_profiles ADD CONSTRAINT unique_driver_user_id UNIQUE (user_id);
    END IF;
END $$;

-- 2. Coordinate Range Check Constraints for Ambulances
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_ambulance_lat') THEN 
        ALTER TABLE ambulances ADD CONSTRAINT check_ambulance_lat CHECK (latitude BETWEEN -90 AND 90);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_ambulance_lon') THEN 
        ALTER TABLE ambulances ADD CONSTRAINT check_ambulance_lon CHECK (longitude BETWEEN -180 AND 180);
    END IF;
END $$;

-- 3. Coordinate Range Check Constraints for Emergency Requests
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_request_lat') THEN 
        ALTER TABLE emergency_requests ADD CONSTRAINT check_request_lat CHECK (pickup_latitude BETWEEN -90 AND 90);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_request_lon') THEN 
        ALTER TABLE emergency_requests ADD CONSTRAINT check_request_lon CHECK (pickup_longitude BETWEEN -180 AND 180);
    END IF;
END $$;

-- 4. Status Check Constraints
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_ambulance_status') THEN 
        ALTER TABLE ambulances ADD CONSTRAINT check_ambulance_status 
        CHECK (status IN ('OFF_DUTY', 'AVAILABLE', 'BUSY', 'EN_ROUTE', 'ARRIVED', 'ON_TRIP'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_request_status') THEN 
        ALTER TABLE emergency_requests ADD CONSTRAINT check_request_status 
        CHECK (request_status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_trip_status') THEN 
        ALTER TABLE trips ADD CONSTRAINT check_trip_status 
        CHECK (status IN ('ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'PATIENT_PICKED_UP', 'COMPLETED', 'CANCELLED'));
    END IF;
END $$;

-- 5. Partial Unique Index enforcing single active trip per ambulance
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_trip_per_ambulance 
ON trips(ambulance_id) 
WHERE status IN ('ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'PATIENT_PICKED_UP');
