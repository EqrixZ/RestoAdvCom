const express = require("express");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const sqlite3 = require("sqlite3").verbose();
const { body, param, validationResult } = require("express-validator");

const app = express();
const PORT = process.env.PORT;
if (!PORT) throw new Error("PORT is required in .env");
const DB_DIR = path.join(__dirname, "database");
const DB_PATH = path.join(DB_DIR, "restobook.db");

fs.mkdirSync(DB_DIR, { recursive: true });

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use((req, res, next) => {
    if (req.method === "POST" && req.body && req.body._method) {
        req.method = String(req.body._method).toUpperCase();
    }
    next();
});
app.use((req, res, next) => {
    res.locals.flashMessage = "";
    res.locals.flashType = "success";
    res.locals.title = "เรสโตบุ๊ก";
    res.locals.activePage = "";
    next();
});

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

function toSqliteDateTime(input) {
    if (!input) return null;
    const normalized = input.trim().replace("T", " ");
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)) return `${normalized}:00`;
    return normalized;
}

function toDateTimeLocal(value) {
    if (!value) return "";
    return String(value).slice(0, 16).replace(" ", "T");
}

function handleError(res, error) {
    console.error(error);
    res.status(500).send("เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์");
}

function parseSqlError(error, fallback) {
    if (!error) return fallback;
    if (error.message.includes("UNIQUE constraint failed")) return "พบข้อมูลซ้ำ กรุณาใช้ค่าที่ไม่ซ้ำ";
    if (error.message.includes("FOREIGN KEY constraint failed")) return "ไม่สามารถลบรายการนี้ได้ เพราะมีข้อมูลอื่นเชื่อมโยงอยู่";
    if (error.message.includes("CHECK constraint failed")) return "ค่าไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่กรอก";
    return fallback;
}

function redirectWithFlash(res, route, type, message) {
    const params = new URLSearchParams({ flashType: type, flashMessage: message });
    res.redirect(`${route}?${params.toString()}`);
}

function renderPage(res, payload) {
    res.render("layout", {
        flashMessage: payload.flashMessage || "",
        flashType: payload.flashType || "success",
        ...payload
    });
}

function validateOrRedirect(req, res, route) {
    const result = validationResult(req);
    if (result.isEmpty()) return false;
    redirectWithFlash(res, route, "error", result.array()[0].msg);
    return true;
}

async function logActivity(activityType, activityText) {
    await run(
        "INSERT INTO ActivityLogs (activity_type, activity_text, activity_time) VALUES (?, ?, datetime('now', 'localtime'))",
        [activityType, activityText]
    );
}

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

app.get("/", (req, res) => res.redirect("/home"));

app.get("/home", async (req, res) => {
    try {
        const [customerCount, zoneCount, tableCount, reservationCount, activeReservations, recentActivities] = await Promise.all([
            get("SELECT COUNT(*) AS count FROM Customers"),
            get("SELECT COUNT(*) AS count FROM Zones"),
            get("SELECT COUNT(*) AS count FROM DiningTables"),
            get("SELECT COUNT(*) AS count FROM Reservations"),
            get("SELECT COUNT(*) AS count FROM Reservations WHERE status = 'Confirmed'"),
            all("SELECT activity_type, activity_text, activity_time FROM ActivityLogs ORDER BY datetime(activity_time) DESC LIMIT 10")
        ]);

        renderPage(res, {
            title: "หน้าแรก",
            activePage: "home",
            content: "index",
            stats: {
                customers: customerCount.count,
                zones: zoneCount.count,
                tables: tableCount.count,
                reservations: reservationCount.count,
                activeReservations: activeReservations.count
            },
            recentActivities,
            flashType: req.query.flashType,
            flashMessage: req.query.flashMessage
        });
    } catch (error) {
        handleError(res, error);
    }
});

