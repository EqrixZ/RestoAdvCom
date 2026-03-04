const { run, all, get } = require("./index");

function listWithTableCount() {
    return all(
        `SELECT z.*, COUNT(t.id) AS table_count
         FROM Zones z
         LEFT JOIN DiningTables t ON t.zone_id = z.id
         GROUP BY z.id
         ORDER BY z.id DESC`
    );
}

function listSimple() {
    return all("SELECT id, zone_name FROM Zones ORDER BY zone_name");
}

function create(payload) {
    return run("INSERT INTO Zones (zone_name, description, extra_charge) VALUES (?, ?, ?)", [
        payload.zone_name,
        payload.description,
        payload.extra_charge
    ]);
}

function findById(id) {
    return get("SELECT * FROM Zones WHERE id = ?", [id]);
}

function updateById(id, payload) {
    return run("UPDATE Zones SET zone_name = ?, description = ?, extra_charge = ? WHERE id = ?", [
        payload.zone_name,
        payload.description,
        payload.extra_charge,
        id
    ]);
}

function deleteById(id) {
    return run("DELETE FROM Zones WHERE id = ?", [id]);
}

function countAll() {
    return get("SELECT COUNT(*) AS count FROM Zones");
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
