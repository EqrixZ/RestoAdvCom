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

function buildSlots(date) {
    const slots = [];
    for (let hour = SLOT_START_HOUR; hour <= SLOT_END_HOUR - SLOT_DURATION_HOURS; hour += 1) {
        const period = toDateTimeParts(date, hour);
        slots.push({
            label: `${String(hour).padStart(2, "0")}:00 - ${String(hour + SLOT_DURATION_HOURS).padStart(2, "0")}:00`,
            start: period.start,
            end: period.end
        });
    }
    return slots;
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
    try {
        const [tables, reservations] = await Promise.all([
            tableModel.listForReservation(),
            reservationModel.listWithDetails()
        ]);

        const slots = buildSlots(date);
        const usableTables = tables.filter((table) => table.status === "Available");
        const activeReservations = reservations.filter((row) => row.status !== "Cancelled");
        const availabilityBySlot = slots.map((slot) => {
            const availableTables = usableTables.filter((table) => {
                const isTaken = activeReservations.some((booking) => {
                    if (Number(booking.table_id) !== Number(table.id)) return false;
                    const bookingStart = parseSqlDateTime(booking.booking_time);
                    const bookingEnd = parseSqlDateTime(booking.end_time);
                    return overlaps(bookingStart, bookingEnd, slot.start, slot.end);
                });
                return !isTaken;
            });
            return {
                label: slot.label,
                availableTables
            };
        });

        renderUserPage(req, res, {
            title: "หน้าผู้ใช้งาน",
            activePage: "user-home",
            content: "home",
            date,
            availabilityBySlot,
            tableCount: usableTables.length,
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
        renderUserPage(req, res, {
            title: "จองโต๊ะ",
            activePage: "user-book",
            content: "new-reservation",
            tables: tables.filter((table) => table.status === "Available"),
            reservation: {
                booking_time: ""
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

    try {
        await reservationModel.create({
            customer_id: customerId,
            table_id: tableId,
            booking_time: bookingTime,
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