// Customers CRUD
app.get("/customers", async (req, res) => {
    try {
        const customers = await all("SELECT * FROM Customers ORDER BY id DESC");
        renderPage(res, {
            title: "ลูกค้า",
            activePage: "customers",
            content: "customers/index",
            customers,
            flashType: req.query.flashType,
            flashMessage: req.query.flashMessage
        });
    } catch (error) {
        handleError(res, error);
    }
});

app.get("/customers/new", (req, res) => {
    renderPage(res, { title: "ลูกค้าใหม่", activePage: "customers", content: "customers/new", customer: {} });
});

app.post("/customers", [
    body("full_name").trim().notEmpty().withMessage("กรุณากรอกชื่อ-นามสกุล"),
    body("phone").trim().isLength({ min: 8, max: 20 }).withMessage("เบอร์โทรต้องยาว 8-20 ตัวอักษร"),
    body("email").trim().isEmail().withMessage("กรุณากรอกอีเมลให้ถูกต้อง"),
    body("register_date").optional({ values: "falsy" }).isISO8601({ strict: true }).withMessage("วันที่ลงทะเบียนไม่ถูกต้อง")
], async (req, res) => {
    if (validateOrRedirect(req, res, "/customers/new")) return;
    const { full_name, phone, email, register_date } = req.body;
    try {
        const insertResult = await run("INSERT INTO Customers (full_name, phone, email, register_date) VALUES (?, ?, ?, ?)", [
            full_name.trim(), phone.trim(), email.trim(), register_date || new Date().toISOString().slice(0, 10)
        ]);
        await logActivity("Customer", `ลูกค้าใหม่: ${full_name.trim()} (#${insertResult.lastID})`);
        redirectWithFlash(res, "/customers", "success", "เพิ่มลูกค้าสำเร็จ");
    } catch (error) {
        redirectWithFlash(res, "/customers/new", "error", parseSqlError(error, "ไม่สามารถเพิ่มลูกค้าได้"));
    }
});

app.get("/customers/:id", async (req, res) => {
    try {
        const customer = await get("SELECT * FROM Customers WHERE id = ?", [Number(req.params.id)]);
        if (!customer) return res.status(404).send("ไม่พบลูกค้า");
        const reservations = await all(
            `SELECT r.id, r.booking_time, r.end_time, r.status, t.table_number, z.zone_name
             FROM Reservations r
             INNER JOIN DiningTables t ON t.id = r.table_id
             INNER JOIN Zones z ON z.id = t.zone_id
             WHERE r.customer_id = ?
             ORDER BY datetime(r.booking_time) DESC`, [customer.id]
        );
        renderPage(res, { title: "รายละเอียดลูกค้า", activePage: "customers", content: "customers/show", customer, reservations });
    } catch (error) {
        handleError(res, error);
    }
});

app.get("/customers/:id/edit", async (req, res) => {
    try {
        const customer = await get("SELECT * FROM Customers WHERE id = ?", [Number(req.params.id)]);
        if (!customer) return res.status(404).send("ไม่พบลูกค้า");
        renderPage(res, { title: "แก้ไขลูกค้า", activePage: "customers", content: "customers/edit", customer });
    } catch (error) {
        handleError(res, error);
    }
});

app.put("/customers/:id", [
    param("id").isInt({ min: 1 }).withMessage("รหัสลูกค้าไม่ถูกต้อง"),
    body("full_name").trim().notEmpty().withMessage("กรุณากรอกชื่อ-นามสกุล"),
    body("phone").trim().isLength({ min: 8, max: 20 }).withMessage("เบอร์โทรต้องยาว 8-20 ตัวอักษร"),
    body("email").trim().isEmail().withMessage("กรุณากรอกอีเมลให้ถูกต้อง"),
    body("register_date").optional({ values: "falsy" }).isISO8601({ strict: true }).withMessage("วันที่ลงทะเบียนไม่ถูกต้อง")
], async (req, res) => {
    const id = Number(req.params.id);
    if (validateOrRedirect(req, res, `/customers/${id}/edit`)) return;
    const { full_name, phone, email, register_date } = req.body;
    try {
        await run("UPDATE Customers SET full_name = ?, phone = ?, email = ?, register_date = ? WHERE id = ?", [
            full_name.trim(), phone.trim(), email.trim(), register_date, id
        ]);
        redirectWithFlash(res, `/customers/${id}`, "success", "อัปเดตข้อมูลลูกค้าสำเร็จ");
    } catch (error) {
        redirectWithFlash(res, `/customers/${id}/edit`, "error", parseSqlError(error, "ไม่สามารถอัปเดตข้อมูลลูกค้าได้"));
    }
});

