const express = require("express");
const homeController = require("../controllers/homeController");
const { requireAdmin } = require("../middleware/authGuards");

const router = express.Router();

router.get("/home", requireAdmin, homeController.home);

module.exports = router;
