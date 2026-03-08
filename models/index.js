const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "restobook",
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10
});

const run = async (sql, params = []) => {
    const [result] = await pool.query(sql, params);
    // Map mysql2's insertId to lastID for API compatibility
    if (result && typeof result.insertId === "number") {
        result.lastID = result.insertId;
    }
    return result;
};

const all = async (sql, params = []) => {
    const [rows] = await pool.query(sql, params);
    return rows;
};

const get = async (sql, params = []) => {
    const [rows] = await pool.query(sql, params);
    return rows[0] || null;
};

async function initDb() {
    await run(`
        CREATE TABLE IF NOT EXISTS Customers (
            id INT NOT NULL AUTO_INCREMENT,
            full_name TEXT NOT NULL,
            phone VARCHAR(20) NOT NULL,
            email VARCHAR(255) NOT NULL,
            register_date DATE NOT NULL DEFAULT (CURDATE()),
            PRIMARY KEY (id),
            UNIQUE KEY uq_customers_email (email)
        )
    `);
    await run(`
        CREATE TABLE IF NOT EXISTS Zones (
            id INT NOT NULL AUTO_INCREMENT,
            zone_name VARCHAR(100) NOT NULL,
            description TEXT,
            extra_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
            PRIMARY KEY (id),
            UNIQUE KEY uq_zones_name (zone_name)
        )
    `);
    await run(`
        CREATE TABLE IF NOT EXISTS DiningTables (
            id INT NOT NULL AUTO_INCREMENT,
            table_number VARCHAR(20) NOT NULL,
            seat_count INT NOT NULL CHECK (seat_count > 0),
            zone_id INT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'Available'
                CHECK (status IN ('Available', 'Maintenance')),
            PRIMARY KEY (id),
            UNIQUE KEY uq_tables_number (table_number),
            CONSTRAINT fk_tables_zone FOREIGN KEY (zone_id)
                REFERENCES Zones(id) ON DELETE RESTRICT
        )
    `);
    await run(`
        CREATE TABLE IF NOT EXISTS Reservations (
            id INT NOT NULL AUTO_INCREMENT,
            customer_id INT NOT NULL,
            table_id INT NOT NULL,
            booking_time DATETIME NOT NULL,
            end_time DATETIME NOT NULL,
            party_size INT NOT NULL DEFAULT 1 CHECK (party_size > 0),
            status VARCHAR(20) NOT NULL DEFAULT 'Confirmed'
                CHECK (status IN ('Confirmed', 'Completed', 'Cancelled')),
            PRIMARY KEY (id),
            CONSTRAINT fk_res_customer FOREIGN KEY (customer_id)
                REFERENCES Customers(id) ON DELETE RESTRICT,
            CONSTRAINT fk_res_table FOREIGN KEY (table_id)
                REFERENCES DiningTables(id) ON DELETE RESTRICT
        )
    `);
    // Migration: add party_size if missing on existing databases
    const cols = await all(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'Reservations'
           AND COLUMN_NAME = 'party_size'`
    );
    if (cols.length === 0) {
        await run("ALTER TABLE Reservations ADD COLUMN party_size INT NOT NULL DEFAULT 1");
    }
    await run(`
        CREATE TABLE IF NOT EXISTS ActivityLogs (
            id INT NOT NULL AUTO_INCREMENT,
            activity_type VARCHAR(50) NOT NULL,
            activity_text TEXT NOT NULL,
            activity_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        )
    `);
}

module.exports = {
    pool,
    run,
    all,
    get,
    initDb
};
