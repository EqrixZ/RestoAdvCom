const customerModel = require("../frontendModels/customerModel");
const tableModel = require("../frontendModels/tableModel");
const reservationModel = require("../frontendModels/reservationModel");
const {
    toSqliteDateTime,
    toDateTimeLocal,
    renderPage,
    handleError,
    parseSqlError,
    redirectWithFlash,
    validateOrRedirect
} = require("./httpHelpers");

async function loadReservationFormData() {
    const [customers, tables] = await Promise.all([
        customerModel.list().then((rows) => rows.map((r) => ({ id: r.id, full_name: r.full_name, phone: r.phone }))),
        tableModel.listForReservation()
    ]);
    return { customers, tables };
}

async function index(req, res) {
    try {
        const reservations = await reservationModel.listWithDetails();
        renderPage(res, {
            title: "การจอง",
            activePage: "reservations",
            content: "reservations/index",
            reservations,
            flashType: req.query.flashType,
            flashMessage: req.query.flashMessage
        });
    } catch (error) {
        handleError(res, error);
    }
}

async function newForm(req, res) {
    try {
        const formData = await loadReservationFormData();
        renderPage(res, { title: "การจองใหม่", activePage: "reservations", content: "reservations/new", reservation: {}, ...formData });
    } catch (error) {
        handleError(res, error);
    }
}

async function create(req, res) {
    if (validateOrRedirect(req, res, "/reservations/new")) return;
    const customerId = Number(req.body.customer_id);
    const tableId = Number(req.body.table_id);
    const bookingTime = toSqliteDateTime(req.body.booking_time);
    const status = req.body.status || "Confirmed";

    try {
        await reservationModel.create({
            customer_id: customerId,
            table_id: tableId,
            booking_time: bookingTime,
            status
        });
        redirectWithFlash(res, "/reservations", "success", "สร้างการจองสำเร็จ");
    } catch (error) {
        redirectWithFlash(res, "/reservations/new", "error", parseSqlError(error, "ไม่สามารถสร้างการจองได้"));
    }
}

async function show(req, res) {
    try {
        const reservation = await reservationModel.findByIdWithDetails(Number(req.params.id));
        if (!reservation) return res.status(404).send("ไม่พบการจอง");
        renderPage(res, { title: "รายละเอียดการจอง", activePage: "reservations", content: "reservations/show", reservation });
    } catch (error) {
        handleError(res, error);
    }
}

async function editForm(req, res) {
    try {
        const [reservation, formData] = await Promise.all([
            reservationModel.findById(Number(req.params.id)),
            loadReservationFormData()
        ]);
        if (!reservation) return res.status(404).send("ไม่พบการจอง");
        reservation.booking_time_local = toDateTimeLocal(reservation.booking_time);
        renderPage(res, { title: "แก้ไขการจอง", activePage: "reservations", content: "reservations/edit", reservation, ...formData });
    } catch (error) {
        handleError(res, error);
    }
}

async function update(req, res) {
    const id = Number(req.params.id);
    if (validateOrRedirect(req, res, `/reservations/${id}/edit`)) return;
    const customerId = Number(req.body.customer_id);
    const tableId = Number(req.body.table_id);
    const bookingTime = toSqliteDateTime(req.body.booking_time);
    const status = req.body.status;

    try {
        await reservationModel.updateById(id, {
            customer_id: customerId,
            table_id: tableId,
            booking_time: bookingTime,
            status
        });
        redirectWithFlash(res, `/reservations/${id}`, "success", "อัปเดตการจองสำเร็จ");
    } catch (error) {
        redirectWithFlash(res, `/reservations/${id}/edit`, "error", parseSqlError(error, "ไม่สามารถอัปเดตการจองได้"));
    }
}

async function remove(req, res) {
    if (validateOrRedirect(req, res, "/reservations")) return;
    try {
        await reservationModel.deleteById(Number(req.params.id));
        redirectWithFlash(res, "/reservations", "success", "ลบการจองสำเร็จ");
    } catch (error) {
        redirectWithFlash(res, "/reservations", "error", parseSqlError(error, "ไม่สามารถลบการจองได้"));
    }
}

module.exports = {
    index,
    newForm,
    create,
    show,
    editForm,
    update,
    remove
};