app.delete("/customers/:id", [param("id").isInt({ min: 1 }).withMessage("รหัสลูกค้าไม่ถูกต้อง")], async (req, res) => {
    if (validateOrRedirect(req, res, "/customers")) return;
    try {
        await run("DELETE FROM Customers WHERE id = ?", [Number(req.params.id)]);
        redirectWithFlash(res, "/customers", "success", "ลบลูกค้าสำเร็จ");
    } catch (error) {
        redirectWithFlash(res, "/customers", "error", parseSqlError(error, "ไม่สามารถลบลูกค้าได้"));
    }
});

// Zones CRUD
app.get("/zones", async (req, res) => {
    try {
        const zones = await all(
            `SELECT z.*, COUNT(t.id) AS table_count
             FROM Zones z
             LEFT JOIN DiningTables t ON t.zone_id = z.id
             GROUP BY z.id
             ORDER BY z.id DESC`
        );
        renderPage(res, { title: "โซน", activePage: "zones", content: "zones/index", zones, flashType: req.query.flashType, flashMessage: req.query.flashMessage });
    } catch (error) {
        handleError(res, error);
    }
});

app.get("/zones/new", (req, res) => {
    renderPage(res, { title: "โซนใหม่", activePage: "zones", content: "zones/new", zone: {} });
});

app.post("/zones", [
    body("zone_name").trim().notEmpty().withMessage("กรุณากรอกชื่อโซน"),
    body("description").optional({ values: "falsy" }).trim().isLength({ max: 250 }).withMessage("รายละเอียดยาวเกินกำหนด"),
    body("extra_charge").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("ค่าบริการเพิ่มเติมต้องไม่ติดลบ")
], async (req, res) => {
    if (validateOrRedirect(req, res, "/zones/new")) return;
    const { zone_name, description, extra_charge } = req.body;
    try {
        await run("INSERT INTO Zones (zone_name, description, extra_charge) VALUES (?, ?, ?)", [zone_name.trim(), (description || "").trim(), Number(extra_charge || 0)]);
        redirectWithFlash(res, "/zones", "success", "เพิ่มโซนสำเร็จ");
    } catch (error) {
        redirectWithFlash(res, "/zones/new", "error", parseSqlError(error, "ไม่สามารถเพิ่มโซนได้"));
    }
});

app.get("/zones/:id", async (req, res) => {
    try {
        const zone = await get("SELECT * FROM Zones WHERE id = ?", [Number(req.params.id)]);
        if (!zone) return res.status(404).send("ไม่พบโซน");
        const tables = await all("SELECT id, table_number, seat_count, status FROM DiningTables WHERE zone_id = ? ORDER BY table_number", [zone.id]);
        renderPage(res, { title: "รายละเอียดโซน", activePage: "zones", content: "zones/show", zone, tables });
    } catch (error) {
        handleError(res, error);
    }
});

app.get("/zones/:id/edit", async (req, res) => {
    try {
        const zone = await get("SELECT * FROM Zones WHERE id = ?", [Number(req.params.id)]);
        if (!zone) return res.status(404).send("ไม่พบโซน");
        renderPage(res, { title: "แก้ไขโซน", activePage: "zones", content: "zones/edit", zone });
    } catch (error) {
        handleError(res, error);
    }
});

