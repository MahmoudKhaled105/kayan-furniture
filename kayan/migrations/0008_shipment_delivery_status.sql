-- Add delivery_status and image_url to shipment table
ALTER TABLE shipment ADD COLUMN delivery_status TEXT DEFAULT 'pending';
ALTER TABLE shipment ADD COLUMN image_url TEXT;
