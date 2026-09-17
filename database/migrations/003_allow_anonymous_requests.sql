-- Migration 003: Allow Anonymous Emergency Requests & Add Tracking Token

DO $$ 
BEGIN 
    -- Make patient_id nullable on emergency_requests table
    ALTER TABLE emergency_requests ALTER COLUMN patient_id DROP NOT NULL;
    
    -- Add tracking_token column if not existing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'emergency_requests' AND column_name = 'tracking_token'
    ) THEN
        ALTER TABLE emergency_requests ADD COLUMN tracking_token VARCHAR(100);
    END IF;
END $$;
