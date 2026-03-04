const zoneModel = require("../frontendModels/zoneModel");
const tableModel = require("../frontendModels/tableModel");
const { renderPage, handleError, parseSqlError, redirectWithFlash, validateOrRedirect } = require("./httpHelpers");

async function index(req, res) {
    try {
        const zones = await zoneModel.listWithTableCount();
        renderPage(res, { title: "โซน", activePage: "zones", content: "zones/index", zones, flashType: req.query.flashType, flashMessage: req.query.flashMessage });
    } catch (error) {
        handleError(res, error);
    }
}

function newForm(req, res) {
    renderPage(res, { title: "โซนใหม่", activePage: "zones", content: "zones/new", zone: {} });
}

async function create(req, res) {
    if (validateOrRedirect(req, res, "/zones/new")) return;
    const { zone_name, description, extra_charge } = req.body;
    try {
        await zoneModel.create({
            zone_name: zone_name.trim(),
            description: (description || "").trim(),
            extra_charge: Number(extra_charge || 0)
        });
        redirectWithFlash(res, "/zones", "success", "เพิ่มโซนสำเร็จ");
    } catch (error) {
        redirectWithFlash(res, "/zones/new", "error", parseSqlError(error, "ไม่สามารถเพิ่มโซนได้"));
    }
}

async function show(req, res) {
    try {
        const zone = await zoneModel.findById(Number(req.params.id));
        if (!zone) return res.status(404).send("ไม่พบโซน");
        const tables = await tableModel.inZone(zone.id);
        renderPage(res, { title: "รายละเอียดโซน", activePage: "zones", content: "zones/show", zone, tables });
    } catch (error) {
        handleError(res, error);
    }
}

async function editForm(req, res) {
    try {
        const zone = await zoneModel.findById(Number(req.params.id));
        if (!zone) return res.status(404).send("ไม่พบโซน");
        renderPage(res, { title: "แก้ไขโซน", activePage: "zones", content: "zones/edit", zone });
    } catch (error) {
        handleError(res, error);
    }
}

async function update(req, res) {
    const id = Number(req.params.id);
    if (validateOrRedirect(req, res, `/zones/${id}/edit`)) return;
    const { zone_name, description, extra_charge } = req.body;
    try {
        await zoneModel.updateById(id, {
            zone_name: zone_name.trim(),
            description: (description || "").trim(),
            extra_charge: Number(extra_charge || 0)
        });
        redirectWithFlash(res, `/zones/${id}`, "success", "อัปเดตโซนสำเร็จ");
    } catch (error) {
        redirectWithFlash(res, `/zones/${id}/edit`, "error", parseSqlError(error, "ไม่สามารถอัปเดตโซนได้"));
    }
}

async function remove(req, res) {
    if (validateOrRedirect(req, res, "/zones")) return;
    try {
        await zoneModel.deleteById(Number(req.params.id));
        redirectWithFlash(res, "/zones", "success", "ลบโซนสำเร็จ");
    } catch (error) {
        redirectWithFlash(res, "/zones", "error", parseSqlError(error, "ไม่สามารถลบโซนได้"));
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



