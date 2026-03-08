const { run } = require("./index");

async function create(activityType, activityText) {
    return run(
        "INSERT INTO ActivityLogs (activity_type, activity_text, activity_time) VALUES (?, ?, NOW())",
        [activityType, activityText]
    );
}

async function recent(limit = 10) {
    const { all } = require("./index");
    return all("SELECT activity_type, activity_text, activity_time FROM ActivityLogs ORDER BY activity_time DESC LIMIT ?", [limit]);
}

module.exports = {
    create,
    recent
};
