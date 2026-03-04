require("dotenv").config();
const express = require("express");
const path = require("path");
const authRoutes = require("./routes/authRoutes");
const homeRoutes = require("./routes/homeRoutes");
const customerRoutes = require("./routes/customerRoutes");
const zoneRoutes = require("./routes/zoneRoutes");
const tableRoutes = require("./routes/tableRoutes");
const reservationRoutes = require("./routes/reservationRoutes");
const reportRoutes = require("./routes/reportRoutes");
const userRoutes = require("./routes/userRoutes");
const { authSessionMiddleware } = require("./services/authSession");
const { requireAdmin } = require("./middleware/authGuards");

const parsedPort = Number(process.env.FRONTEND_PORT || process.env.PORT || 3000);
if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
    throw new Error("FRONTEND_PORT (or PORT) must be a positive integer");
}

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(authSessionMiddleware);

app.use((req, res, next) => {
    if (req.method === "POST" && req.body && req.body._method) {
        req.method = String(req.body._method).toUpperCase();
    }
    next();
});

app.use((req, res, next) => {
    res.locals.flashMessage = "";
    res.locals.flashType = "success";
    res.locals.title = "เรสโตบุ๊ก";
    res.locals.activePage = "";
    next();
});

app.use(authRoutes);
app.use(userRoutes);
app.use(homeRoutes);
app.use(requireAdmin, customerRoutes);
app.use(requireAdmin, zoneRoutes);
app.use(requireAdmin, tableRoutes);
app.use(requireAdmin, reservationRoutes);
app.use(requireAdmin, reportRoutes);

const server = app.listen(parsedPort, "0.0.0.0", () => {
    console.log(`RestoBook Frontend is running at http://localhost:${parsedPort}`);
});

server.on("error", (error) => {
    console.error("Frontend failed to start:", error);
    process.exit(1);
});
