const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

const DB_DIR = path.join(__dirname, "..", "database");
const DB_PATH = path.join(DB_DIR, "restobook.db");

fs.mkdirSync(DB_DIR, { recursive: true });

const db = new sqlite3.Database(DB_PATH);

const run = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.run(sql, params, function onRun(err) {
            if (err) return reject(err);
            return resolve(this);
        });
    });

const all = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            return resolve(rows);
        });
    });

const get = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            return resolve(row);
        });
    });

async function initDb() {
    await run("PRAGMA foreign_keys = ON");
    await run(`
        CREATE TABLE IF NOT EXISTS Customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            register_date TEXT NOT NULL DEFAULT (date('now'))
        )
    `);
    await run(`
        CREATE TABLE IF NOT EXISTS Zones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            zone_name TEXT NOT NULL UNIQUE,
            description TEXT,
            extra_charge REAL NOT NULL DEFAULT 0
        )
    `);
    await run(`
        CREATE TABLE IF NOT EXISTS DiningTables (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            table_number TEXT NOT NULL UNIQUE,
            seat_count INTEGER NOT NULL CHECK (seat_count > 0),
            zone_id INTEGER NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('Available', 'Maintenance')) DEFAULT 'Available',
            FOREIGN KEY (zone_id) REFERENCES Zones(id) ON DELETE RESTRICT
        )
    `);
    await run(`
        CREATE TABLE IF NOT EXISTS Reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            table_id INTEGER NOT NULL,
            booking_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('Confirmed', 'Completed', 'Cancelled')) DEFAULT 'Confirmed',
            FOREIGN KEY (customer_id) REFERENCES Customers(id) ON DELETE RESTRICT,
            FOREIGN KEY (table_id) REFERENCES DiningTables(id) ON DELETE RESTRICT
        )
    `);
    await run(`
        CREATE TABLE IF NOT EXISTS ActivityLogs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            activity_type TEXT NOT NULL,
            activity_text TEXT NOT NULL,
            activity_time TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )
    `);
}

module.exports = {
    DB_PATH,
    run,
    all,
    get,
    initDb
};
