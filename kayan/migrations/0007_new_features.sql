-- (container_number is already added in 0004_shipment_tracking.sql)

-- Add discount and delivery_status to sales_order
ALTER TABLE sales_order ADD COLUMN discount REAL DEFAULT 0;
ALTER TABLE sales_order ADD COLUMN delivery_status TEXT DEFAULT 'not_received';

-- Add payment method to order_payment
ALTER TABLE order_payment ADD COLUMN method TEXT;
