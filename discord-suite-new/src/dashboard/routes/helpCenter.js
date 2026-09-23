const express =
  require("express");

const {
  ChannelType
} = require("discord.js");

const {
  requireGuildAccess
} = require("../middleware");

module.exports =
function helpCenterRoutes(
  client,
  context
) {
  const router =
    express.Router();

  async function getGuild(
    guildId
  ) {
    const guild =
      client.guilds.cache.get(
        guildId
      );

    if (!guild)
      return null;

    await guild.channels
      .fetch()
      .catch(() => {});

    return guild;
  }

  function channels(guild) {
    return [
      ...guild.channels.cache
        .values()
    ]
      .filter(
        channel =>
          channel.type ===
          ChannelType.GuildText
      )
      .sort(
        (a, b) =>
          a.rawPosition -
          b.rawPosition
      );
  }

  router.get(
    "/:guildId",
    requireGuildAccess,
    async (req, res) => {
      const guild =
        await getGuild(
          req.params.guildId
        );

      if (!guild) {
        return res
          .status(404)
          .send(
            "السيرفر غير موجود"
          );
      }

      const settings =
        context.store.getGuild(
          guild.id
        );

      res.render(
        "helpCenter",
        {
          guild,
          channels:
            channels(guild),
          help:
            settings.helpCenter ||
            {}
        }
      );
    }
  );

  router.post(
    "/:guildId/save",
    requireGuildAccess,
    async (req, res) => {
      const guildId =
        req.params.guildId;

      const old =
        context.store
          .getGuild(guildId)
          .helpCenter ||
        {};

      const next = {
        ...old,

        channelId:
          req.body.channelId ||
          "",

        title:
          String(
            req.body.title ||
            "📚 أوامر السيرفر"
          ).trim(),

        description:
          String(
            req.body.description ||
            "هنا تجد أوامر البوت وطريقة استخدامها."
          ).trim(),

        embedColor:
          req.body.embedColor ||
          "#5865F2"
      };

      // إذا غير الروم، ننشئ رسالة جديدة
      if (
        old.channelId &&
        old.channelId !==
          next.channelId
      ) {
        next.messageId = "";
      }

      context.store
        .setGuildSection(
          guildId,
          "helpCenter",
          next
        );

      context.audit(
        guildId,
        req.session.user,
        "helpCenter.save",
        {
          channelId:
            next.channelId
        }
      );

      res.redirect(
        `/help-center/${guildId}`
      );
    }
  );

  router.post(
    "/:guildId/publish",
    requireGuildAccess,
    async (req, res) => {
      try {
        const guildId =
          req.params.guildId;

        const guild =
          await getGuild(guildId);

        if (!guild)
          return res.sendStatus(404);

        await context.services
          .helpCenter
          .publish(
            guild,
            context
          );

        context.audit(
          guildId,
          req.session.user,
          "helpCenter.publish"
        );

        res.redirect(
          `/help-center/${guildId}`
        );
      } catch (error) {
        console.error(error);

        res
          .status(500)
          .send(
            error.message ||
            "تعذر نشر التعليمات"
          );
      }
    }
  );

  return router;
};
