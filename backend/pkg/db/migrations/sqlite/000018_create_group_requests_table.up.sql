CREATE TABLE IF NOT EXISTS group_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    requester_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'invite' or 'request'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(requester_id) REFERENCES users(id) ON DELETE CASCADE
);
