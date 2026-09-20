const express = require("express");
const session = require("express-session");
const path = require("path");
const authRouter = require("./auth");
const { requireAuth } = require("./middleware");

module.exports = function startDashboard(client, context) {
  const app = express();
  const { config } = context;

  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "public")));

  app.use(session({
    secret: config.web.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24, sameSite: "lax" }
  }));

  app.use("/auth", authRouter(client, config));

  app.get("/login", (req, res) => {
    if (req.session.user) return res.redirect("/");
    res.render("login", { brand: context.constants.BRAND });
  });

  app.get("/", requireAuth, (req, res) => {
    res.render("dashboard", {
      user: req.session.user,
      guilds: req.session.user.guilds,
      brand: context.constants.BRAND,
      emoji: context.constants.EMOJI
    });
  });

  app.use("/api/guild", requireAuth, require("./routes/guild")(client, context));
  app.use("/tickets", requireAuth, require("./routes/tickets")(client, context));
  app.use("/messages", requireAuth, require("./routes/messages")(client, context));
  app.use("/roles", requireAuth, require("./routes/roles")(client, context));
  app.use("/events", requireAuth, require("./routes/events")(client, context));
  app.use("/guide", requireAuth, require("./routes/guide")(client, context));

  app.listen(config.web.port, "0.0.0.0", () => {
    console.log(`🌐 Dashboard: port ${config.web.port}`);
  });
};
