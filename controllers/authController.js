const customerModel = require("../frontendModels/customerModel");
const { createSession, destroySession } = require("../services/authSession");

function renderAuthPage(res, payload) {
    res.render("auth/layout", {
        title: payload.title || "เข้าสู่ระบบ",
        flashMessage: payload.flashMessage || "",
        flashType: payload.flashType || "success",
        content: payload.content,
        next: payload.next || "",
        form: payload.form || {}
    });
}

function resolveNextUrl(req, fallback) {
    const next = req.body.next || req.query.next || "";
    if (!next || String(next).startsWith("http")) return fallback;
    return String(next).startsWith("/") ? String(next) : fallback;
}

function loginPage(req, res) {
    if (req.auth && req.auth.role === "admin") return res.redirect("/home");
    if (req.auth && req.auth.role === "user") return res.redirect("/user/home");
    renderAuthPage(res, { title: "เลือกประเภทผู้ใช้", content: "choice" });
}

function userLoginForm(req, res) {
    if (req.auth && req.auth.role === "user") return res.redirect("/user/home");
    renderAuthPage(res, {
        title: "เข้าสู่ระบบผู้ใช้",
        content: "user-login",
        next: req.query.next || "",
        flashType: req.query.flashType,
        flashMessage: req.query.flashMessage
    });
}

async function userLogin(req, res) {
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").trim();
    const nextUrl = resolveNextUrl(req, "/user/home");
    if (!email || !phone) {
        const params = new URLSearchParams({
            flashType: "error",
            flashMessage: "กรุณากรอกอีเมลและเบอร์โทรให้ครบ",
            next: nextUrl
        });
        return res.redirect(`/login/user?${params.toString()}`);
    }

    try {
        const customers = await customerModel.list();
        const customer = customers.find(
            (row) => String(row.email || "").trim().toLowerCase() === email && String(row.phone || "").trim() === phone
        );

        if (!customer) {
            const params = new URLSearchParams({
                flashType: "error",
                flashMessage: "อีเมลหรือเบอร์โทรไม่ถูกต้อง",
                next: nextUrl
            });
            return res.redirect(`/login/user?${params.toString()}`);
        }

        createSession(res, {
            role: "user",
            customerId: Number(customer.id),
            customerName: customer.full_name
        });
        return res.redirect(nextUrl);
    } catch (error) {
        console.error(error);
        return res.status(500).send("เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์");
    }
}

function adminLoginForm(req, res) {
    if (req.auth && req.auth.role === "admin") return res.redirect("/home");
    renderAuthPage(res, {
        title: "เข้าสู่ระบบผู้ดูแล",
        content: "admin-login",
        next: req.query.next || "",
        flashType: req.query.flashType,
        flashMessage: req.query.flashMessage
    });
}

function adminLogin(req, res) {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");
    const adminUsername = process.env.ADMIN_USERNAME || "admin";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    const nextUrl = resolveNextUrl(req, "/home");

    if (username !== adminUsername || password !== adminPassword) {
        const params = new URLSearchParams({
            flashType: "error",
            flashMessage: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
            next: nextUrl
        });
        return res.redirect(`/login/admin?${params.toString()}`);
    }

    createSession(res, { role: "admin", adminName: username });
    return res.redirect(nextUrl);
}

function logout(req, res) {
    destroySession(req, res);
    return res.redirect("/login");
}

module.exports = {
    loginPage,
    userLoginForm,
    userLogin,
    adminLoginForm,
    adminLogin,
    logout
};
