-- Migration: Add account_notes to shipment table
ALTER TABLE shipment ADD COLUMN account_notes TEXT;
