-- Create inventory table for bulk items
CREATE TABLE IF NOT EXISTS inventory (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    name             TEXT NOT NULL,
    category         TEXT,
    location_id      INTEGER REFERENCES location(id),
    quantity         INTEGER NOT NULL DEFAULT 0,
    unit_price       REAL NOT NULL DEFAULT 0,
    total_value      REAL NOT NULL DEFAULT 0,
    created_at       TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at       TEXT DEFAULT CURRENT_TIMESTAMP
);
