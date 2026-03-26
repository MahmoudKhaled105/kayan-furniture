-- Add container tracking columns to shipment table
ALTER TABLE shipment ADD COLUMN container_number TEXT;
ALTER TABLE shipment ADD COLUMN estimated_arrival TEXT;
