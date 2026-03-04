const express = require("express");
const customerModel = require("../models/customerModel");
const zoneModel = require("../models/zoneModel");
const tableModel = require("../models/tableModel");
const reservationModel = require("../models/reservationModel");
const reportModel = require("../models/reportModel");
const activityLogModel = require("../models/activityLogModel");
const { parseSqlError } = require("../controllers/httpHelpers");

const router = express.Router();

function toSqliteDateTime(input) {
    if (!input) return null;
    const normalized = String(input).trim().replace("T", " ");
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)) return `${normalized}:00`;
    return normalized;
}

function fail(res, status, message, detail) {
    return res.status(status).json({ ok: false, message, detail });
}

router.get("/health", (req, res) => {
    res.json({ ok: true, service: "RestoBook API" });
});

router.get("/stats/overview", async (req, res) => {
    try {
        const [customerCount, zoneCount, tableCount, reservationCount, confirmedCount] = await Promise.all([
            customerModel.countAll(),
            zoneModel.countAll(),
            tableModel.countAll(),
            reservationModel.countAll(),
            reservationModel.countConfirmed()
        ]);
        res.json({
            ok: true,
            data: {
                customers: Number(customerCount.count || 0),
                zones: Number(zoneCount.count || 0),
                tables: Number(tableCount.count || 0),
                reservations: Number(reservationCount.count || 0),
                activeReservations: Number(confirmedCount.count || 0)
            }
        });
    } catch (error) {
        fail(res, 500, "โหลดสถิติไม่สำเร็จ", error.message);
    }
});

router.get("/activities/recent", async (req, res) => {
    try {
        const limit = Number(req.query.limit || 10);
        const rows = await activityLogModel.recent(Number.isInteger(limit) && limit > 0 ? limit : 10);
        res.json({ ok: true, data: rows });
    } catch (error) {
        fail(res, 500, "โหลดกิจกรรมไม่สำเร็จ", error.message);
    }
});

router.post("/activities", async (req, res) => {
    const { activity_type, activity_text } = req.body || {};
    if (!activity_type || !activity_text) return fail(res, 400, "กรอก activity_type และ activity_text ให้ครบ");
    try {
        await activityLogModel.create(String(activity_type), String(activity_text));
        res.status(201).json({ ok: true });
    } catch (error) {
        fail(res, 400, "บันทึกกิจกรรมไม่สำเร็จ", error.message);
    }
});

router.get("/customers", async (req, res) => {
    try {
        const rows = await customerModel.list();
        res.json({ ok: true, data: rows });
    } catch (error) {
        fail(res, 500, "โหลดข้อมูลลูกค้าไม่สำเร็จ", error.message);
    }
});

router.get("/customers/:id", async (req, res) => {
    try {
        const row = await customerModel.findById(Number(req.params.id));
        if (!row) return fail(res, 404, "ไม่พบลูกค้า");
        res.json({ ok: true, data: row });
    } catch (error) {
        fail(res, 500, "โหลดข้อมูลลูกค้าไม่สำเร็จ", error.message);
    }
});

router.get("/customers/:id/reservations", async (req, res) => {
    try {
        const customerId = Number(req.params.id);
        const customer = await customerModel.findById(customerId);
        if (!customer) return fail(res, 404, "ไม่พบลูกค้า");
        const rows = await customerModel.reservationsByCustomer(customerId);
        res.json({ ok: true, data: rows });
    } catch (error) {
        fail(res, 500, "โหลดข้อมูลการจองของลูกค้าไม่สำเร็จ", error.message);
    }
});

router.post("/customers", async (req, res) => {
    const { full_name, phone, email, register_date } = req.body || {};
    if (!full_name || !phone || !email) return fail(res, 400, "กรอก full_name, phone, email ให้ครบ");
    try {
        const result = await customerModel.create({
            full_name: String(full_name).trim(),
            phone: String(phone).trim(),
            email: String(email).trim(),
            register_date: register_date || new Date().toISOString().slice(0, 10)
        });
        const created = await customerModel.findById(result.lastID);
        await activityLogModel.create("Customer", `ลูกค้าใหม่: ${created.full_name} (#${created.id})`);
        res.status(201).json({ ok: true, data: created });
    } catch (error) {
        fail(res, 400, parseSqlError(error, "เพิ่มลูกค้าไม่สำเร็จ"), error.message);
    }
});

