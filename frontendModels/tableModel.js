const { request } = require("./apiClient");

function listWithZone() {
    return request("/tables");
}

function listForReservation() {
    return request("/tables/for-reservation");
}

async function create(payload) {
    const created = await request("/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    return { lastID: created.id, created };
}

function findById(id) {
    return request(`/tables/${id}`);
}

function findByIdWithZone(id) {
    return request(`/tables/${id}/with-zone`);
}

function updateById(id, payload) {
    return request(`/tables/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
}

function deleteById(id) {
    return request(`/tables/${id}`, { method: "DELETE" });
}

function inZone(zoneId) {
    return request(`/zones/${zoneId}/tables`);
}

function reservationsByTable(tableId) {
    return request(`/tables/${tableId}/reservations`);
}

async function countAll() {
    const stats = await request("/stats/overview");
    return { count: stats.tables };
}

module.exports = {
    listWithZone,
    listForReservation,
    create,
    findById,
    findByIdWithZone,
    updateById,
    deleteById,
    inZone,
    reservationsByTable,
    countAll
};
