const express = require("express");
const { requireGuildAccess } = require("../middleware");

module.exports = function eventRoutes(client, context) {
  const router = express.Router();

  router.post("/publish", requireGuildAccess, async (req, res) => {
    try {
      const guild = client.guilds.cache.get(req.body.guildId);
      const message = await context.services.eventsPublisher.publish(guild, req.body);
      context.audit(guild.id, req.session.user, "event.publish", { channelId: req.body.channelId, messageId: message.id });
      res.redirect(`/?guild=${guild.id}&tab=events`);
    } catch (error) {
      res.status(400).send(error.message);
    }
  });

  return router;
};
