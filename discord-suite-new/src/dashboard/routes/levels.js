const express = require("express");

module.exports = function levelsRoutes(
  client,
  context
) {
  const router = express.Router();

  function allowed(req, guildId) {
    return (
      req.session.user?.guilds || []
    ).some(g => g.id === guildId);
  }

  router.get("/:guildId", async (req, res) => {
    const { guildId } = req.params;

    if (!allowed(req, guildId)) {
      return res.status(403).send(
        "ليس لديك صلاحية لهذا السيرفر"
      );
    }

    const guild =
      client.guilds.cache.get(guildId);

    if (!guild) {
      return res.status(404).send(
        "السيرفر غير موجود"
      );
    }

    await guild.members.fetch().catch(() => {});

    const members =
      [...guild.members.cache.values()]
        .filter(m => !m.user.bot)
        .sort((a, b) =>
          a.displayName.localeCompare(
            b.displayName
          )
        );

    const top =
      context.services.levels
        .getTop(guildId, 10)
        .map(item => {
          const member =
            guild.members.cache.get(
              item.userId
            );

          return {
            ...item,
            name:
              member?.displayName ||
              item.username ||
              item.userId,
            level:
              context.services.levels
                .levelFromXp(item.xp)
          };
        });

    res.render("levels", {
      guild,
      members,
      top,
      theme:
        context.services.levelCards
          .get(guildId),
      settings:
        context.services.levels
          .getSettings(guildId)
    });
  });


  router.post(
    "/:guildId/theme",
    (req, res) => {

      const { guildId } =
        req.params;

      if (!allowed(req, guildId)) {
        return res.sendStatus(403);
      }

      context.services.levelCards.set(
        guildId,
        {
          backgroundImage:
            req.body.backgroundImage || "",

          progressBarColor:
            req.body.progressBarColor ||
            "#5865f2",

          circleColor:
            req.body.circleColor ||
            "#5865f2",

          textColor:
            req.body.textColor ||
            "#ffffff",

          barTextColor:
            req.body.barTextColor ||
            "#ffffff"
        }
      );

      context.audit(
        guildId,
        req.session.user,
        "levels.theme.update"
      );

      res.redirect(
        `/levels/${guildId}`
      );
    }
  );


  router.post(
    "/:guildId/settings",
    (req, res) => {

      const { guildId } =
        req.params;

      if (!allowed(req, guildId)) {
        return res.sendStatus(403);
      }

      context.services.levels.setSettings(
        guildId,
        {
          enabled:
            req.body.enabled === "on",

          minXp:
            Number(req.body.minXp) || 15,

          maxXp:
            Number(req.body.maxXp) || 25,

          cooldownSeconds:
            Number(
              req.body.cooldownSeconds
            ) || 60
        }
      );

      context.audit(
        guildId,
        req.session.user,
        "levels.settings.update"
      );

      res.redirect(
        `/levels/${guildId}`
      );
    }
  );


  router.post(
    "/:guildId/xp",
    async (req, res) => {

      const { guildId } =
        req.params;

      if (!allowed(req, guildId)) {
        return res.sendStatus(403);
      }

      const guild =
        client.guilds.cache.get(guildId);

      const member =
        await guild.members
          .fetch(req.body.userId)
          .catch(() => null);

      if (!member) {
        return res.status(404).send(
          "العضو غير موجود"
        );
      }

      const amount =
        Number(req.body.amount) || 0;

      if (req.body.action === "add") {
        context.services.levels.adjustXp(
          guildId,
          member.id,
          Math.abs(amount),
          member.user.username
        );
      }

      if (req.body.action === "remove") {
        context.services.levels.adjustXp(
          guildId,
          member.id,
          -Math.abs(amount),
          member.user.username
        );
      }

      if (req.body.action === "set") {
        context.services.levels.setXp(
          guildId,
          member.id,
          amount,
          member.user.username
        );
      }

      if (req.body.action === "reset") {
        context.services.levels.resetXp(
          guildId,
          member.id,
          member.user.username
        );
      }

      context.audit(
        guildId,
        req.session.user,
        "levels.xp.update",
        {
          target:
            member.user.username,
          action:
            req.body.action,
          amount
        }
      );

      res.redirect(
        `/levels/${guildId}`
      );
    }
  );

  return router;
};
