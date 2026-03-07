const express = require("express");
const { body, param } = require("express-validator");
const userController = require("../controllers/userController");
const { requireUser } = require("../middleware/authGuards");

const router = express.Router();

router.use("/user", requireUser);
router.get("/user", (req, res) => res.redirect("/user/home"));
router.get("/user/home", userController.home);
router.get("/user/reservations/new", userController.newReservationForm);
router.post("/user/reservations", [
    body("table_id").isInt({ min: 1 }).withMessage("กรุณาเลือกโต๊ะ"),
    body("party_size").isInt({ min: 1 }).withMessage("จำนวนลูกค้าต้องเป็นตัวเลขมากกว่า 0"),
    body("booking_time")
        .notEmpty()
        .withMessage("กรุณาเลือกเวลาเริ่มจอง")
        .bail()
        .isISO8601()
        .withMessage("เวลาเริ่มจองไม่ถูกต้อง")
], userController.createReservation);
router.get("/user/reservations", userController.myReservations);
router.put("/user/reservations/:id/cancel", [
    param("id").isInt({ min: 1 }).withMessage("รหัสการจองไม่ถูกต้อง")
], userController.cancelReservation);

module.exports = router;