app.put("/zones/:id", [
    param("id").isInt({ min: 1 }).withMessage("รหัสโซนไม่ถูกต้อง"),
    body("zone_name").trim().notEmpty().withMessage("กรุณากรอกชื่อโซน"),
    body("description").optional({ values: "falsy" }).trim().isLength({ max: 250 }).withMessage("รายละเอียดยาวเกินกำหนด"),
    body("extra_charge").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("ค่าบริการเพิ่มเติมต้องไม่ติดลบ")
], async (req, res) => {
    const id = Number(req.params.id);
    if (validateOrRedirect(req, res, `/zones/${id}/edit`)) return;
    const { zone_name, description, extra_charge } = req.body;
    try {
        await run("UPDATE Zones SET zone_name = ?, description = ?, extra_charge = ? WHERE id = ?", [zone_name.trim(), (description || "").trim(), Number(extra_charge || 0), id]);
        redirectWithFlash(res, `/zones/${id}`, "success", "อัปเดตโซนสำเร็จ");
    } catch (error) {
        redirectWithFlash(res, `/zones/${id}/edit`, "error", parseSqlError(error, "ไม่สามารถอัปเดตโซนได้"));
    }
});

app.delete("/zones/:id", [param("id").isInt({ min: 1 }).withMessage("รหัสโซนไม่ถูกต้อง")], async (req, res) => {
    if (validateOrRedirect(req, res, "/zones")) return;
    try {
        await run("DELETE FROM Zones WHERE id = ?", [Number(req.params.id)]);
        redirectWithFlash(res, "/zones", "success", "ลบโซนสำเร็จ");
    } catch (error) {
        redirectWithFlash(res, "/zones", "error", parseSqlError(error, "ไม่สามารถลบโซนได้"));
    }
});

// Tables CRUD
app.get("/tables", async (req, res) => {
    try {
        const tables = await all(
            `SELECT t.*, z.zone_name
             FROM DiningTables t
             INNER JOIN Zones z ON z.id = t.zone_id
             ORDER BY t.id DESC`
        );
        renderPage(res, { title: "โต๊ะอาหาร", activePage: "tables", content: "tables/index", tables, flashType: req.query.flashType, flashMessage: req.query.flashMessage });
    } catch (error) {
        handleError(res, error);
    }
});

app.get("/tables/new", async (req, res) => {
    try {
        const zones = await all("SELECT id, zone_name FROM Zones ORDER BY zone_name");
        renderPage(res, { title: "โต๊ะใหม่", activePage: "tables", content: "tables/new", table: {}, zones });
    } catch (error) {
        handleError(res, error);
    }
});

app.post("/tables", [
    body("table_number").trim().notEmpty().withMessage("กรุณากรอกหมายเลขโต๊ะ"),
    body("seat_count").isInt({ min: 1 }).withMessage("จำนวนที่นั่งต้องอย่างน้อย 1"),
    body("zone_id").isInt({ min: 1 }).withMessage("กรุณาเลือกโซน"),
    body("status").isIn(["Available", "Maintenance"]).withMessage("สถานะโต๊ะไม่ถูกต้อง")
], async (req, res) => {
    if (validateOrRedirect(req, res, "/tables/new")) return;
    const { table_number, seat_count, zone_id, status } = req.body;
    try {
        await run("INSERT INTO DiningTables (table_number, seat_count, zone_id, status) VALUES (?, ?, ?, ?)", [table_number.trim(), Number(seat_count), Number(zone_id), status]);
        redirectWithFlash(res, "/tables", "success", "เพิ่มโต๊ะอาหารสำเร็จ");
    } catch (error) {
        redirectWithFlash(res, "/tables/new", "error", parseSqlError(error, "ไม่สามารถเพิ่มโต๊ะได้"));
    }
});

app.get("/tables/:id", async (req, res) => {
    try {
        const table = await get(
            `SELECT t.*, z.zone_name
             FROM DiningTables t
             INNER JOIN Zones z ON z.id = t.zone_id
             WHERE t.id = ?`, [Number(req.params.id)]
        );
        if (!table) return res.status(404).send("ไม่พบโต๊ะ")
        const reservations = await all(
            `SELECT r.id, r.booking_time, r.end_time, r.status, c.full_name
             FROM Reservations r
             INNER JOIN Customers c ON c.id = r.customer_id
             WHERE r.table_id = ?
             ORDER BY datetime(r.booking_time) DESC`, [table.id]
        );
        renderPage(res, { title: "รายละเอียดโต๊ะ", activePage: "tables", content: "tables/show", table, reservations });
    } catch (error) {
        handleError(res, error);
    }
});

