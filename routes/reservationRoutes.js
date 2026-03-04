const express = require("express");
const { body, param } = require("express-validator");
const reservationsController = require("../controllers/reservationsController");

const router = express.Router();

router.get("/reservations", reservationsController.index);
router.get("/reservations/new", reservationsController.newForm);
router.post("/reservations", [
    body("customer_id").isInt({ min: 1 }).withMessage("กรุณาเลือกลูกค้า"),
    body("table_id").isInt({ min: 1 }).withMessage("กรุณาเลือกโต๊ะ"),
    body("booking_time").notEmpty().withMessage("กรุณาเลือกเวลาเริ่มจอง").bail().isISO8601().withMessage("เวลาเริ่มจองไม่ถูกต้อง"),
    body("status").optional().isIn(["Confirmed", "Completed", "Cancelled"]).withMessage("สถานะไม่ถูกต้อง")
], reservationsController.create);
router.get("/reservations/:id", reservationsController.show);
router.get("/reservations/:id/edit", reservationsController.editForm);
router.put("/reservations/:id", [
    param("id").isInt({ min: 1 }).withMessage("รหัสการจองไม่ถูกต้อง"),
    body("customer_id").isInt({ min: 1 }).withMessage("กรุณาเลือกลูกค้า"),
    body("table_id").isInt({ min: 1 }).withMessage("กรุณาเลือกโต๊ะ"),
    body("booking_time").notEmpty().withMessage("กรุณาเลือกเวลาเริ่มจอง").bail().isISO8601().withMessage("เวลาเริ่มจองไม่ถูกต้อง"),
    body("status").isIn(["Confirmed", "Completed", "Cancelled"]).withMessage("สถานะไม่ถูกต้อง")
], reservationsController.update);
router.delete("/reservations/:id", [param("id").isInt({ min: 1 }).withMessage("รหัสการจองไม่ถูกต้อง")], reservationsController.remove);

module.exports = router;
