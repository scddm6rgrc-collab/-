const express =
  require("express");

const {
  ChannelType
} = require("discord.js");

const {
  requireGuildAccess
} = require("../middleware");

const {
  normalizeCommand,
  parseAliases
} = require(
  "../../modules/customCommands/service"
);

function makeId() {
  return (
    Date.now().toString(36) +
    Math.random()
      .toString(36)
      .slice(2, 8)
  );
}

module.exports =
function customCommandsRoutes(
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
        "customCommands",
        {
          guild,
          channels:
            channels(guild),

          commandSettings:
            settings
              .customCommandSettings ||
            {
              prefix: "!"
            },

          commands:
            Array.isArray(
              settings.customCommands
            )
              ? settings.customCommands
              : []
        }
      );
    }
  );

  router.post(
    "/:guildId/settings",
    requireGuildAccess,
    async (req, res) => {
      const guildId =
        req.params.guildId;

      let prefix =
        String(
          req.body.prefix || "!"
        ).trim();

      if (!prefix)
        prefix = "!";

      prefix =
        prefix.slice(0, 5);

      context.store
        .setGuildSection(
          guildId,
          "customCommandSettings",
          {
            prefix
          }
        );

      context.audit(
        guildId,
        req.session.user,
        "customCommands.settings",
        {
          prefix
        }
      );

      const guild =
        client.guilds.cache.get(
          guildId
        );

      if (guild)
        await refreshHelp(guild);

      res.redirect(
        `/custom-commands/${guildId}`
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

      const commands =
        Array.isArray(
          settings.customCommands
        )
          ? [
              ...settings.customCommands
            ]
          : [];

      const id =
        String(
          req.body.id || ""
        ).trim();

      const name =
        normalizeCommand(
          req.body.name
        );

      if (!name) {
        return res
          .status(400)
          .send(
            "اكتب اسم الأمر."
          );
      }

      const aliases =
        parseAliases(
          req.body.aliases
        )
          .filter(
            alias =>
              alias !== name
          );

      const duplicate =
        commands.some(command => {
          if (
            command.id === id
          )
            return false;

          const names = [
            command.name,
            ...(command.aliases ||
              [])
          ].map(
            normalizeCommand
          );

          return [
            name,
            ...aliases
          ].some(value =>
            names.includes(value)
          );
        });

      if (duplicate) {
        return res
          .status(400)
          .send(
            "اسم الأمر أو أحد الاختصارات مستخدم مسبقًا."
          );
      }

      const command = {
        id: id || makeId(),

        name,

        aliases,

        description:
          String(
            req.body
              .description ||
            ""
          ).trim(),

        response:
          String(
            req.body.response ||
            ""
          ).trim(),

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

        enabled:
          req.body.enabled ===
          "on"
      };

      if (!command.response) {
        return res
          .status(400)
          .send(
            "اكتب رد الأمر."
          );
      }

      const index =
        commands.findIndex(
          current =>
            current.id ===
            command.id
        );

      if (index >= 0) {
        commands[index] =
          command;
      } else {
        commands.push(command);
      }

      context.store
        .setGuildSection(
          guildId,
          "customCommands",
          commands
        );

      context.audit(
        guildId,
        req.session.user,
        "customCommand.save",
        {
          id: command.id,
          name:
            command.name
        }
      );

      await refreshHelp(guild);

      res.redirect(
        `/custom-commands/${guildId}`
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

      const commands =
        (
          settings.customCommands ||
          []
        ).filter(
          command =>
            command.id !==
            req.body.id
        );

      context.store
        .setGuildSection(
          guildId,
          "customCommands",
          commands
        );

      context.audit(
        guildId,
        req.session.user,
        "customCommand.delete",
        {
          id: req.body.id
        }
      );

      await refreshHelp(guild);

      res.redirect(
        `/custom-commands/${guildId}`
      );
    }
  );

  return router;
};
