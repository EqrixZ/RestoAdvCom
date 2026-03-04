require("dotenv").config();
const express = require("express");
const { initDb } = require("./models");
const apiRoutes = require("./routes/apiRoutes");

const parsedPort = Number(process.env.BACKEND_PORT || 3005);
if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
    throw new Error("BACKEND_PORT must be a positive integer");
}

const app = express();

app.use(express.json());

const allowedOrigins = (process.env.FRONTEND_ORIGIN || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowAny = allowedOrigins.length === 0;
    const allowed = allowAny || !origin || allowedOrigins.includes(origin);

    if (allowed) {
        res.header("Access-Control-Allow-Origin", allowAny ? "*" : origin || allowedOrigins[0]);
        res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
        res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }
    return next();
});

app.use("/api", apiRoutes);

initDb()
    .then(() => {
        const server = app.listen(parsedPort, "0.0.0.0", () => {
            console.log(`RestoBook Backend API is running at http://localhost:${parsedPort}`);
        });
        server.on("error", (error) => {
            console.error("Backend failed to start:", error);
            process.exit(1);
        });
    })
    .catch((error) => {
        console.error("เริ่มต้นฐานข้อมูลไม่สำเร็จ:", error);
        process.exit(1);
    });
