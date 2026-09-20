const express = require("express");
const { PermissionFlagsBits } = require("discord.js");
const { requireGuildAccess } = require("../middleware");

module.exports = function guildRoutes(client, context) {
  const router = express.Router();

  router.get("/:guildId", requireGuildAccess, async (req, res) => {
    try {
      const guild = client.guilds.cache.get(req.params.guildId);
      if (!guild) return res.status(404).json({ error: "السيرفر غير موجود عند البوت" });

      await Promise.all([guild.roles.fetch(), guild.channels.fetch()]);

      const me = guild.members.me;
      const roles = [...guild.roles.cache.values()]
        .sort((a, b) => b.position - a.position)
        .map(role => ({
          id: role.id,
          name: role.name,
          color: role.hexColor,
          position: role.position,
          managed: role.managed,
          editable: role.editable,
          hoist: role.hoist,
          mentionable: role.mentionable,
          permissions: role.permissions.toArray()
        }));

      const channels = [...guild.channels.cache.values()]
        .sort((a, b) => a.rawPosition - b.rawPosition)
        .map(channel => ({
          id: channel.id,
          name: channel.name,
          type: channel.type,
          parentId: channel.parentId
        }));

      res.json({
        guild: {
          id: guild.id,
          name: guild.name,
          icon: guild.iconURL({ size: 128 }),
          memberCount: guild.memberCount,
          botCanManageRoles: Boolean(me?.permissions.has(PermissionFlagsBits.ManageRoles))
        },
        roles,
        channels,
        permissionNames: context.services.roles.permissionNames,
        settings: context.store.getGuild(guild.id)
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "تعذر جلب بيانات السيرفر" });
    }
  });


  // ==========================================
  // COMMAND CHANNEL
  // ==========================================

  router.post(
    "/command-channel",
    requireGuildAccess,
    async (req, res) => {
      try {
        const guildId =
          req.body.guildId;

        const channelId =
          req.body.commandChannelId || "";

        const guild =
          client.guilds.cache.get(guildId);

        if (!guild) {
          return res
            .status(404)
            .send("السيرفر غير موجود");
        }

        if (channelId) {
          const channel =
            guild.channels.cache.get(
              channelId
            ) ||
            await guild.channels
              .fetch(channelId)
              .catch(() => null);

          if (
            !channel ||
            !channel.isTextBased()
          ) {
            return res
              .status(400)
              .send("الروم غير صالح");
          }
        }

        context.store.patchGuild(
          guildId,
          {
            commandChannelId:
              channelId
          }
        );

        context.audit(
          guildId,
          req.session.user,
          "command-channel.update",
          {
            channelId
          }
        );

        res.redirect(
          `/?guild=${guildId}`
        );

      } catch (error) {
        console.error(error);

        res.status(500).send(
          "خطأ أثناء حفظ روم الأوامر"
        );
      }
    }
  );

  return router;
};
