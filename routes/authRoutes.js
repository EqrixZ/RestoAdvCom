const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

router.get("/", (req, res) => res.redirect("/login"));
router.get("/login", authController.loginPage);
router.post("/login", authController.login);
router.get("/login/user", (req, res) => res.redirect("/login"));
router.post("/login/user", (req, res) => res.redirect(307, "/login"));
router.get("/login/admin", (req, res) => res.redirect("/login"));
router.post("/login/admin", (req, res) => res.redirect(307, "/login"));
router.post("/logout", authController.logout);

module.exports = router;
