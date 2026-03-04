const tableModel = require("../models/tableModel");
const zoneModel = require("../models/zoneModel");
const { renderPage, handleError, parseSqlError, redirectWithFlash, validateOrRedirect } = require("./httpHelpers");

async function index(req, res) {
    try {
        const tables = await tableModel.listWithZone();
        renderPage(res, { title: "โต๊ะอาหาร", activePage: "tables", content: "tables/index", tables, flashType: req.query.flashType, flashMessage: req.query.flashMessage });
    } catch (error) {
        handleError(res, error);
    }
}

async function newForm(req, res) {
    try {
        const zones = await zoneModel.listSimple();
        renderPage(res, { title: "โต๊ะใหม่", activePage: "tables", content: "tables/new", table: {}, zones });
    } catch (error) {
        handleError(res, error);
    }
}

async function create(req, res) {
    if (validateOrRedirect(req, res, "/tables/new")) return;
    const { table_number, seat_count, zone_id, status } = req.body;
    try {
        await tableModel.create({
            table_number: table_number.trim(),
            seat_count: Number(seat_count),
            zone_id: Number(zone_id),
            status
        });
        redirectWithFlash(res, "/tables", "success", "เพิ่มโต๊ะอาหารสำเร็จ");
    } catch (error) {
        redirectWithFlash(res, "/tables/new", "error", parseSqlError(error, "ไม่สามารถเพิ่มโต๊ะได้"));
    }
}

async function show(req, res) {
    try {
        const table = await tableModel.findByIdWithZone(Number(req.params.id));
        if (!table) return res.status(404).send("ไม่พบโต๊ะ");
        const reservations = await tableModel.reservationsByTable(table.id);
        renderPage(res, { title: "รายละเอียดโต๊ะ", activePage: "tables", content: "tables/show", table, reservations });
    } catch (error) {
        handleError(res, error);
    }
}

async function editForm(req, res) {
    try {
        const [table, zones] = await Promise.all([
            tableModel.findById(Number(req.params.id)),
            zoneModel.listSimple()
        ]);
        if (!table) return res.status(404).send("ไม่พบโต๊ะ");
        renderPage(res, { title: "แก้ไขโต๊ะ", activePage: "tables", content: "tables/edit", table, zones });
    } catch (error) {
        handleError(res, error);
    }
}

async function update(req, res) {
    const id = Number(req.params.id);
    if (validateOrRedirect(req, res, `/tables/${id}/edit`)) return;
    const { table_number, seat_count, zone_id, status } = req.body;
    try {
        await tableModel.updateById(id, {
            table_number: table_number.trim(),
            seat_count: Number(seat_count),
            zone_id: Number(zone_id),
            status
        });
        redirectWithFlash(res, `/tables/${id}`, "success", "อัปเดตโต๊ะสำเร็จ");
    } catch (error) {
        redirectWithFlash(res, `/tables/${id}/edit`, "error", parseSqlError(error, "ไม่สามารถอัปเดตโต๊ะได้"));
    }
}

async function remove(req, res) {
    if (validateOrRedirect(req, res, "/tables")) return;
    try {
        await tableModel.deleteById(Number(req.params.id));
        redirectWithFlash(res, "/tables", "success", "ลบโต๊ะสำเร็จ");
    } catch (error) {
        redirectWithFlash(res, "/tables", "error", parseSqlError(error, "ไม่สามารถลบโต๊ะได้"));
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


