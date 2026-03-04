const express = require("express");
const { body, param } = require("express-validator");
const customersController = require("../controllers/customersController");

const router = express.Router();

router.get("/customers", customersController.index);
router.get("/customers/new", customersController.newForm);
router.post("/customers", [
    body("full_name").trim().notEmpty().withMessage("กรุณากรอกชื่อ-นามสกุล"),
    body("phone").trim().isLength({ min: 8, max: 20 }).withMessage("เบอร์โทรต้องยาว 8-20 ตัวอักษร"),
    body("email").trim().isEmail().withMessage("กรุณากรอกอีเมลให้ถูกต้อง"),
    body("register_date").optional({ values: "falsy" }).isISO8601({ strict: true }).withMessage("วันที่ลงทะเบียนไม่ถูกต้อง")
], customersController.create);
router.get("/customers/:id", customersController.show);
router.get("/customers/:id/edit", customersController.editForm);
router.put("/customers/:id", [
    param("id").isInt({ min: 1 }).withMessage("รหัสลูกค้าไม่ถูกต้อง"),
    body("full_name").trim().notEmpty().withMessage("กรุณากรอกชื่อ-นามสกุล"),
    body("phone").trim().isLength({ min: 8, max: 20 }).withMessage("เบอร์โทรต้องยาว 8-20 ตัวอักษร"),
    body("email").trim().isEmail().withMessage("กรุณากรอกอีเมลให้ถูกต้อง"),
    body("register_date").optional({ values: "falsy" }).isISO8601({ strict: true }).withMessage("วันที่ลงทะเบียนไม่ถูกต้อง")
], customersController.update);
router.delete("/customers/:id", [param("id").isInt({ min: 1 }).withMessage("รหัสลูกค้าไม่ถูกต้อง")], customersController.remove);

module.exports = router;
