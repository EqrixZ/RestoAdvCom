const { request } = require("./apiClient");

function listWithTableCount() {
    return request("/zones");
}

function listSimple() {
    return request("/zones/simple");
}

async function create(payload) {
    const created = await request("/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    return { lastID: created.id, created };
}

function findById(id) {
    return request(`/zones/${id}`);
}

function updateById(id, payload) {
    return request(`/zones/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
}

function deleteById(id) {
    return request(`/zones/${id}`, { method: "DELETE" });
}

async function countAll() {
    const stats = await request("/stats/overview");
    return { count: stats.zones };
}

module.exports = {
    listWithTableCount,
    listSimple,
    create,
    findById,
    updateById,
    deleteById,
    countAll
};
