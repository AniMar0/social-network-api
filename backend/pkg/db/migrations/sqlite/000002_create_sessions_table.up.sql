-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    user_id   INTEGER NOT NULL,         -- user ID (FK)
    session_id TEXT PRIMARY KEY,        -- unique session ID (token)
    expires_at DATETIME NOT NULL,       -- expiration time of session
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
