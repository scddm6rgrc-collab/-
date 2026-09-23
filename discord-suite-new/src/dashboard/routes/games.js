const express =
  require("express");

const {
  requireGuildAccess
} = require("../middleware");

const {
  GAMES
} = require(
  "../../modules/games/config"
);


module.exports =
function gamesRoutes(
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


      await Promise.all([
        guild.roles
          .fetch()
          .catch(() => {}),

        guild.channels
          .fetch()
          .catch(() => {})
      ]);


      const settings =
        context.store
          .getGuild(
            guild.id
          )
          .games || {};


      const modes = {};
      const aliases = {};
      const rooms = {};


      for (
        const game of GAMES
      ) {

        modes[game.key] =
          settings.modes
            ?.[game.key] ||
          game.defaultMode;


        aliases[game.key] =
          settings.aliases
            ?.[game.key] ||
          game.defaultAlias ||
          `!${game.command}`;


        rooms[game.key] =
          settings.rooms
            ?.[game.key] ||
          "";

      }


      const roles =
        [...guild.roles.cache.values()]
          .filter(
            role =>
              role.name !==
                "@everyone" &&
              !role.managed
          )
          .sort(
            (a, b) =>
              b.position -
              a.position
          );


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
        "games",
        {
          guild,
          games: GAMES,
          modes,
          aliases,
          rooms,
          roles,
          channels,

          staffRoleIds:
            settings.staffRoleIds ||
            []
        }
      );

    }
  );


  router.post(
    "/:guildId/save",
    requireGuildAccess,

    async (
      req,
      res
    ) => {

      const guildId =
        req.params.guildId;

      const modes = {};
      const aliases = {};
      const rooms = {};

      const usedAliases =
        new Set();


      for (
        const game of GAMES
      ) {

        modes[game.key] =
          req.body[
            `mode_${game.key}`
          ] === "staff"
            ? "staff"
            : "public";


        let alias =
          String(
            req.body[
              `alias_${game.key}`
            ] ||
            game.defaultAlias ||
            `!${game.command}`
          )
            .trim()
            .split(/\s+/)[0];


        if (
          !alias.startsWith("!")
        ) {
          alias =
            "!" + alias;
        }


        alias =
          alias.slice(
            0,
            32
          );


        if (
          usedAliases.has(
            alias.toLowerCase()
          )
        ) {
          alias =
            game.defaultAlias ||
            `!${game.command}`;
        }


        usedAliases.add(
          alias.toLowerCase()
        );


        aliases[
          game.key
        ] = alias;


        rooms[
          game.key
        ] =
          String(
            req.body[
              `room_${game.key}`
            ] || ""
          );

      }


      let staffRoleIds =
        req.body.staffRoleIds ||
        [];


      if (
        !Array.isArray(
          staffRoleIds
        )
      ) {
        staffRoleIds = [
          staffRoleIds
        ];
      }


      context.store
        .setGuildSection(
          guildId,
          "games",
          {
            modes,
            aliases,
            rooms,
            staffRoleIds
          }
        );


      context.audit(
        guildId,
        req.session.user,
        "games.settings",
        {
          modes,
          aliases,
          rooms,
          staffRoleIds
        }
      );


      res.redirect(
        `/games/${guildId}`
      );

    }
  );


  return router;
};
