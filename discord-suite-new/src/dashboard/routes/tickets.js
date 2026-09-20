const express = require("express");
const { requireGuildAccess } = require("../middleware");

module.exports = function ticketRoutes(client, context) {
  const router = express.Router();

  router.post("/save", requireGuildAccess, (req, res) => {
    const guildId = req.body.guildId;
    const current = context.services.tickets.resolveSettings(context.store, guildId);
    const next = {
      ...current,
      enabled: req.body.enabled === "on",
      panelChannelId: req.body.panelChannelId || "",
      categoryId: req.body.categoryId || "",
      transcriptChannelId: req.body.transcriptChannelId || "",
      staffRoleIds: [].concat(req.body.staffRoleIds || []).filter(Boolean),
      panelTitle: req.body.panelTitle || "الدعم",
      panelDescription: req.body.panelDescription || "اضغط الزر لفتح تذكرة.",
      panelColor: req.body.panelColor || "#5865F2",
      panelImage: req.body.panelImage || "",
      buttonLabel: req.body.buttonLabel || "فتح تذكرة",
      buttonEmoji: req.body.buttonEmoji || "🎫",
      buttonStyle: req.body.buttonStyle || "Primary",
      ticketNamePattern: req.body.ticketNamePattern || "ticket-{user}",
      welcomeMessage: req.body.welcomeMessage || "أهلاً {user}",
      closeLabel: req.body.closeLabel || "إغلاق التذكرة",
      closeEmoji: req.body.closeEmoji || "🔒"
    };

    context.store.setGuildSection(guildId, "tickets", next);
    context.audit(guildId, req.session.user, "tickets.save", next);
    res.redirect(`/?guild=${guildId}&tab=tickets`);
  });

  router.post("/publish", requireGuildAccess, async (req, res) => {
    try {
      const guild = client.guilds.cache.get(req.body.guildId);
      await context.services.tickets.publishPanel(guild, context.store);
      context.audit(guild.id, req.session.user, "tickets.publish");
      res.redirect(`/?guild=${guild.id}&tab=tickets`);
    } catch (error) {
      res.status(400).send(error.message);
    }
  });

  return router;
};