app.get("/tables/:id/edit", async (req, res) => {
    try {
        const [table, zones] = await Promise.all([
            get("SELECT * FROM DiningTables WHERE id = ?", [Number(req.params.id)]),
            all("SELECT id, zone_name FROM Zones ORDER BY zone_name")
        ]);
        if (!table) return res.status(404).send("ไม่พบโต๊ะ")
        renderPage(res, { title: "แก้ไขโต๊ะ", activePage: "tables", content: "tables/edit", table, zones });
    } catch (error) {
        handleError(res, error);
    }
});

app.put("/tables/:id", [
    param("id").isInt({ min: 1 }).withMessage("รหัสโต๊ะไม่ถูกต้อง"),
    body("table_number").trim().notEmpty().withMessage("กรุณากรอกหมายเลขโต๊ะ"),
    body("seat_count").isInt({ min: 1 }).withMessage("จำนวนที่นั่งต้องอย่างน้อย 1"),
    body("zone_id").isInt({ min: 1 }).withMessage("กรุณาเลือกโซน"),
    body("status").isIn(["Available", "Maintenance"]).withMessage("สถานะโต๊ะไม่ถูกต้อง")
], async (req, res) => {
    const id = Number(req.params.id);
    if (validateOrRedirect(req, res, `/tables/${id}/edit`)) return;
    const { table_number, seat_count, zone_id, status } = req.body;
    try {
        await run("UPDATE DiningTables SET table_number = ?, seat_count = ?, zone_id = ?, status = ? WHERE id = ?", [table_number.trim(), Number(seat_count), Number(zone_id), status, id]);
        redirectWithFlash(res, `/tables/${id}`, "success", "อัปเดตโต๊ะสำเร็จ");
    } catch (error) {
        redirectWithFlash(res, `/tables/${id}/edit`, "error", parseSqlError(error, "ไม่สามารถอัปเดตโต๊ะได้"));
    }
});

app.delete("/tables/:id", [param("id").isInt({ min: 1 }).withMessage("รหัสโต๊ะไม่ถูกต้อง")], async (req, res) => {
    if (validateOrRedirect(req, res, "/tables")) return;
    try {
        await run("DELETE FROM DiningTables WHERE id = ?", [Number(req.params.id)]);
        redirectWithFlash(res, "/tables", "success", "ลบโต๊ะสำเร็จ");
    } catch (error) {
        redirectWithFlash(res, "/tables", "error", parseSqlError(error, "ไม่สามารถลบโต๊ะได้"));
    }
});

// Reservations CRUD
async function loadReservationFormData() {
    const [customers, tables] = await Promise.all([
        all("SELECT id, full_name, phone FROM Customers ORDER BY full_name"),
        all(`SELECT t.id, t.table_number, t.seat_count, t.status, z.zone_name FROM DiningTables t INNER JOIN Zones z ON z.id = t.zone_id ORDER BY t.table_number`)
    ]);
    return { customers, tables };
}

app.get("/reservations", async (req, res) => {
    try {
        const reservations = await all(
            `SELECT r.*, c.full_name AS customer_name, t.table_number, z.zone_name
             FROM Reservations r
             INNER JOIN Customers c ON c.id = r.customer_id
             INNER JOIN DiningTables t ON t.id = r.table_id
             INNER JOIN Zones z ON z.id = t.zone_id
             ORDER BY datetime(r.booking_time) DESC`
        );
        renderPage(res, { title: "การจอง", activePage: "reservations", content: "reservations/index", reservations, flashType: req.query.flashType, flashMessage: req.query.flashMessage });
    } catch (error) {
        handleError(res, error);
    }
});

