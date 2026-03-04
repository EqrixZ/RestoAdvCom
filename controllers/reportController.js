const reservationModel = require("../frontendModels/reservationModel");
const zoneModel = require("../frontendModels/zoneModel");
const reportModel = require("../frontendModels/reportModel");
const { renderPage, handleError } = require("./httpHelpers");

function index(req, res) {
    res.redirect("/reports/daily-table-usage");
}

async function dailyTableUsage(req, res) {
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
        renderPage(res, { title: "การใช้งานโต๊ะรายวัน", activePage: "reports", content: "reports/daily-usage", rows, date, status, summary });
    } catch (error) {
        handleError(res, error);
    }
}

async function zoneVisitors(req, res) {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const zoneId = req.query.zone_id || "All";
    try {
        const zones = await zoneModel.listSimple();
        const rows = await reportModel.zoneVisitorsByDate(date, zoneId);
        const summary = {
            zones: rows.length,
            reservations: rows.reduce((acc, row) => acc + Number(row.reservation_count || 0), 0),
            visitors: rows.reduce((acc, row) => acc + Number(row.estimated_visitors || 0), 0)
        };
        renderPage(res, { title: "สรุปผู้ใช้บริการตามโซน", activePage: "reports", content: "reports/zone-visitors", rows, zones, date, zoneId, summary });
    } catch (error) {
        handleError(res, error);
    }
}

module.exports = {
    index,
    dailyTableUsage,
    zoneVisitors
};



