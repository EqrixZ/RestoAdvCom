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
    renderAuthPage(res, {
        title: "เข้าสู่ระบบ",
        content: "login",
        next: req.query.next || "",
        flashType: req.query.flashType,
        flashMessage: req.query.flashMessage
    });
}

async function login(req, res) {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "").trim();
    if (!email || !password) {
        const params = new URLSearchParams({
            flashType: "error",
            flashMessage: "กรุณากรอกอีเมลและรหัสผ่านให้ครบ",
            next: req.body.next || ""
        });
        return res.redirect(`/login?${params.toString()}`);
    }

    const adminEmail = String(process.env.ADMIN_EMAIL || "admin@restobook.com").trim().toLowerCase();
    const adminPassword = String(process.env.ADMIN_PASSWORD || "admin123");

    if (email === adminEmail) {
        const nextUrl = resolveNextUrl(req, "/home");
        if (password !== adminPassword) {
            const params = new URLSearchParams({
                flashType: "error",
                flashMessage: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
                next: nextUrl
            });
            return res.redirect(`/login?${params.toString()}`);
        }

        createSession(res, { role: "admin", adminName: adminEmail });
        return res.redirect(nextUrl);
    }

    const nextUrl = resolveNextUrl(req, "/user/home");
    try {
        const customers = await customerModel.list();
        const customer = customers.find(
            (row) => String(row.email || "").trim().toLowerCase() === email && String(row.phone || "").trim() === password
        );

        if (!customer) {
            const params = new URLSearchParams({
                flashType: "error",
                flashMessage: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
                next: nextUrl
            });
            return res.redirect(`/login?${params.toString()}`);
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

function logout(req, res) {
    destroySession(req, res);
    return res.redirect("/login");
}

module.exports = {
    loginPage,
    login,
    logout
};
