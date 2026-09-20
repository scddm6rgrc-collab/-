const express = require("express");
const { requireGuildAccess } = require("../middleware");

module.exports = function roleRoutes(client, context) {
  const router = express.Router();

  router.post("/update", requireGuildAccess, async (req, res) => {
    try {
      const guild = client.guilds.cache.get(req.body.guildId);
      await context.services.roles.updateRole(guild, {
        roleId: req.body.roleId,
        name: req.body.name,
        color: req.body.color,
        hoist: req.body.hoist === "on",
        mentionable: req.body.mentionable === "on",
        permissions: [].concat(req.body.permissions || []).filter(Boolean)
      });
      context.audit(guild.id, req.session.user, "role.update", { roleId: req.body.roleId });
      res.redirect(`/?guild=${guild.id}&tab=roles`);
    } catch (error) {
      res.status(400).send(error.message);
    }
  });

  router.post("/clone", requireGuildAccess, async (req, res) => {
    try {
      const guild = client.guilds.cache.get(req.body.guildId);
      const targets = [].concat(req.body.targetRoleIds || []).filter(Boolean);
      await context.services.roles.clonePermissions(guild, req.body.sourceRoleId, targets);
      context.audit(guild.id, req.session.user, "role.clonePermissions", { sourceRoleId: req.body.sourceRoleId, targets });
      res.redirect(`/?guild=${guild.id}&tab=roles`);
    } catch (error) {
      res.status(400).send(error.message);
    }
  });

  return router;
};