app.get("/reservations/new", async (req, res) => {
    try {
        const formData = await loadReservationFormData();
        renderPage(res, { title: "การจองใหม่", activePage: "reservations", content: "reservations/new", reservation: {}, ...formData });
    } catch (error) {
        handleError(res, error);
    }
});

app.post("/reservations", [
    body("customer_id").isInt({ min: 1 }).withMessage("กรุณาเลือกลูกค้า"),
    body("table_id").isInt({ min: 1 }).withMessage("กรุณาเลือกโต๊ะ"),
    body("booking_time").notEmpty().withMessage("กรุณาเลือกเวลาเริ่มจอง").bail().isISO8601().withMessage("เวลาเริ่มจองไม่ถูกต้อง"),
    body("status").optional().isIn(["Confirmed", "Completed", "Cancelled"]).withMessage("สถานะไม่ถูกต้อง")
], async (req, res) => {
    if (validateOrRedirect(req, res, "/reservations/new")) return;
    const customerId = Number(req.body.customer_id);
    const tableId = Number(req.body.table_id);
    const bookingTime = toSqliteDateTime(req.body.booking_time);
    const status = req.body.status || "Confirmed";

    try {
        const table = await get("SELECT status FROM DiningTables WHERE id = ?", [tableId]);
        if (!table) return redirectWithFlash(res, "/reservations/new", "error", "ไม่พบโต๊ะ");
        if (table.status === "Maintenance") return redirectWithFlash(res, "/reservations/new", "error", "โต๊ะนี้อยู่ระหว่างปิดปรับปรุง");

        const overlap = await get(
            `SELECT COUNT(*) AS count
             FROM Reservations
             WHERE table_id = ?
               AND status != 'Cancelled'
               AND booking_time < datetime(?, '+2 hours')
               AND end_time > ?`, [tableId, bookingTime, bookingTime]
        );
        if (overlap.count > 0) return redirectWithFlash(res, "/reservations/new", "error", "โต๊ะนี้มีการจองแล้วในช่วงเวลาดังกล่าว");

        const endRow = await get("SELECT datetime(?, '+2 hours') AS end_time", [bookingTime]);
        const insertResult = await run("INSERT INTO Reservations (customer_id, table_id, booking_time, end_time, status) VALUES (?, ?, ?, ?, ?)", [
            customerId, tableId, bookingTime, endRow.end_time, status
        ]);
        const detail = await get(
            `SELECT c.full_name AS customer_name, t.table_number
             FROM Customers c
             INNER JOIN DiningTables t ON t.id = ?
             WHERE c.id = ?`,
            [tableId, customerId]
        );
        const customerName = detail ? detail.customer_name : `ลูกค้า #${customerId}`;
        const tableNumber = detail ? detail.table_number : `#${tableId}`;
        await logActivity("Reservation", `เพิ่มการจอง #${insertResult.lastID} - ${customerName} @ โต๊ะ ${tableNumber}`);
        redirectWithFlash(res, "/reservations", "success", "สร้างการจองสำเร็จ");
    } catch (error) {
        redirectWithFlash(res, "/reservations/new", "error", parseSqlError(error, "ไม่สามารถสร้างการจองได้"));
    }
});

app.get("/reservations/:id", async (req, res) => {
    try {
        const reservation = await get(
            `SELECT
                r.*, c.full_name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
                t.table_number, t.seat_count, z.zone_name
             FROM Reservations r
             INNER JOIN Customers c ON c.id = r.customer_id
             INNER JOIN DiningTables t ON t.id = r.table_id
             INNER JOIN Zones z ON z.id = t.zone_id
             WHERE r.id = ?`, [Number(req.params.id)]
        );
        if (!reservation) return res.status(404).send("ไม่พบการจอง")
        renderPage(res, { title: "รายละเอียดการจอง", activePage: "reservations", content: "reservations/show", reservation });
    } catch (error) {
        handleError(res, error);
    }
});

