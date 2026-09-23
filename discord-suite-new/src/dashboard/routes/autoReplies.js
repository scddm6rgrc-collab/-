const express =
  require("express");

const {
  ChannelType
} = require("discord.js");

const {
  requireGuildAccess
} = require("../middleware");

function makeId() {
  return (
    Date.now().toString(36) +
    Math.random()
      .toString(36)
      .slice(2, 8)
  );
}

module.exports =
function autoRepliesRoutes(
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

  async function refreshHelp(
    guild
  ) {
    if (
      context.services.helpCenter
    ) {
      await context.services
        .helpCenter
        .refreshIfPublished(
          guild,
          context
        );
    }
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
        "autoReplies",
        {
          guild,
          channels:
            channels(guild),
          rules:
            Array.isArray(
              settings.autoReplies
            )
              ? settings.autoReplies
              : []
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

      const guild =
        await getGuild(guildId);

      if (!guild)
        return res.sendStatus(404);

      const settings =
        context.store.getGuild(
          guildId
        );

      const rules =
        Array.isArray(
          settings.autoReplies
        )
          ? [
              ...settings.autoReplies
            ]
          : [];

      const id =
        String(
          req.body.id || ""
        ).trim();

      const rule = {
        id: id || makeId(),

        trigger:
          String(
            req.body.trigger || ""
          ).trim(),

        response:
          String(
            req.body.response || ""
          ).trim(),

        matchType:
          req.body.matchType ||
          "includes",

        channelId:
          req.body.channelId ||
          "",

        replyMode:
          req.body.replyMode ||
          "reply",

        cooldownSeconds:
          Math.max(
            0,
            Number(
              req.body
                .cooldownSeconds ||
              0
            )
          ),

        caseSensitive:
          req.body
            .caseSensitive ===
          "on",

        enabled:
          req.body.enabled ===
          "on"
      };

      if (
        !rule.trigger ||
        !rule.response
      ) {
        return res
          .status(400)
          .send(
            "اكتب الكلمة والرد."
          );
      }

      const index =
        rules.findIndex(
          current =>
            current.id === rule.id
        );

      if (index >= 0) {
        rules[index] = rule;
      } else {
        rules.push(rule);
      }

      context.store
        .setGuildSection(
          guildId,
          "autoReplies",
          rules
        );

      context.audit(
        guildId,
        req.session.user,
        "autoReply.save",
        {
          id: rule.id,
          trigger:
            rule.trigger
        }
      );

      await refreshHelp(guild);

      res.redirect(
        `/auto-replies/${guildId}`
      );
    }
  );

  router.post(
    "/:guildId/delete",
    requireGuildAccess,
    async (req, res) => {
      const guildId =
        req.params.guildId;

      const guild =
        await getGuild(guildId);

      if (!guild)
        return res.sendStatus(404);

      const settings =
        context.store.getGuild(
          guildId
        );

      const rules =
        (
          settings.autoReplies ||
          []
        ).filter(
          rule =>
            rule.id !==
            req.body.id
        );

      context.store
        .setGuildSection(
          guildId,
          "autoReplies",
          rules
        );

      context.audit(
        guildId,
        req.session.user,
        "autoReply.delete",
        {
          id: req.body.id
        }
      );

      await refreshHelp(guild);

      res.redirect(
        `/auto-replies/${guildId}`
      );
    }
  );

  return router;
};
