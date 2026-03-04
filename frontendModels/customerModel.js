const { request } = require("./apiClient");

function list() {
    return request("/customers");
}

async function create(payload) {
    const created = await request("/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    return { lastID: created.id, created };
}

function findById(id) {
    return request(`/customers/${id}`);
}

function updateById(id, payload) {
    return request(`/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
}

function deleteById(id) {
    return request(`/customers/${id}`, { method: "DELETE" });
}

function reservationsByCustomer(customerId) {
    return request(`/customers/${customerId}/reservations`);
}

async function countAll() {
    const stats = await request("/stats/overview");
    return { count: stats.customers };
}

module.exports = {
    list,
    create,
    findById,
    updateById,
    deleteById,
    reservationsByCustomer,
    countAll
};
