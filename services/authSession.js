const crypto = require("crypto");

const COOKIE_NAME = "restobook_sid";
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const sessions = new Map();

function parseCookies(header) {
    const out = {};
    if (!header) return out;
    const pairs = String(header).split(";");
    for (const pair of pairs) {
        const idx = pair.indexOf("=");
        if (idx <= 0) continue;
        const key = pair.slice(0, idx).trim();
        const val = pair.slice(idx + 1).trim();
        out[key] = decodeURIComponent(val);
    }
    return out;
}

function appendSetCookie(res, value) {
    const current = res.getHeader("Set-Cookie");
    if (!current) {
        res.setHeader("Set-Cookie", value);
        return;
    }
    if (Array.isArray(current)) {
        res.setHeader("Set-Cookie", [...current, value]);
        return;
    }
    res.setHeader("Set-Cookie", [String(current), value]);
}

function setSessionCookie(res, sid, maxAge = SESSION_TTL_SECONDS) {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    const cookie = `${COOKIE_NAME}=${encodeURIComponent(sid)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
    appendSetCookie(res, cookie);
}

function clearSessionCookie(res) {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    appendSetCookie(res, `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

function authSessionMiddleware(req, res, next) {
    const cookies = parseCookies(req.headers.cookie || "");
    const sid = cookies[COOKIE_NAME];
    req.auth = null;

    if (sid && sessions.has(sid)) {
        const session = sessions.get(sid);
        if (session.expiresAt > Date.now()) {
            req.auth = session.data;
        } else {
            sessions.delete(sid);
            clearSessionCookie(res);
        }
    }

    res.locals.auth = req.auth;
    next();
}

function createSession(res, data) {
    const sid = crypto.randomBytes(24).toString("hex");
    sessions.set(sid, {
        data,
        expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000
    });
    setSessionCookie(res, sid, SESSION_TTL_SECONDS);
}

function destroySession(req, res) {
    const cookies = parseCookies(req.headers.cookie || "");
    const sid = cookies[COOKIE_NAME];
    if (sid && sessions.has(sid)) sessions.delete(sid);
    clearSessionCookie(res);
}

module.exports = {
    authSessionMiddleware,
    createSession,
    destroySession
};
