const { request } = require("./apiClient");

function zoneVisitorsByDate(date, zoneId = "All") {
    const params = new URLSearchParams({ date, zone_id: zoneId });
    return request(`/reports/zone-visitors?${params.toString()}`);
}

module.exports = {
    zoneVisitorsByDate
};
