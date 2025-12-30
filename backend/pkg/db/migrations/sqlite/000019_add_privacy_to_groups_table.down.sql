PRAGMA foreign_keys=off;

CREATE TABLE IF NOT EXISTS groups_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(creator_id) REFERENCES users(id)
);

INSERT INTO groups_new (id, creator_id, title, description, created_at)
SELECT id, creator_id, title, description, created_at FROM groups;

DROP TABLE groups;
ALTER TABLE groups_new RENAME TO groups;

PRAGMA foreign_keys=on;
