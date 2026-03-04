const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

router.get("/", (req, res) => res.redirect("/login"));
router.get("/login", authController.loginPage);
router.get("/login/user", authController.userLoginForm);
router.post("/login/user", authController.userLogin);
router.get("/login/admin", authController.adminLoginForm);
router.post("/login/admin", authController.adminLogin);
router.post("/logout", authController.logout);

module.exports = router;
