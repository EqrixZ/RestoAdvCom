const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const DB_PATH = path.join(__dirname, "restobook.db");
const db = new sqlite3.Database(DB_PATH);

const run = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.run(sql, params, function onRun(err) {
            if (err) return reject(err);
            return resolve(this);
        });
    });

const get = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            return resolve(row);
        });
    });

function toSqliteDateTime(date) {
    return date.toISOString().slice(0, 19).replace("T", " ");
}

async function ensureSchema() {
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
            party_size INTEGER NOT NULL DEFAULT 1 CHECK (party_size > 0),
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

async function clearData() {
    await run("DELETE FROM ActivityLogs");
    await run("DELETE FROM Reservations");
    await run("DELETE FROM DiningTables");
    await run("DELETE FROM Customers");
    await run("DELETE FROM Zones");
    await run("DELETE FROM sqlite_sequence WHERE name IN ('ActivityLogs', 'Reservations', 'DiningTables', 'Customers', 'Zones')");
}

async function seed() {
    await ensureSchema();
    await clearData();

    const zones = [
        ["Indoor A", "Main hall near cashier", 0],
        ["Indoor B", "Quiet corner with AC", 0],
        ["Garden Back", "Shaded outdoor seating", 0],
        ["VIP Room 1", "Private room for meetings", 200],
        ["VIP Room 2", "Private room for family", 220],
        ["Rooftop", "Open-air rooftop dining", 120]
    ];

    for (const zone of zones) {
        await run(
            "INSERT INTO Zones (zone_name, description, extra_charge) VALUES (?, ?, ?)",
            zone
        );
    }

    const customers = [
        ["Anan Wongsa", "0891112233", "anan@example.com", "2025-08-03"],
        ["Ploy Srikul", "0891112234", "ploy@example.com", "2025-08-14"],
        ["Napat Jaroen", "0891112235", "napat@example.com", "2025-09-02"],
        ["Kanda Yim", "0891112236", "kanda@example.com", "2025-09-19"],
        ["Thanin Chai", "0891112237", "thanin@example.com", "2025-10-01"],
        ["Suda Preecha", "0891112238", "suda@example.com", "2025-10-18"],
        ["Arthit Rung", "0891112239", "arthit@example.com", "2025-11-07"],
        ["Mali Chan", "0891112240", "mali@example.com", "2025-11-23"],
        ["Jirapat Toon", "0891112241", "jirapat@example.com", "2025-12-05"],
        ["Rinrada Mee", "0891112242", "rinrada@example.com", "2025-12-27"],
        ["Somchai K.", "0891112243", "somchai@example.com", "2026-01-10"],
        ["Nisa L.", "0891112244", "nisa@example.com", "2026-01-21"]
    ];

    for (const customer of customers) {
        await run(
            "INSERT INTO Customers (full_name, phone, email, register_date) VALUES (?, ?, ?, ?)",
            customer
        );
    }

    const zoneRows = [];
    for (let i = 1; i <= zones.length; i += 1) {
        zoneRows.push(i);
    }

    const tables = [
        ["A01", 2, zoneRows[0], "Available"],
        ["A02", 4, zoneRows[0], "Available"],
        ["A03", 6, zoneRows[0], "Available"],
        ["A04", 8, zoneRows[0], "Available"],
        ["B01", 2, zoneRows[1], "Available"],
        ["B02", 6, zoneRows[1], "Available"],
        ["B03", 4, zoneRows[1], "Available"],
        ["B04", 8, zoneRows[1], "Available"],
        ["GB1", 4, zoneRows[2], "Available"],
        ["GB2", 8, zoneRows[2], "Available"],
        ["GB3", 6, zoneRows[2], "Available"],
        ["GB4", 10, zoneRows[2], "Available"],
        ["V1-1", 14, zoneRows[3], "Available"],
        ["V2-1", 10, zoneRows[4], "Available"],
        ["RT1", 6, zoneRows[5], "Available"],
        ["RT2", 8, zoneRows[5], "Available"],
        ["RT3", 10, zoneRows[5], "Available"],
        ["RT4", 12, zoneRows[5], "Available"]
    ];

    for (const table of tables) {
        await run(
            "INSERT INTO DiningTables (table_number, seat_count, zone_id, status) VALUES (?, ?, ?, ?)",
            table
        );
    }

    const customerMax = await get("SELECT MAX(id) AS id FROM Customers");
    const tableMax = await get("SELECT MAX(id) AS id FROM DiningTables");
    const customerIds = Array.from({ length: customerMax.id }, (_, idx) => idx + 1);
    const tableIds = Array.from({ length: tableMax.id }, (_, idx) => idx + 1);

    const base = new Date("2026-03-01T10:00:00");
    const statuses = [
        "Completed",
        "Completed",
        "Completed",
        "Confirmed",
        "Cancelled",
        "Completed",
        "Confirmed",
        "Completed",
        "Cancelled",
        "Confirmed"
    ];

    for (let i = 0; i < 20; i += 1) {
        const customerId = customerIds[i % customerIds.length];
        const tableId = tableIds[(i * 2) % tableIds.length];
        const tableRow = await get("SELECT seat_count FROM DiningTables WHERE id = ?", [tableId]);
        const seatCount = Number(tableRow && tableRow.seat_count ? tableRow.seat_count : 1);
        const start = new Date(base);
        start.setHours(base.getHours() + (i % 5) * 2);
        start.setDate(base.getDate() + Math.floor(i / 5));
        const end = new Date(start);
        end.setHours(end.getHours() + 2);
        const status = statuses[i % statuses.length];
        const desiredPartySize = 2 + (i % 4);
        const partySize = Math.max(1, Math.min(seatCount, desiredPartySize));

        await run(
            "INSERT INTO Reservations (customer_id, table_id, booking_time, end_time, party_size, status) VALUES (?, ?, ?, ?, ?, ?)",
            [customerId, tableId, toSqliteDateTime(start), toSqliteDateTime(end), partySize, status]
        );
    }
}

seed()
    .then(() => {
        console.log("Seed completed: 12 customers, 6 zones, 18 tables, 20 reservations.");
        db.close();
    })
    .catch((error) => {
        console.error("Seed failed:", error);
        db.close();
        process.exit(1);
    });
