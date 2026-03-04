const express = require("express");
const reportController = require("../controllers/reportController");

const router = express.Router();

router.get("/reports", reportController.index);
router.get("/reports/daily-table-usage", reportController.dailyTableUsage);
router.get("/reports/zone-visitors", reportController.zoneVisitors);

module.exports = router;
