const customerModel = require("../frontendModels/customerModel");
const { renderPage, handleError, parseSqlError, redirectWithFlash, validateOrRedirect } = require("./httpHelpers");

async function index(req, res) {
    try {
        const customers = await customerModel.list();
        renderPage(res, {
            title: "ลูกค้า",
            activePage: "customers",
            content: "customers/index",
            customers,
            flashType: req.query.flashType,
            flashMessage: req.query.flashMessage
        });
    } catch (error) {
        handleError(res, error);
    }
}

function newForm(req, res) {
    renderPage(res, { title: "ลูกค้าใหม่", activePage: "customers", content: "customers/new", customer: {} });
}

async function create(req, res) {
    if (validateOrRedirect(req, res, "/customers/new")) return;
    const { full_name, phone, email, register_date } = req.body;
    try {
        await customerModel.create({
            full_name: full_name.trim(),
            phone: phone.trim(),
            email: email.trim(),
            register_date: register_date || new Date().toISOString().slice(0, 10)
        });
        redirectWithFlash(res, "/customers", "success", "เพิ่มลูกค้าสำเร็จ");
    } catch (error) {
        redirectWithFlash(res, "/customers/new", "error", parseSqlError(error, "ไม่สามารถเพิ่มลูกค้าได้"));
    }
}

async function show(req, res) {
    try {
        const customer = await customerModel.findById(Number(req.params.id));
        if (!customer) return res.status(404).send("ไม่พบลูกค้า");
        const reservations = await customerModel.reservationsByCustomer(customer.id);
        renderPage(res, { title: "รายละเอียดลูกค้า", activePage: "customers", content: "customers/show", customer, reservations });
    } catch (error) {
        handleError(res, error);
    }
}

async function editForm(req, res) {
    try {
        const customer = await customerModel.findById(Number(req.params.id));
        if (!customer) return res.status(404).send("ไม่พบลูกค้า");
        renderPage(res, { title: "แก้ไขลูกค้า", activePage: "customers", content: "customers/edit", customer });
    } catch (error) {
        handleError(res, error);
    }
}

async function update(req, res) {
    const id = Number(req.params.id);
    if (validateOrRedirect(req, res, `/customers/${id}/edit`)) return;
    const { full_name, phone, email, register_date } = req.body;
    try {
        await customerModel.updateById(id, {
            full_name: full_name.trim(),
            phone: phone.trim(),
            email: email.trim(),
            register_date
        });
        redirectWithFlash(res, `/customers/${id}`, "success", "อัปเดตข้อมูลลูกค้าสำเร็จ");
    } catch (error) {
        redirectWithFlash(res, `/customers/${id}/edit`, "error", parseSqlError(error, "ไม่สามารถอัปเดตข้อมูลลูกค้าได้"));
    }
}

async function remove(req, res) {
    if (validateOrRedirect(req, res, "/customers")) return;
    try {
        await customerModel.deleteById(Number(req.params.id));
        redirectWithFlash(res, "/customers", "success", "ลบลูกค้าสำเร็จ");
    } catch (error) {
        redirectWithFlash(res, "/customers", "error", parseSqlError(error, "ไม่สามารถลบลูกค้าได้"));
    }
}

module.exports = {
    index,
    newForm,
    create,
    show,
    editForm,
    update,
    remove
};
