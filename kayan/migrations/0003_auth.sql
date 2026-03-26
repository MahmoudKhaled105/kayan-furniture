-- Create users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);

-- Create user_sessions table for refresh tokens
CREATE TABLE user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  refresh_token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Seed default admin user
-- Email: admin@kayan.com
-- Password: admin123
INSERT INTO users (email, password_hash, name, role)
VALUES ('admin@kayan.com', '$2b$10$caSCxuw2tRhoH8TWaTXuJut1Wk2iW6dT7pYgGUS7eqfA6UzGjUjhC', 'Kayan Admin', 'admin');
