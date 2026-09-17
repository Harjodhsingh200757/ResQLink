-- Migration 004: Dispatch Attempts Table for Multi-Driver Emergency Dispatch & Decline Tracking

CREATE TABLE IF NOT EXISTS dispatch_attempts (
    id SERIAL PRIMARY KEY,
    request_id INT NOT NULL REFERENCES emergency_requests(id) ON DELETE CASCADE,
    ambulance_id INT NOT NULL REFERENCES ambulances(id) ON DELETE CASCADE,
    driver_id INT REFERENCES driver_profiles(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'OFFERED', -- OFFERED, DECLINED, ACCEPTED, EXPIRED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_dispatch_attempts_request ON dispatch_attempts(request_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_attempts_ambulance ON dispatch_attempts(ambulance_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_attempts_status ON dispatch_attempts(status);
