function withNextUrl(req) {
    const nextUrl = encodeURIComponent(req.originalUrl || "/");
    return `next=${nextUrl}`;
}

function requireAdmin(req, res, next) {
    if (req.auth && req.auth.role === "admin") return next();
    return res.redirect(`/login?${withNextUrl(req)}`);
}

function requireUser(req, res, next) {
    if (req.auth && req.auth.role === "user") return next();
    return res.redirect(`/login?${withNextUrl(req)}`);
}

module.exports = {
    requireAdmin,
    requireUser
};
