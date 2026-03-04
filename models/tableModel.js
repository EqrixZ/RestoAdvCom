const { run, all, get } = require("./index");

function listWithZone() {
    return all(
        `SELECT t.*, z.zone_name
         FROM DiningTables t
         INNER JOIN Zones z ON z.id = t.zone_id
         ORDER BY t.id DESC`
    );
}

function listForReservation() {
    return all(
        `SELECT t.id, t.table_number, t.seat_count, t.status, z.zone_name
         FROM DiningTables t
         INNER JOIN Zones z ON z.id = t.zone_id
         ORDER BY t.table_number`
    );
}

function create(payload) {
    return run("INSERT INTO DiningTables (table_number, seat_count, zone_id, status) VALUES (?, ?, ?, ?)", [
        payload.table_number,
        payload.seat_count,
        payload.zone_id,
        payload.status
    ]);
}

function findById(id) {
    return get("SELECT * FROM DiningTables WHERE id = ?", [id]);
}

function findByIdWithZone(id) {
    return get(
        `SELECT t.*, z.zone_name
         FROM DiningTables t
         INNER JOIN Zones z ON z.id = t.zone_id
         WHERE t.id = ?`,
        [id]
    );
}

function updateById(id, payload) {
    return run("UPDATE DiningTables SET table_number = ?, seat_count = ?, zone_id = ?, status = ? WHERE id = ?", [
        payload.table_number,
        payload.seat_count,
        payload.zone_id,
        payload.status,
        id
    ]);
}

function deleteById(id) {
    return run("DELETE FROM DiningTables WHERE id = ?", [id]);
}

function inZone(zoneId) {
    return all("SELECT id, table_number, seat_count, status FROM DiningTables WHERE zone_id = ? ORDER BY table_number", [zoneId]);
}

function reservationsByTable(tableId) {
    return all(
        `SELECT r.id, r.booking_time, r.end_time, r.status, c.full_name
         FROM Reservations r
         INNER JOIN Customers c ON c.id = r.customer_id
         WHERE r.table_id = ?
         ORDER BY datetime(r.booking_time) DESC`,
        [tableId]
    );
}

function countAll() {
    return get("SELECT COUNT(*) AS count FROM DiningTables");
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
