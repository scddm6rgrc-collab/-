const express = require("express");

const {
  requireGuildAccess
} = require("../middleware");

const {
  GAMES
} = require("../../modules/games/config");


const MEMBER_COMMANDS = [
  {
    key: "rank",
    name: "الرتبة واللفل",
    slash: "/rank",
    defaultAlias: "!rank"
  },

  {
    key: "leaderboard",
    name: "أفضل الأعضاء",
    slash: "/leaderboard",
    defaultAlias: "!top"
  },

  {
    key: "credits",
    name: "الرصيد",
    slash: "/credits",
    defaultAlias: "!credits"
  }
];


function numberValue(
  value,
  fallback,
  min,
  max
) {
  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(
    min,
    Math.min(
      max,
      Math.floor(number)
    )
  );
}


module.exports =
function commandCenterRoutes(
  client,
  context
) {

  const router =
    express.Router();


  router.get(
    "/:guildId",
    requireGuildAccess,

    async (req, res) => {

      const guild =
        client.guilds.cache.get(
          req.params.guildId
        );

      if (!guild) {
        return res
          .status(404)
          .send("السيرفر غير موجود");
      }


      await Promise.all([
        guild.channels.fetch()
          .catch(() => {}),

        guild.roles.fetch()
          .catch(() => {})
      ]);


      const all =
        context.store
          .getGuild(guild.id);


      const memberSettings =
        all.memberCommands || {};

      const gameSettings =
        all.games || {};


      const memberAliases = {};
      const memberRooms = {};

      for (
        const command
        of MEMBER_COMMANDS
      ) {

        memberAliases[
          command.key
        ] =
          memberSettings.aliases
            ?.[command.key] ||
          command.defaultAlias;


        memberRooms[
          command.key
        ] =
          memberSettings.rooms
            ?.[command.key] ||
          "";

      }


      const gameAliases = {};
      const gameRooms = {};
      const gameModes = {};


      for (const game of GAMES) {

        gameAliases[
          game.key
        ] =
          gameSettings.aliases
            ?.[game.key] ||
          game.defaultAlias ||
          `!${game.command}`;


        gameRooms[
          game.key
        ] =
          gameSettings.rooms
            ?.[game.key] ||
          "";


        gameModes[
          game.key
        ] =
          gameSettings.modes
            ?.[game.key] ||
          game.defaultMode;

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


      const roles =
        [...guild.roles.cache.values()]
          .filter(
            role =>
              role.name !== "@everyone" &&
              !role.managed
          )
          .sort(
            (a, b) =>
              b.position -
              a.position
          );


      res.render(
        "commandCenter",
        {
          guild,

          memberCommands:
            MEMBER_COMMANDS,

          games:
            GAMES,

          memberAliases,
          memberRooms,

          gameAliases,
          gameRooms,
          gameModes,

          channels,
          roles,

          staffRoleIds:
            gameSettings.staffRoleIds ||
            [],


          rules: {
            multiplayerStartFee:
              Number(
                gameSettings
                  .multiplayerStartFee ??
                5
              ),

            staffWinReward:
              Number(
                gameSettings
                  .staffWinReward ??
                10
              ),

            staffMaxRewardStreak:
              Number(
                gameSettings
                  .staffMaxRewardStreak ??
                3
              ),

            staffLossesToUnlock:
              Number(
                gameSettings
                  .staffLossesToUnlock ??
                3
              )
          }
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


      // =====================================
      // MEMBER COMMANDS
      // =====================================

      const memberAliases = {};
      const memberRooms = {};

      const usedAliases =
        new Set();


      for (
        const command
        of MEMBER_COMMANDS
      ) {

        let alias =
          String(
            req.body[
              `member_alias_${command.key}`
            ] ||
            command.defaultAlias
          )
            .trim()
            .split(/\s+/)[0];


        if (!alias.startsWith("!")) {
          alias = "!" + alias;
        }


        alias =
          alias.slice(0, 32);


        if (
          usedAliases.has(
            alias.toLowerCase()
          )
        ) {
          alias =
            command.defaultAlias;
        }


        usedAliases.add(
          alias.toLowerCase()
        );


        memberAliases[
          command.key
        ] = alias;


        memberRooms[
          command.key
        ] =
          String(
            req.body[
              `member_room_${command.key}`
            ] || ""
          );

      }


      context.store
        .setGuildSection(
          guildId,
          "memberCommands",
          {
            aliases:
              memberAliases,

            rooms:
              memberRooms
          }
        );


      // =====================================
      // GAMES
      // =====================================

      const oldGames =
        context.store
          .getGuild(guildId)
          .games || {};


      const gameAliases = {};
      const gameRooms = {};
      const gameModes = {};


      for (const game of GAMES) {

        let alias =
          String(
            req.body[
              `game_alias_${game.key}`
            ] ||
            game.defaultAlias ||
            `!${game.command}`
          )
            .trim()
            .split(/\s+/)[0];


        if (!alias.startsWith("!")) {
          alias = "!" + alias;
        }


        alias =
          alias.slice(0, 32);


        if (
          usedAliases.has(
            alias.toLowerCase()
          )
        ) {
          alias =
            `!${game.command}`;
        }


        usedAliases.add(
          alias.toLowerCase()
        );


        gameAliases[
          game.key
        ] = alias;


        gameRooms[
          game.key
        ] =
          String(
            req.body[
              `game_room_${game.key}`
            ] || ""
          );


        gameModes[
          game.key
        ] =
          req.body[
            `game_mode_${game.key}`
          ] === "staff"
            ? "staff"
            : "public";

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


      const multiplayerStartFee =
        numberValue(
          req.body.multiplayerStartFee,
          5,
          0,
          100000
        );


      const staffWinReward =
        numberValue(
          req.body.staffWinReward,
          10,
          0,
          100000
        );


      const staffMaxRewardStreak =
        numberValue(
          req.body.staffMaxRewardStreak,
          3,
          1,
          100
        );


      const staffLossesToUnlock =
        numberValue(
          req.body.staffLossesToUnlock,
          3,
          1,
          100
        );


      context.store
        .setGuildSection(
          guildId,
          "games",
          {
            ...oldGames,

            aliases:
              gameAliases,

            rooms:
              gameRooms,

            modes:
              gameModes,

            staffRoleIds,

            multiplayerStartFee,
            staffWinReward,
            staffMaxRewardStreak,
            staffLossesToUnlock
          }
        );


      context.audit(
        guildId,
        req.session.user,
        "commandCenter.settings",
        {
          memberAliases,
          memberRooms,

          gameAliases,
          gameRooms,
          gameModes,

          staffRoleIds,

          multiplayerStartFee,
          staffWinReward,
          staffMaxRewardStreak,
          staffLossesToUnlock
        }
      );


      res.redirect(
        `/commands/${guildId}`
      );

    }
  );


  return router;
};
