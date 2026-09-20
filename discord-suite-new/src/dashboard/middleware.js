const { userCanAccessGuild } = require("../core/access");

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

function requireGuildAccess(req, res, next) {
  const guildId = req.params.guildId || req.body.guildId;
  if (!guildId || !userCanAccessGuild(req, guildId)) {
    return res.status(403).json({ error: "ليس لديك صلاحية لهذا السيرفر" });
  }
  next();
}

module.exports = { requireAuth, requireGuildAccess };
