-- Create item_image table for multiple images per product
CREATE TABLE IF NOT EXISTS item_image (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id     INTEGER NOT NULL REFERENCES item(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    created_at  TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by item_id
CREATE INDEX IF NOT EXISTS idx_item_image_item ON item_image(item_id);
