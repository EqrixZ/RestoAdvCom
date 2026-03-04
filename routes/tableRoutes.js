const express = require("express");
const { body, param } = require("express-validator");
const tablesController = require("../controllers/tablesController");

const router = express.Router();

router.get("/tables", tablesController.index);
router.get("/tables/new", tablesController.newForm);
router.post("/tables", [
    body("table_number").trim().notEmpty().withMessage("กรุณากรอกหมายเลขโต๊ะ"),
    body("seat_count").isInt({ min: 1 }).withMessage("จำนวนที่นั่งต้องอย่างน้อย 1"),
    body("zone_id").isInt({ min: 1 }).withMessage("กรุณาเลือกโซน"),
    body("status").isIn(["Available", "Maintenance"]).withMessage("สถานะโต๊ะไม่ถูกต้อง")
], tablesController.create);
router.get("/tables/:id", tablesController.show);
router.get("/tables/:id/edit", tablesController.editForm);
router.put("/tables/:id", [
    param("id").isInt({ min: 1 }).withMessage("รหัสโต๊ะไม่ถูกต้อง"),
    body("table_number").trim().notEmpty().withMessage("กรุณากรอกหมายเลขโต๊ะ"),
    body("seat_count").isInt({ min: 1 }).withMessage("จำนวนที่นั่งต้องอย่างน้อย 1"),
    body("zone_id").isInt({ min: 1 }).withMessage("กรุณาเลือกโซน"),
    body("status").isIn(["Available", "Maintenance"]).withMessage("สถานะโต๊ะไม่ถูกต้อง")
], tablesController.update);
router.delete("/tables/:id", [param("id").isInt({ min: 1 }).withMessage("รหัสโต๊ะไม่ถูกต้อง")], tablesController.remove);

module.exports = router;