router.put("/customers/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { full_name, phone, email, register_date } = req.body || {};
    if (!full_name || !phone || !email) return fail(res, 400, "กรอก full_name, phone, email ให้ครบ");
    try {
        const exists = await customerModel.findById(id);
        if (!exists) return fail(res, 404, "ไม่พบลูกค้า");
        await customerModel.updateById(id, {
            full_name: String(full_name).trim(),
            phone: String(phone).trim(),
            email: String(email).trim(),
            register_date: register_date || exists.register_date
        });
        const updated = await customerModel.findById(id);
        res.json({ ok: true, data: updated });
    } catch (error) {
        fail(res, 400, parseSqlError(error, "อัปเดตลูกค้าไม่สำเร็จ"), error.message);
    }
});

router.delete("/customers/:id", async (req, res) => {
    const id = Number(req.params.id);
    try {
        const exists = await customerModel.findById(id);
        if (!exists) return fail(res, 404, "ไม่พบลูกค้า");
        await customerModel.deleteById(id);
        res.json({ ok: true, message: "ลบลูกค้าสำเร็จ" });
    } catch (error) {
        fail(res, 400, parseSqlError(error, "ลบลูกค้าไม่สำเร็จ"), error.message);
    }
});

router.get("/zones", async (req, res) => {
    try {
        const rows = await zoneModel.listWithTableCount();
        res.json({ ok: true, data: rows });
    } catch (error) {
        fail(res, 500, "โหลดข้อมูลโซนไม่สำเร็จ", error.message);
    }
});

router.get("/zones/simple", async (req, res) => {
    try {
        const rows = await zoneModel.listSimple();
        res.json({ ok: true, data: rows });
    } catch (error) {
        fail(res, 500, "โหลดข้อมูลโซนไม่สำเร็จ", error.message);
    }
});

router.get("/zones/:id/tables", async (req, res) => {
    try {
        const zoneId = Number(req.params.id);
        const zone = await zoneModel.findById(zoneId);
        if (!zone) return fail(res, 404, "ไม่พบโซน");
        const rows = await tableModel.inZone(zoneId);
        res.json({ ok: true, data: rows });
    } catch (error) {
        fail(res, 500, "โหลดโต๊ะตามโซนไม่สำเร็จ", error.message);
    }
});

router.get("/zones/:id", async (req, res) => {
    try {
        const row = await zoneModel.findById(Number(req.params.id));
        if (!row) return fail(res, 404, "ไม่พบโซน");
        res.json({ ok: true, data: row });
    } catch (error) {
        fail(res, 500, "โหลดข้อมูลโซนไม่สำเร็จ", error.message);
    }
});

router.post("/zones", async (req, res) => {
    const { zone_name, description, extra_charge } = req.body || {};
    if (!zone_name) return fail(res, 400, "กรุณากรอก zone_name");
    try {
        const result = await zoneModel.create({
            zone_name: String(zone_name).trim(),
            description: String(description || "").trim(),
            extra_charge: Number(extra_charge || 0)
        });
        const created = await zoneModel.findById(result.lastID);
        res.status(201).json({ ok: true, data: created });
    } catch (error) {
        fail(res, 400, parseSqlError(error, "เพิ่มโซนไม่สำเร็จ"), error.message);
    }
});

router.put("/zones/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { zone_name, description, extra_charge } = req.body || {};
    if (!zone_name) return fail(res, 400, "กรุณากรอก zone_name");
    try {
        const exists = await zoneModel.findById(id);
        if (!exists) return fail(res, 404, "ไม่พบโซน");
        await zoneModel.updateById(id, {
            zone_name: String(zone_name).trim(),
            description: String(description || "").trim(),
            extra_charge: Number(extra_charge || 0)
        });
        const updated = await zoneModel.findById(id);
        res.json({ ok: true, data: updated });
    } catch (error) {
        fail(res, 400, parseSqlError(error, "อัปเดตโซนไม่สำเร็จ"), error.message);
    }
});

router.delete("/zones/:id", async (req, res) => {
    const id = Number(req.params.id);
    try {
        const exists = await zoneModel.findById(id);
        if (!exists) return fail(res, 404, "ไม่พบโซน");
        await zoneModel.deleteById(id);
        res.json({ ok: true, message: "ลบโซนสำเร็จ" });
    } catch (error) {
        fail(res, 400, parseSqlError(error, "ลบโซนไม่สำเร็จ"), error.message);
    }
});

router.get("/tables", async (req, res) => {
    try {
        const rows = await tableModel.listWithZone();
        res.json({ ok: true, data: rows });
    } catch (error) {
        fail(res, 500, "โหลดข้อมูลโต๊ะไม่สำเร็จ", error.message);
    }
});

