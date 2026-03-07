const { run, all, get } = require("./index");

function listWithDetails() {
    return all(
        `SELECT r.*, c.full_name AS customer_name, t.table_number, z.zone_name
         FROM Reservations r
         INNER JOIN Customers c ON c.id = r.customer_id
         INNER JOIN DiningTables t ON t.id = r.table_id
         INNER JOIN Zones z ON z.id = t.zone_id
         ORDER BY datetime(r.booking_time) DESC`
    );
}

function create(payload) {
    return run("INSERT INTO Reservations (customer_id, table_id, booking_time, end_time, party_size, status) VALUES (?, ?, ?, ?, ?, ?)", [
        payload.customer_id,
        payload.table_id,
        payload.booking_time,
        payload.end_time,
        payload.party_size,
        payload.status
    ]);
}

function findById(id) {
    return get("SELECT * FROM Reservations WHERE id = ?", [id]);
}

function findByIdWithDetails(id) {
    return get(
        `SELECT
            r.*, c.full_name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
            t.table_number, t.seat_count, z.zone_name
         FROM Reservations r
         INNER JOIN Customers c ON c.id = r.customer_id
         INNER JOIN DiningTables t ON t.id = r.table_id
         INNER JOIN Zones z ON z.id = t.zone_id
         WHERE r.id = ?`,
        [id]
    );
}

function updateById(id, payload) {
    return run(
        `UPDATE Reservations
         SET customer_id = ?, table_id = ?, booking_time = ?, end_time = ?, party_size = ?, status = ?
         WHERE id = ?`,
        [payload.customer_id, payload.table_id, payload.booking_time, payload.end_time, payload.party_size, payload.status, id]
    );
}

function deleteById(id) {
    return run("DELETE FROM Reservations WHERE id = ?", [id]);
}

function countAll() {
    return get("SELECT COUNT(*) AS count FROM Reservations");
}

function countConfirmed() {
    return get("SELECT COUNT(*) AS count FROM Reservations WHERE status = 'Confirmed'");
}

function overlapCount(tableId, bookingTime, excludedReservationId = null) {
    if (excludedReservationId) {
        return get(
            `SELECT COUNT(*) AS count
             FROM Reservations
             WHERE table_id = ?
               AND id != ?
               AND status != 'Cancelled'
               AND booking_time < datetime(?, '+2 hours')
               AND end_time > ?`,
            [tableId, excludedReservationId, bookingTime, bookingTime]
        );
    }
    return get(
        `SELECT COUNT(*) AS count
         FROM Reservations
         WHERE table_id = ?
           AND status != 'Cancelled'
           AND booking_time < datetime(?, '+2 hours')
           AND end_time > ?`,
        [tableId, bookingTime, bookingTime]
    );
}

function detailForLog(id) {
    return get(
        `SELECT c.full_name AS customer_name, t.table_number
         FROM Reservations r
         INNER JOIN Customers c ON c.id = r.customer_id
         INNER JOIN DiningTables t ON t.id = r.table_id
         WHERE r.id = ?`,
        [id]
    );
}

function customerAndTableDetail(customerId, tableId) {
    return get(
        `SELECT c.full_name AS customer_name, t.table_number
         FROM Customers c
         INNER JOIN DiningTables t ON t.id = ?
         WHERE c.id = ?`,
        [tableId, customerId]
    );
}

function calculateEndTime(bookingTime) {
    return get("SELECT datetime(?, '+2 hours') AS end_time", [bookingTime]);
}

function byDate(date, status = "All") {
    const params = [date];
    let statusClause = "";
    if (status !== "All") {
        statusClause = "AND r.status = ?";
        params.push(status);
    }
    return all(
        `SELECT
            r.id,
            t.table_number,
            z.zone_name,
            c.full_name AS customer_name,
            r.booking_time,
            r.end_time,
            r.party_size,
            r.status
         FROM Reservations r
         INNER JOIN Customers c ON c.id = r.customer_id
         INNER JOIN DiningTables t ON t.id = r.table_id
         INNER JOIN Zones z ON z.id = t.zone_id
         WHERE date(r.booking_time) = date(?)
         ${statusClause}
         ORDER BY datetime(r.booking_time)`,
        params
    );
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
    overlapCount,
    detailForLog,
    customerAndTableDetail,
    calculateEndTime,
    byDate
};
