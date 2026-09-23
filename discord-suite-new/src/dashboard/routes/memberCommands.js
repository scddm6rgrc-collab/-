const express =
  require("express");

const {
  requireGuildAccess
} = require("../middleware");


const COMMANDS = [
  {
    key: "rank",
    slash: "/rank",
    defaultAlias: "!rank",
    name: "الرتبة واللفل"
  },

  {
    key: "leaderboard",
    slash: "/leaderboard",
    defaultAlias: "!top",
    name: "ترتيب اللفلات"
  },

  {
    key: "credits",
    slash: "/credits",
    defaultAlias: "!credits",
    name: "الرصيد"
  }
];


module.exports =
function memberCommandRoutes(
  client,
  context
) {

  const router =
    express.Router();


  router.get(
    "/:guildId",
    requireGuildAccess,

    async (
      req,
      res
    ) => {

      const guild =
        client.guilds.cache.get(
          req.params.guildId
        );

      if (!guild) {
        return res
          .status(404)
          .send(
            "السيرفر غير موجود"
          );
      }


      await guild.channels
        .fetch()
        .catch(() => {});


      const settings =
        context.store
          .getGuild(
            guild.id
          )
          .memberCommands || {};


      const aliases = {};
      const rooms = {};


      for (
        const command
        of COMMANDS
      ) {

        aliases[
          command.key
        ] =
          settings.aliases
            ?.[command.key] ||
          command.defaultAlias;


        rooms[
          command.key
        ] =
          settings.rooms
            ?.[command.key] ||
          "";

      }


      const channels =
        [...guild.channels.cache.values()]
          .filter(
            channel =>
              channel.isTextBased() &&
              !channel.isThread()
          )
          .sort(
            (a, b) =>
              a.rawPosition -
              b.rawPosition
          );


      res.render(
        "memberCommands",
        {
          guild,
          commands: COMMANDS,
          aliases,
          rooms,
          channels
        }
      );

    }
  );


  router.post(
    "/:guildId/save",
    requireGuildAccess,

    (
      req,
      res
    ) => {

      const aliases = {};
      const rooms = {};
      const used =
        new Set();


      for (
        const command
        of COMMANDS
      ) {

        let alias =
          String(
            req.body[
              `alias_${command.key}`
            ] ||
            command.defaultAlias
          )
            .trim()
            .split(/\s+/)[0];


        if (
          !alias.startsWith("!")
        ) {
          alias =
            "!" + alias;
        }


        if (
          used.has(
            alias.toLowerCase()
          )
        ) {
          alias =
            command.defaultAlias;
        }


        used.add(
          alias.toLowerCase()
        );


        aliases[
          command.key
        ] =
          alias.slice(
            0,
            32
          );


        rooms[
          command.key
        ] =
          String(
            req.body[
              `room_${command.key}`
            ] || ""
          );

      }


      context.store
        .setGuildSection(
          req.params.guildId,
          "memberCommands",
          {
            aliases,
            rooms
          }
        );


      context.audit(
        req.params.guildId,
        req.session.user,
        "memberCommands.settings",
        {
          aliases,
          rooms
        }
      );


      res.redirect(
        `/member-commands/${req.params.guildId}`
      );

    }
  );


  return router;
};
