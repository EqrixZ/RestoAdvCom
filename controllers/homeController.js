const customerModel = require("../frontendModels/customerModel");
const zoneModel = require("../frontendModels/zoneModel");
const tableModel = require("../frontendModels/tableModel");
const reservationModel = require("../frontendModels/reservationModel");
const activityLogModel = require("../frontendModels/activityLogModel");
const { renderPage, handleError } = require("./httpHelpers");

async function home(req, res) {
    try {
        const [customerCount, zoneCount, tableCount, reservationCount, activeReservations, recentActivities] = await Promise.all([
            customerModel.countAll(),
            zoneModel.countAll(),
            tableModel.countAll(),
            reservationModel.countAll(),
            reservationModel.countConfirmed(),
            activityLogModel.recent(10)
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
}

module.exports = {
    home
};



