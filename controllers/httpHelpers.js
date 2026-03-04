const { validationResult } = require("express-validator");

function toSqliteDateTime(input) {
    if (!input) return null;
    const normalized = input.trim().replace("T", " ");
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)) return `${normalized}:00`;
    return normalized;
}

function toDateTimeLocal(value) {
    if (!value) return "";
    return String(value).slice(0, 16).replace(" ", "T");
}

function handleError(res, error) {
    console.error(error);
    res.status(500).send("เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์");
}

function parseSqlError(error, fallback) {
    if (!error) return fallback;
    if (error.message.includes("UNIQUE constraint failed")) return "พบข้อมูลซ้ำ กรุณาใช้ค่าที่ไม่ซ้ำ";
    if (error.message.includes("FOREIGN KEY constraint failed")) return "ไม่สามารถลบรายการนี้ได้ เพราะมีข้อมูลอื่นเชื่อมโยงอยู่";
    if (error.message.includes("CHECK constraint failed")) return "ค่าไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่กรอก";
    return fallback;
}

function redirectWithFlash(res, route, type, message) {
    const params = new URLSearchParams({ flashType: type, flashMessage: message });
    res.redirect(`${route}?${params.toString()}`);
}

function renderPage(res, payload) {
    res.render("layout", {
        flashMessage: payload.flashMessage || "",
        flashType: payload.flashType || "success",
        ...payload
    });
}

function validateOrRedirect(req, res, route) {
    const result = validationResult(req);
    if (result.isEmpty()) return false;
    redirectWithFlash(res, route, "error", result.array()[0].msg);
    return true;
}

module.exports = {
    toSqliteDateTime,
    toDateTimeLocal,
    handleError,
    parseSqlError,
    redirectWithFlash,
    renderPage,
    validateOrRedirect
};
