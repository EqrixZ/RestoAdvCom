const tableModel = require("../frontendModels/tableModel");
const reservationModel = require("../frontendModels/reservationModel");
const { parseSqlError, redirectWithFlash, validateOrRedirect } = require("./httpHelpers");

const SLOT_START_HOUR = 10;
const SLOT_END_HOUR = 22;
const SLOT_DURATION_HOURS = 2;

function todayLocalDate() {
    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function toDateTimeParts(date, hour) {
    return {
        start: new Date(`${date}T${String(hour).padStart(2, "0")}:00:00`),
        end: new Date(`${date}T${String(hour + SLOT_DURATION_HOURS).padStart(2, "0")}:00:00`)
    };
}

function overlaps(startA, endA, startB, endB) {
    return startA < endB && endA > startB;
}

function parseSqlDateTime(value) {
    return new Date(String(value).replace(" ", "T"));
}

function renderUserPage(req, res, payload) {
    res.render("user/layout", {
        title: payload.title || "RestoBook",
        activePage: payload.activePage || "",
        flashMessage: payload.flashMessage || "",
        flashType: payload.flashType || "success",
        auth: req.auth,
        ...payload
    });
}

async function home(req, res) {
    const date = req.query.date || todayLocalDate();
    const requestedPartySize = Number.parseInt(req.query.party_size, 10);
    const time = String(req.query.time || "18:00");
    const hasSearched = Object.prototype.hasOwnProperty.call(req.query, "date")
        || Object.prototype.hasOwnProperty.call(req.query, "time")
        || Object.prototype.hasOwnProperty.call(req.query, "party_size");
    try {
        const [tables, reservations] = await Promise.all([
            tableModel.listForReservation(),
            reservationModel.listWithDetails()
        ]);

        const usableTables = tables.filter((table) => table.status === "Available");
        const maxPartySize = Math.max(...usableTables.map((table) => Number(table.seat_count) || 0), 1);
        const partySize = Number.isInteger(requestedPartySize) && requestedPartySize > 0
            ? Math.min(requestedPartySize, maxPartySize)
            : 2;
        const candidateTables = usableTables.filter((table) => Number(table.seat_count) >= partySize);
        const activeReservations = reservations.filter((row) => row.status !== "Cancelled");
        const timeParts = time.split(":");
        const hour = Number.parseInt(timeParts[0], 10);
        const minute = Number.parseInt(timeParts[1] || "0", 10);
        const isValidTime = Number.isInteger(hour) && Number.isInteger(minute)
            && hour >= SLOT_START_HOUR
            && hour <= SLOT_END_HOUR - SLOT_DURATION_HOURS
            && minute >= 0
            && minute < 60;
        const safeHour = isValidTime ? hour : 18;
        const safeMinute = isValidTime ? minute : 0;
        const selectedStart = new Date(`${date}T${String(safeHour).padStart(2, "0")}:${String(safeMinute).padStart(2, "0")}:00`);
        const selectedEnd = new Date(selectedStart);
        selectedEnd.setHours(selectedEnd.getHours() + SLOT_DURATION_HOURS);
        const availableTables = candidateTables
            .filter((table) => {
                const isTaken = activeReservations.some((booking) => {
                    if (Number(booking.table_id) !== Number(table.id)) return false;
                    const bookingStart = parseSqlDateTime(booking.booking_time);
                    const bookingEnd = parseSqlDateTime(booking.end_time);
                    return overlaps(bookingStart, bookingEnd, selectedStart, selectedEnd);
                });
                return !isTaken;
            })
            .sort((a, b) => Number(a.seat_count) - Number(b.seat_count));
        const selectedTime = `${String(safeHour).padStart(2, "0")}:${String(safeMinute).padStart(2, "0")}`;
        const selectedWindow = `${selectedTime} - ${String(selectedEnd.getHours()).padStart(2, "0")}:${String(selectedEnd.getMinutes()).padStart(2, "0")}`;

        renderUserPage(req, res, {
            title: "หน้าผู้ใช้งาน",
            activePage: "user-home",
            content: "home",
            date,
            time: selectedTime,
            selectedWindow,
            partySize,
            maxPartySize,
            availableTables,
            tableCount: candidateTables.length,
            hasSearched,
            flashType: req.query.flashType,
            flashMessage: req.query.flashMessage
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์");
    }
}

async function newReservationForm(req, res) {
    try {
        const tables = await tableModel.listForReservation();
        const availableTables = tables.filter((table) => table.status === "Available");
        const tableId = Number.parseInt(req.query.table_id, 10);
        const date = String(req.query.date || "").trim();
        const time = String(req.query.time || "").trim();
        const partySize = Number.parseInt(req.query.party_size, 10);
        const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
        const validTime = /^\d{2}:\d{2}$/.test(time);
        const selectedTable = availableTables.find((table) => Number(table.id) === tableId);

        renderUserPage(req, res, {
            title: "จองโต๊ะ",
            activePage: "user-book",
            content: "new-reservation",
            tables: availableTables,
            reservation: {
                table_id: selectedTable ? selectedTable.id : "",
                booking_time: validDate && validTime ? `${date}T${time}` : "",
                party_size: Number.isInteger(partySize) && partySize > 0 ? partySize : 2
            },
            flashType: req.query.flashType,
            flashMessage: req.query.flashMessage
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์");
    }
}

async function createReservation(req, res) {
    if (validateOrRedirect(req, res, "/user/reservations/new")) return;
    const customerId = Number(req.auth.customerId);
    const tableId = Number(req.body.table_id);
    const bookingTime = req.body.booking_time;
    const partySize = Number(req.body.party_size);

    try {
        const tables = await tableModel.listForReservation();
        const selectedTable = tables.find((table) => Number(table.id) === tableId);
        if (!selectedTable || selectedTable.status !== "Available") {
            redirectWithFlash(res, "/user/reservations/new", "error", "โต๊ะที่เลือกไม่พร้อมให้จอง");
            return;
        }
        if (!Number.isInteger(partySize) || partySize <= 0) {
            redirectWithFlash(res, "/user/reservations/new", "error", "จำนวนลูกค้าไม่ถูกต้อง");
            return;
        }
        if (partySize > Number(selectedTable.seat_count)) {
            redirectWithFlash(res, "/user/reservations/new", "error", "จำนวนลูกค้าเกินจำนวนที่นั่งของโต๊ะ");
            return;
        }

        await reservationModel.create({
            customer_id: customerId,
            table_id: tableId,
            booking_time: bookingTime,
            party_size: partySize,
            status: "Confirmed"
        });
        redirectWithFlash(res, "/user/reservations", "success", "จองโต๊ะสำเร็จ");
    } catch (error) {
        redirectWithFlash(
            res,
            "/user/reservations/new",
            "error",
            parseSqlError(error, "ไม่สามารถจองโต๊ะได้")
        );
    }
}

async function myReservations(req, res) {
    const customerId = Number(req.auth.customerId);
    try {
        const allReservations = await reservationModel.listWithDetails();
        const reservations = allReservations.filter((row) => Number(row.customer_id) === customerId);

        renderUserPage(req, res, {
            title: "การจองของฉัน",
            activePage: "user-my-reservations",
            content: "my-reservations",
            reservations,
            flashType: req.query.flashType,
            flashMessage: req.query.flashMessage
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์");
    }
}

async function cancelReservation(req, res) {
    const id = Number(req.params.id);
    const customerId = Number(req.auth.customerId);
    if (validateOrRedirect(req, res, "/user/reservations")) return;

    try {
        const reservation = await reservationModel.findByIdWithDetails(id);
        if (!reservation || Number(reservation.customer_id) !== customerId) {
            redirectWithFlash(res, "/user/reservations", "error", "ไม่พบการจองที่ต้องการยกเลิก");
            return;
        }

        if (reservation.status === "Cancelled") {
            redirectWithFlash(res, "/user/reservations", "error", "รายการนี้ถูกยกเลิกไปแล้ว");
            return;
        }

        await reservationModel.updateById(id, {
            customer_id: reservation.customer_id,
            table_id: reservation.table_id,
            booking_time: reservation.booking_time,
            party_size: reservation.party_size || 1,
            status: "Cancelled"
        });

        redirectWithFlash(res, "/user/reservations", "success", "ยกเลิกการจองสำเร็จ");
    } catch (error) {
        redirectWithFlash(
            res,
            "/user/reservations",
            "error",
            parseSqlError(error, "ไม่สามารถยกเลิกการจองได้")
        );
    }
}

module.exports = {
    home,
    newReservationForm,
    createReservation,
    myReservations,
    cancelReservation
};
