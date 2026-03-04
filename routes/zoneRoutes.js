const express = require("express");
const { body, param } = require("express-validator");
const zonesController = require("../controllers/zonesController");

const router = express.Router();

router.get("/zones", zonesController.index);
router.get("/zones/new", zonesController.newForm);
router.post("/zones", [
    body("zone_name").trim().notEmpty().withMessage("กรุณากรอกชื่อโซน"),
    body("description").optional({ values: "falsy" }).trim().isLength({ max: 250 }).withMessage("รายละเอียดยาวเกินกำหนด"),
    body("extra_charge").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("ค่าบริการเพิ่มเติมต้องไม่ติดลบ")
], zonesController.create);
router.get("/zones/:id", zonesController.show);
router.get("/zones/:id/edit", zonesController.editForm);
router.put("/zones/:id", [
    param("id").isInt({ min: 1 }).withMessage("รหัสโซนไม่ถูกต้อง"),
    body("zone_name").trim().notEmpty().withMessage("กรุณากรอกชื่อโซน"),
    body("description").optional({ values: "falsy" }).trim().isLength({ max: 250 }).withMessage("รายละเอียดยาวเกินกำหนด"),
    body("extra_charge").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("ค่าบริการเพิ่มเติมต้องไม่ติดลบ")
], zonesController.update);
router.delete("/zones/:id", [param("id").isInt({ min: 1 }).withMessage("รหัสโซนไม่ถูกต้อง")], zonesController.remove);

module.exports = router;
