const {
  createBettingService
} = require("../../modules/betting/service");

const {
  createCreditsService
} = require("../../modules/credits/service");

const express =
  require("express");

const {
  ChannelType
} = require("discord.js");

const {
  requireGuildAccess
} = require("../middleware");


function asArray(value) {

  if (!value)
    return [];

  return Array.isArray(value)
    ? value
    : [value];
}


module.exports =
function economyRoutes(
  client,
  context
) {

  const router =
    express.Router();

  // Fallback حتى لو تغير ترتيب تحميل الموديولات
  if (!context.services.credits) {
    context.services.credits =
      createCreditsService(
        context.config.files.credits
      );
  }

  if (!context.services.betting) {
    context.services.betting =
      createBettingService(
        context
      );
  }


  async function getGuild(
    guildId
  ) {

    const guild =
      client.guilds.cache.get(
        guildId
      );

    if (!guild)
      return null;


    await Promise.all([
      guild.channels
        .fetch()
        .catch(() => {}),

      guild.members
        .fetch()
        .catch(() => {})
    ]);


    return guild;
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


      const channels =
        [
          ...guild.channels
            .cache
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


      const members =
        [
          ...guild.members
            .cache
            .values()
        ]
          .filter(
            member =>
              !member.user.bot
          )
          .sort(
            (a, b) =>
              a.displayName
                .localeCompare(
                  b.displayName
                )
          );


      const settings =
        context.services
          .betting
          .getSettings(
            guild.id
          );


      const top =
        context.services
          .credits
          .getTop(
            guild.id,
            10
          )
          .map(
            item => ({
              ...item,

              name:
                guild.members
                  .cache
                  .get(
                    item.userId
                  )
                  ?.displayName ||
                item.username ||
                item.userId
            })
          );


      res.render(
        "economy",
        {
          guild,
          channels,
          members,
          settings,
          top
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


      const allowedChannelIds =
        asArray(
          req.body
            .allowedChannelIds
        );


      const minBet =
        Math.max(
          1,
          Number(
            req.body.minBet ||
            1
          )
        );


      const maxBet =
        Math.max(
          minBet,
          Number(
            req.body.maxBet ||
            25
          )
        );


      context.store
        .setGuildSection(
          guildId,
          "betting",
          {
            enabled:
              req.body.enabled ===
              "on",

            allowedChannelIds,

            minBet,

            maxBet
          }
        );


      context.audit(
        guildId,
        req.session.user,
        "betting.settings",
        {
          allowedChannelIds,
          minBet,
          maxBet
        }
      );


      res.redirect(
        `/economy/${guildId}`
      );
    }
  );


  router.post(
    "/:guildId/credits",
    requireGuildAccess,

    async (req, res) => {

      const guildId =
        req.params.guildId;


      const guild =
        await getGuild(
          guildId
        );


      if (!guild)
        return res.sendStatus(404);


      const member =
        guild.members
          .cache
          .get(
            req.body.userId
          );


      if (!member) {

        return res
          .status(404)
          .send(
            "العضو غير موجود"
          );
      }


      const amount =
        Math.max(
          0,
          Number(
            req.body.amount ||
            0
          )
        );


      const credits =
        context.services.credits;


      switch (
        req.body.action
      ) {

        case "add":

          credits.adjust(
            guildId,
            member.id,
            amount,
            member.user.username
          );

          break;


        case "remove":

          credits.adjust(
            guildId,
            member.id,
            -amount,
            member.user.username
          );

          break;


        case "set":

          credits.setBalance(
            guildId,
            member.id,
            amount,
            member.user.username
          );

          break;


        case "reset":

          credits.setBalance(
            guildId,
            member.id,
            0,
            member.user.username
          );

          break;
      }


      context.audit(
        guildId,
        req.session.user,
        "credits.update",
        {
          target:
            member.user.username,

          action:
            req.body.action,

          amount
        }
      );


      res.redirect(
        `/economy/${guildId}`
      );
    }
  );


  return router;
};