router.get("/tables/for-reservation", async (req, res) => {
    try {
        const rows = await tableModel.listForReservation();
        res.json({ ok: true, data: rows });
    } catch (error) {
        fail(res, 500, "โหลดข้อมูลโต๊ะไม่สำเร็จ", error.message);
    }
});

router.get("/tables/:id/with-zone", async (req, res) => {
    try {
        const row = await tableModel.findByIdWithZone(Number(req.params.id));
        if (!row) return fail(res, 404, "ไม่พบโต๊ะ");
        res.json({ ok: true, data: row });
    } catch (error) {
        fail(res, 500, "โหลดข้อมูลโต๊ะไม่สำเร็จ", error.message);
    }
});

router.get("/tables/:id/reservations", async (req, res) => {
    try {
        const tableId = Number(req.params.id);
        const table = await tableModel.findById(tableId);
        if (!table) return fail(res, 404, "ไม่พบโต๊ะ");
        const rows = await tableModel.reservationsByTable(tableId);
        res.json({ ok: true, data: rows });
    } catch (error) {
        fail(res, 500, "โหลดข้อมูลการจองของโต๊ะไม่สำเร็จ", error.message);
    }
});

router.get("/tables/:id", async (req, res) => {
    try {
        const row = await tableModel.findById(Number(req.params.id));
        if (!row) return fail(res, 404, "ไม่พบโต๊ะ");
        res.json({ ok: true, data: row });
    } catch (error) {
        fail(res, 500, "โหลดข้อมูลโต๊ะไม่สำเร็จ", error.message);
    }
});

router.post("/tables", async (req, res) => {
    const { table_number, seat_count, zone_id, status } = req.body || {};
    if (!table_number || !seat_count || !zone_id) return fail(res, 400, "กรอก table_number, seat_count, zone_id ให้ครบ");
    try {
        const result = await tableModel.create({
            table_number: String(table_number).trim(),
            seat_count: Number(seat_count),
            zone_id: Number(zone_id),
            status: status || "Available"
        });
        const created = await tableModel.findByIdWithZone(result.lastID);
        res.status(201).json({ ok: true, data: created });
    } catch (error) {
        fail(res, 400, parseSqlError(error, "เพิ่มโต๊ะไม่สำเร็จ"), error.message);
    }
});

router.put("/tables/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { table_number, seat_count, zone_id, status } = req.body || {};
    if (!table_number || !seat_count || !zone_id) return fail(res, 400, "กรอก table_number, seat_count, zone_id ให้ครบ");
    try {
        const exists = await tableModel.findById(id);
        if (!exists) return fail(res, 404, "ไม่พบโต๊ะ");
        await tableModel.updateById(id, {
            table_number: String(table_number).trim(),
            seat_count: Number(seat_count),
            zone_id: Number(zone_id),
            status: status || "Available"
        });
        const updated = await tableModel.findByIdWithZone(id);
        res.json({ ok: true, data: updated });
    } catch (error) {
        fail(res, 400, parseSqlError(error, "อัปเดตโต๊ะไม่สำเร็จ"), error.message);
    }
});

router.delete("/tables/:id", async (req, res) => {
    const id = Number(req.params.id);
    try {
        const exists = await tableModel.findById(id);
        if (!exists) return fail(res, 404, "ไม่พบโต๊ะ");
        await tableModel.deleteById(id);
        res.json({ ok: true, message: "ลบโต๊ะสำเร็จ" });
    } catch (error) {
        fail(res, 400, parseSqlError(error, "ลบโต๊ะไม่สำเร็จ"), error.message);
    }
});

router.get("/reservations", async (req, res) => {
    try {
        const rows = await reservationModel.listWithDetails();
        res.json({ ok: true, data: rows });
    } catch (error) {
        fail(res, 500, "โหลดข้อมูลการจองไม่สำเร็จ", error.message);
    }
});

router.get("/reservations/:id", async (req, res) => {
    try {
        const row = await reservationModel.findByIdWithDetails(Number(req.params.id));
        if (!row) return fail(res, 404, "ไม่พบการจอง");
        res.json({ ok: true, data: row });
    } catch (error) {
        fail(res, 500, "โหลดข้อมูลการจองไม่สำเร็จ", error.message);
    }
});

