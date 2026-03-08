const { all } = require("./index");

function zoneVisitorsByDate(date, zoneId = "All") {
    const params = [date];
    let zoneClause = "";
    if (zoneId !== "All") {
        zoneClause = "AND z.id = ?";
        params.push(Number(zoneId));
    }
    return all(
        `WITH bookings AS (
            SELECT
                z.id AS zone_id,
                z.zone_name,
                r.party_size,
                TIME_FORMAT(r.booking_time, '%H:%i') AS slot_sort,
                CONCAT(TIME_FORMAT(r.booking_time, '%H:%i'), ' - ', TIME_FORMAT(r.end_time, '%H:%i')) AS time_slot
            FROM Reservations r
            INNER JOIN DiningTables t ON t.id = r.table_id
            INNER JOIN Zones z ON z.id = t.zone_id
            WHERE DATE(r.booking_time) = DATE(?)
              AND r.status != 'Cancelled'
              ${zoneClause}
        )
        SELECT
            zone_id AS id,
            zone_name,
            time_slot,
            COUNT(*) AS reservation_count,
            IFNULL(SUM(party_size), 0) AS estimated_visitors
        FROM bookings
        GROUP BY zone_id, zone_name, time_slot, slot_sort
        HAVING COUNT(*) > 0
        ORDER BY zone_name, slot_sort`,
        params
    );
}

module.exports = {
    zoneVisitorsByDate
};
