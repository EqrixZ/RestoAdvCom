const { request } = require("./apiClient");

function create(activityType, activityText) {
    return request("/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity_type: activityType, activity_text: activityText })
    });
}

function recent(limit = 10) {
    return request(`/activities/recent?limit=${Number(limit) || 10}`);
}

module.exports = {
    create,
    recent
};