router.post("/reservations", async (req, res) => {
    const { customer_id, table_id, booking_time, status } = req.body || {};
    if (!customer_id || !table_id || !booking_time) return fail(res, 400, "กรอก customer_id, table_id, booking_time ให้ครบ");
    const customerId = Number(customer_id);
    const tableId = Number(table_id);
    const bookingTime = toSqliteDateTime(booking_time);
    const statusValue = status || "Confirmed";
    try {
        const table = await tableModel.findById(tableId);
        if (!table) return fail(res, 404, "ไม่พบโต๊ะ");
        if (table.status === "Maintenance") return fail(res, 400, "โต๊ะนี้อยู่ระหว่างปิดปรับปรุง");

        const overlap = await reservationModel.overlapCount(tableId, bookingTime);
        if (overlap.count > 0) return fail(res, 409, "โต๊ะนี้มีการจองแล้วในช่วงเวลาดังกล่าว");

        const endRow = await reservationModel.calculateEndTime(bookingTime);
        const result = await reservationModel.create({
            customer_id: customerId,
            table_id: tableId,
            booking_time: bookingTime,
            end_time: endRow.end_time,
            status: statusValue
        });
        const created = await reservationModel.findByIdWithDetails(result.lastID);
        await activityLogModel.create("Reservation", `เพิ่มการจอง #${created.id} - ${created.customer_name} @ โต๊ะ ${created.table_number}`);
        res.status(201).json({ ok: true, data: created });
    } catch (error) {
        fail(res, 400, parseSqlError(error, "สร้างการจองไม่สำเร็จ"), error.message);
    }
});

router.put("/reservations/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { customer_id, table_id, booking_time, status } = req.body || {};
    if (!customer_id || !table_id || !booking_time || !status) return fail(res, 400, "กรอก customer_id, table_id, booking_time, status ให้ครบ");
    const customerId = Number(customer_id);
    const tableId = Number(table_id);
    const bookingTime = toSqliteDateTime(booking_time);
    try {
        const exists = await reservationModel.findById(id);
        if (!exists) return fail(res, 404, "ไม่พบการจอง");

        const table = await tableModel.findById(tableId);
        if (!table) return fail(res, 404, "ไม่พบโต๊ะ");
        if (table.status === "Maintenance") return fail(res, 400, "โต๊ะนี้อยู่ระหว่างปิดปรับปรุง");

        const overlap = await reservationModel.overlapCount(tableId, bookingTime, id);
        if (overlap.count > 0) return fail(res, 409, "โต๊ะนี้มีการจองแล้วในช่วงเวลาดังกล่าว");

        const endRow = await reservationModel.calculateEndTime(bookingTime);
        await reservationModel.updateById(id, {
            customer_id: customerId,
            table_id: tableId,
            booking_time: bookingTime,
            end_time: endRow.end_time,
            status
        });
        const updated = await reservationModel.findByIdWithDetails(id);
        await activityLogModel.create("Reservation", `แก้ไขการจอง #${updated.id} - ${updated.customer_name} @ โต๊ะ ${updated.table_number}`);
        res.json({ ok: true, data: updated });
    } catch (error) {
        fail(res, 400, parseSqlError(error, "อัปเดตการจองไม่สำเร็จ"), error.message);
    }
});

router.delete("/reservations/:id", async (req, res) => {
    const id = Number(req.params.id);
    try {
        const exists = await reservationModel.findById(id);
        if (!exists) return fail(res, 404, "ไม่พบการจอง");
        await reservationModel.deleteById(id);
        await activityLogModel.create("Reservation", `ลบการจอง #${id}`);
        res.json({ ok: true, message: "ลบการจองสำเร็จ" });
    } catch (error) {
        fail(res, 400, parseSqlError(error, "ลบการจองไม่สำเร็จ"), error.message);
    }
});

router.get("/reports/daily-table-usage", async (req, res) => {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const status = req.query.status || "All";
    try {
        const rows = await reservationModel.byDate(date, status);
        const summary = {
            total: rows.length,
            confirmed: rows.filter((r) => r.status === "Confirmed").length,
            completed: rows.filter((r) => r.status === "Completed").length,
            cancelled: rows.filter((r) => r.status === "Cancelled").length
        };
        res.json({ ok: true, data: rows, summary });
    } catch (error) {
        fail(res, 500, "โหลดรายงานไม่สำเร็จ", error.message);
    }
});

router.get("/reports/zone-visitors", async (req, res) => {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const zoneId = req.query.zone_id || "All";
    try {
        const rows = await reportModel.zoneVisitorsByDate(date, zoneId);
        const summary = {
            zones: rows.length,
            reservations: rows.reduce((acc, row) => acc + Number(row.reservation_count || 0), 0),
            visitors: rows.reduce((acc, row) => acc + Number(row.estimated_visitors || 0), 0)
        };
        res.json({ ok: true, data: rows, summary });
    } catch (error) {
        fail(res, 500, "โหลดรายงานไม่สำเร็จ", error.message);
    }
});

module.exports = router;
