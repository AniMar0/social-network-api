CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    birthdate TEXT,
    gender TEXT,
    age INTEGER,
    avatar TEXT,
    nickname TEXT UNIQUE,
    about_me TEXT,
    url TEXT UNIQUE,
    is_private BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
