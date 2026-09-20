const express = require("express");
const { requireGuildAccess } = require("../middleware");

module.exports = function messageRoutes(client, context) {
  const router = express.Router();

  router.get("/recent/:guildId/:channelId", requireGuildAccess, async (req, res) => {
    try {
      const guild = client.guilds.cache.get(req.params.guildId);
      const items = await context.services.messages.recentBotMessages(guild, req.params.channelId, client.user.id);
      res.json(items);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post("/send", requireGuildAccess, async (req, res) => {
    try {
      const guild = client.guilds.cache.get(req.body.guildId);
      const message = await context.services.messages.send(guild, req.body);
      context.audit(guild.id, req.session.user, "message.send", { channelId: req.body.channelId, messageId: message.id });
      res.redirect(`/?guild=${guild.id}&tab=messages`);
    } catch (error) {
      res.status(400).send(error.message);
    }
  });

  router.post("/edit", requireGuildAccess, async (req, res) => {
    try {
      const guild = client.guilds.cache.get(req.body.guildId);
      await context.services.messages.edit(guild, req.body);
      context.audit(guild.id, req.session.user, "message.edit", { channelId: req.body.channelId, messageId: req.body.messageId });
      res.redirect(`/?guild=${guild.id}&tab=messages`);
    } catch (error) {
      res.status(400).send(error.message);
    }
  });

  router.post("/delete", requireGuildAccess, async (req, res) => {
    try {
      const guild = client.guilds.cache.get(req.body.guildId);
      await context.services.messages.remove(guild, req.body.channelId, req.body.messageId);
      context.audit(guild.id, req.session.user, "message.delete", { channelId: req.body.channelId, messageId: req.body.messageId });
      res.redirect(`/?guild=${guild.id}&tab=messages`);
    } catch (error) {
      res.status(400).send(error.message);
    }
  });

  return router;
};
