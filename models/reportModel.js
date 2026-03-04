const { all } = require("./index");

function zoneVisitorsByDate(date, zoneId = "All") {
    const params = [date];
    let zoneClause = "";
    if (zoneId !== "All") {
        zoneClause = "AND z.id = ?";
        params.push(Number(zoneId));
    }
    return all(
        `SELECT
            z.id,
            z.zone_name,
            COUNT(r.id) AS reservation_count,
            IFNULL(SUM(t.seat_count), 0) AS estimated_visitors,
            SUM(CASE WHEN r.status = 'Confirmed' THEN 1 ELSE 0 END) AS confirmed_count,
            SUM(CASE WHEN r.status = 'Completed' THEN 1 ELSE 0 END) AS completed_count,
            SUM(CASE WHEN r.status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled_count
         FROM Zones z
         LEFT JOIN DiningTables t ON t.zone_id = z.id
         LEFT JOIN Reservations r ON r.table_id = t.id AND date(r.booking_time) = date(?)
         WHERE 1=1 ${zoneClause}
         GROUP BY z.id
         ORDER BY z.zone_name`,
        params
    );
}

module.exports = {
    zoneVisitorsByDate
};
