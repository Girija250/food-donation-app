const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./food_donation.db');

db.serialize(() => {
    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        password TEXT,
        role TEXT,
        category TEXT,
        mobile TEXT,
        location TEXT,
        lat REAL,
        lng REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Food Posts Table
    db.run(`CREATE TABLE IF NOT EXISTS food_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        food_name TEXT,
        quantity INTEGER,
        cooked_time TEXT,
        fresh_until TEXT,
        status TEXT DEFAULT 'available',
        notified_waste INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Orders/Volunteer Actions Table
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        food_id INTEGER,
        volunteer_id INTEGER,
        provider_id INTEGER,
        action TEXT,
        delivered INTEGER DEFAULT 0,
        action_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(food_id) REFERENCES food_posts(id),
        FOREIGN KEY(volunteer_id) REFERENCES users(id),
        FOREIGN KEY(provider_id) REFERENCES users(id)
    )`);

    // Notifications Table
    db.run(`CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        message TEXT,
        type TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);
});

module.exports = db;