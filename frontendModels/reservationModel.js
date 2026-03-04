const { request } = require("./apiClient");

function listWithDetails() {
    return request("/reservations");
}

async function create(payload) {
    const created = await request("/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    return { lastID: created.id, created };
}

function findById(id) {
    return request(`/reservations/${id}`);
}

function findByIdWithDetails(id) {
    return request(`/reservations/${id}`);
}

function updateById(id, payload) {
    return request(`/reservations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
}

function deleteById(id) {
    return request(`/reservations/${id}`, { method: "DELETE" });
}

async function countAll() {
    const stats = await request("/stats/overview");
    return { count: stats.reservations };
}

async function countConfirmed() {
    const stats = await request("/stats/overview");
    return { count: stats.activeReservations };
}

function byDate(date, status = "All") {
    const params = new URLSearchParams({ date, status });
    return request(`/reports/daily-table-usage?${params.toString()}`);
}

module.exports = {
    listWithDetails,
    create,
    findById,
    findByIdWithDetails,
    updateById,
    deleteById,
    countAll,
    countConfirmed,
    byDate
};
