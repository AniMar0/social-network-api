CREATE TABLE IF NOT EXISTS follow_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | declined
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(sender_id, receiver_id)
);
