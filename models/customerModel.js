const { run, all, get } = require("./index");

function list() {
    return all("SELECT * FROM Customers ORDER BY id DESC");
}

function create(payload) {
    return run("INSERT INTO Customers (full_name, phone, email, register_date) VALUES (?, ?, ?, ?)", [
        payload.full_name,
        payload.phone,
        payload.email,
        payload.register_date
    ]);
}

function findById(id) {
    return get("SELECT * FROM Customers WHERE id = ?", [id]);
}

function updateById(id, payload) {
    return run("UPDATE Customers SET full_name = ?, phone = ?, email = ?, register_date = ? WHERE id = ?", [
        payload.full_name,
        payload.phone,
        payload.email,
        payload.register_date,
        id
    ]);
}

function deleteById(id) {
    return run("DELETE FROM Customers WHERE id = ?", [id]);
}

function reservationsByCustomer(customerId) {
    return all(
        `SELECT r.id, r.booking_time, r.end_time, r.status, t.table_number, z.zone_name
         FROM Reservations r
         INNER JOIN DiningTables t ON t.id = r.table_id
         INNER JOIN Zones z ON z.id = t.zone_id
         WHERE r.customer_id = ?
         ORDER BY datetime(r.booking_time) DESC`,
        [customerId]
    );
}

function countAll() {
    return get("SELECT COUNT(*) AS count FROM Customers");
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