app.get("/reservations/:id/edit", async (req, res) => {
    try {
        const [reservation, formData] = await Promise.all([
            get("SELECT * FROM Reservations WHERE id = ?", [Number(req.params.id)]),
            loadReservationFormData()
        ]);
        if (!reservation) return res.status(404).send("ไม่พบการจอง")
        reservation.booking_time_local = toDateTimeLocal(reservation.booking_time);
        renderPage(res, { title: "แก้ไขการจอง", activePage: "reservations", content: "reservations/edit", reservation, ...formData });
    } catch (error) {
        handleError(res, error);
    }
});

app.put("/reservations/:id", [
    param("id").isInt({ min: 1 }).withMessage("รหัสการจองไม่ถูกต้อง"),
    body("customer_id").isInt({ min: 1 }).withMessage("กรุณาเลือกลูกค้า"),
    body("table_id").isInt({ min: 1 }).withMessage("กรุณาเลือกโต๊ะ"),
    body("booking_time").notEmpty().withMessage("กรุณาเลือกเวลาเริ่มจอง").bail().isISO8601().withMessage("เวลาเริ่มจองไม่ถูกต้อง"),
    body("status").isIn(["Confirmed", "Completed", "Cancelled"]).withMessage("สถานะไม่ถูกต้อง")
], async (req, res) => {
    const id = Number(req.params.id);
    if (validateOrRedirect(req, res, `/reservations/${id}/edit`)) return;
    const customerId = Number(req.body.customer_id);
    const tableId = Number(req.body.table_id);
    const bookingTime = toSqliteDateTime(req.body.booking_time);
    const status = req.body.status;

    try {
        const table = await get("SELECT status FROM DiningTables WHERE id = ?", [tableId]);
        if (!table) return redirectWithFlash(res, `/reservations/${id}/edit`, "error", "ไม่พบโต๊ะ");
        if (table.status === "Maintenance") return redirectWithFlash(res, `/reservations/${id}/edit`, "error", "โต๊ะนี้อยู่ระหว่างปิดปรับปรุง");

        const overlap = await get(
            `SELECT COUNT(*) AS count
             FROM Reservations
             WHERE table_id = ?
               AND id != ?
               AND status != 'Cancelled'
               AND booking_time < datetime(?, '+2 hours')
               AND end_time > ?`, [tableId, id, bookingTime, bookingTime]
        );
        if (overlap.count > 0) return redirectWithFlash(res, `/reservations/${id}/edit`, "error", "โต๊ะนี้มีการจองแล้วในช่วงเวลาดังกล่าว");

        const endRow = await get("SELECT datetime(?, '+2 hours') AS end_time", [bookingTime]);
        await run(
            `UPDATE Reservations
             SET customer_id = ?, table_id = ?, booking_time = ?, end_time = ?, status = ?
             WHERE id = ?`, [customerId, tableId, bookingTime, endRow.end_time, status, id]
        );
        const detail = await get(
            `SELECT c.full_name AS customer_name, t.table_number
             FROM Customers c
             INNER JOIN DiningTables t ON t.id = ?
             WHERE c.id = ?`,
            [tableId, customerId]
        );
        const customerName = detail ? detail.customer_name : `ลูกค้า #${customerId}`;
        const tableNumber = detail ? detail.table_number : `#${tableId}`;
        await logActivity("Reservation", `แก้ไขการจอง #${id} - ${customerName} @ โต๊ะ ${tableNumber}`);
        redirectWithFlash(res, `/reservations/${id}`, "success", "อัปเดตการจองสำเร็จ");
    } catch (error) {
        redirectWithFlash(res, `/reservations/${id}/edit`, "error", parseSqlError(error, "ไม่สามารถอัปเดตการจองได้"));
    }
});

app.delete("/reservations/:id", [param("id").isInt({ min: 1 }).withMessage("รหัสการจองไม่ถูกต้อง")], async (req, res) => {
    if (validateOrRedirect(req, res, "/reservations")) return;
    try {
        const reservationId = Number(req.params.id);
        const detail = await get(
            `SELECT c.full_name AS customer_name, t.table_number
             FROM Reservations r
             INNER JOIN Customers c ON c.id = r.customer_id
             INNER JOIN DiningTables t ON t.id = r.table_id
             WHERE r.id = ?`,
            [reservationId]
        );
        await run("DELETE FROM Reservations WHERE id = ?", [reservationId]);
        if (detail) {
            await logActivity("Reservation", `ลบการจอง #${reservationId} - ${detail.customer_name} @ โต๊ะ ${detail.table_number}`);
        } else {
            await logActivity("Reservation", `ลบการจอง #${reservationId}`);
        }
        redirectWithFlash(res, "/reservations", "success", "ลบการจองสำเร็จ");
    } catch (error) {
        redirectWithFlash(res, "/reservations", "error", parseSqlError(error, "ไม่สามารถลบการจองได้"));
    }
});

// Reports
app.get("/reports", (req, res) => res.redirect("/reports/daily-table-usage"));

app.get("/reports/daily-table-usage", async (req, res) => {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const status = req.query.status || "All";
    try {
        const params = [date];
        let statusClause = "";
        if (status !== "All") {
            statusClause = "AND r.status = ?";
            params.push(status);
        }
        const rows = await all(
            `SELECT
                r.id,
                t.table_number,
                z.zone_name,
                c.full_name AS customer_name,
                r.booking_time,
                r.end_time,
                r.status
             FROM Reservations r
             INNER JOIN Customers c ON c.id = r.customer_id
             INNER JOIN DiningTables t ON t.id = r.table_id
             INNER JOIN Zones z ON z.id = t.zone_id
             WHERE date(r.booking_time) = date(?)
             ${statusClause}
             ORDER BY datetime(r.booking_time)`, params
        );
        const summary = {
            total: rows.length,
            confirmed: rows.filter((r) => r.status === "Confirmed").length,
            completed: rows.filter((r) => r.status === "Completed").length,
            cancelled: rows.filter((r) => r.status === "Cancelled").length
        };
        renderPage(res, { title: "การใช้งานโต๊ะรายวัน", activePage: "reports", content: "reports/daily-usage", rows, date, status, summary });
    } catch (error) {
        handleError(res, error);
    }
});

app.get("/reports/zone-visitors", async (req, res) => {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const zoneId = req.query.zone_id || "All";
    try {
        const zones = await all("SELECT id, zone_name FROM Zones ORDER BY zone_name");
        const params = [date];
        let zoneClause = "";
        if (zoneId !== "All") {
            zoneClause = "AND z.id = ?";
            params.push(Number(zoneId));
        }
        const rows = await all(
            `SELECT
                z.id,
                z.zone_name,
                COUNT(r.id) AS reservation_count,
                IFNULL(SUM(t.seat_count), 0) AS estimated_visitors,
                SUM(CASE WHEN r.status = 'Confirmed' THEN 1 ELSE 0 END) AS confirmed_count,
                SUM(CASE WHEN r.status = 'Completed' THEN 1 ELSE 0 END) AS completed_count,
                SUM(CASE WHEN r.status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled_count
             FROM Zones z
             LEFT JOIN DiningTables t ON t.zone_id = z.id
             LEFT JOIN Reservations r ON r.table_id = t.id AND date(r.booking_time) = date(?)
             WHERE 1=1 ${zoneClause}
             GROUP BY z.id
             ORDER BY z.zone_name`, params
        );
        const summary = {
            zones: rows.length,
            reservations: rows.reduce((acc, row) => acc + Number(row.reservation_count || 0), 0),
            visitors: rows.reduce((acc, row) => acc + Number(row.estimated_visitors || 0), 0)
        };
        renderPage(res, { title: "สรุปผู้ใช้บริการตามโซน", activePage: "reports", content: "reports/zone-visitors", rows, zones, date, zoneId, summary });
    } catch (error) {
        handleError(res, error);
    }
});

initDb()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`RestoBook พร้อมใช้งานที่ http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error("เริ่มต้นฐานข้อมูลไม่สำเร็จ:", error);
        process.exit(1);
    });
