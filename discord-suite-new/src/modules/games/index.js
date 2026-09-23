const {
  Events,
  ApplicationCommandOptionType
} = require("discord.js");

const {
  GAMES
} = require("./config");

const {
  createRewardService
} = require("./rewards");

const {
  createGameEngine
} = require("./engine");

const {
  createStaffGames
} = require("./staffGames");

const {
  createPublicGames
} = require("./publicGames");



function normalizeGameAlias(value, fallback) {
  let alias =
    String(value || fallback || "")
      .trim();

  if (!alias.startsWith("!")) {
    alias = "!" + alias;
  }

  // أمر واحد بدون مسافات
  alias =
    alias.split(/\s+/)[0];

  return alias.toLowerCase();
}


function getMessageBet(content) {
  const text =
    String(content || "");

  // يدعم:
  // !xo @user 5
  // !xo @user bet:5
  // !xo @user bet=5

  const named =
    text.match(
      /(?:^|\s)bet\s*[:=]?\s*(\d+)(?:\s|$)/i
    );

  if (named) {
    return Number(named[1]);
  }

  const parts =
    text
      .trim()
      .split(/\s+/)
      .slice(1);

  for (
    let i = parts.length - 1;
    i >= 0;
    i--
  ) {
    if (/^\d+$/.test(parts[i])) {
      return Number(parts[i]);
    }
  }

  return 0;
}


function makeMessageInteraction(
  message,
  bet
) {
  let sentMessage = null;

  const cleanPayload =
    payload => {
      if (
        typeof payload ===
        "string"
      ) {
        return {
          content: payload
        };
      }

      const result = {
        ...payload
      };

      // Ephemeral لا يعمل مع MessageCreate
      delete result.flags;
      delete result.ephemeral;

      return result;
    };

  const fake = {
    guild:
      message.guild,

    guildId:
      message.guildId,

    channel:
      message.channel,

    channelId:
      message.channelId,

    user:
      message.author,

    replied: false,
    deferred: false,

    options: {
      getInteger(
        name
      ) {
        if (name === "bet") {
          return bet || null;
        }

        return null;
      },

      getUser(
        name
      ) {
        if (name !== "user") {
          return null;
        }

        return (
          message.mentions.users
            .filter(
              user =>
                user.id !==
                message.author.id
            )
            .first() ||
          null
        );
      }
    },

    async reply(payload) {
      sentMessage =
        await message.channel.send(
          cleanPayload(payload)
        );

      fake.replied = true;

      return sentMessage;
    },

    async followUp(payload) {
      return message.channel.send(
        cleanPayload(payload)
      );
    },

    async fetchReply() {
      return sentMessage;
    },

    isRepliable() {
      return true;
    }
  };

  return fake;
}


module.exports = {
  name: "games",

  async setup(
    client,
    context
  ) {
    if (
      !context.services.credits
    ) {
      throw new Error(
        "credits service must load before games"
      );
    }

    if (
      !context.services.betting
    ) {
      throw new Error(
        "betting service must load before games"
      );
    }

    const rewards =
      createRewardService(
        context.config.files
          .gameRewards,

        context.services.credits,

        () => {
          const settings =
            context.store
              .getGuild(
                client.guilds.cache
                  .first()
                  ?.id || ""
              )
              .games || {};

          return settings;
        }
      );

    const engine =
      createGameEngine(
        client,
        context,
        rewards
      );

    const staff =
      createStaffGames(
        engine
      );

    const games =
      createPublicGames(
        engine
      );

    context.services.games =
      engine;

    context.services.gameRewards =
      rewards;


    // =========================================
    // REGISTER SLASH COMMANDS
    // =========================================

    client.once(
      Events.ClientReady,

      async readyClient => {
        const existing =
          await readyClient
            .application
            .commands
            .fetch();

        const oldCommands = [
          "coinflip",
          "dice",
          "guess",
          "duel"
        ];

        for (
          const oldName
          of oldCommands
        ) {
          const old =
            existing.find(
              command =>
                command.name ===
                oldName
            );

          if (old) {
            await old.delete()
              .catch(() => {});
          }
        }

        for (
          const game
          of GAMES
        ) {
          const options = [];

          if (
            game.directChallenge
          ) {
            options.push({
              name: "user",
              description:
                "الشخص الذي تريد تحديه",
              type:
                ApplicationCommandOptionType.User,
              required: true
            });
          }

          options.push({
            name: "bet",
            description:
              "قيمة الـBet إذا كانت اللعبة عامة",
            type:
              ApplicationCommandOptionType.Integer,
            required: false,
            min_value: 1
          });

          const definition = {
            name:
              game.command,

            description:
              `${game.name} - NATUS Games`,

            options
          };

          const old =
            existing.find(
              command =>
                command.name ===
                game.command
            );

          if (old) {
            await old.edit(
              definition
            );
          } else {
            await readyClient
              .application
              .commands
              .create(
                definition
              );
          }
        }

        console.log(
          "✅ All NATUS games registered"
        );
      }
    );



    // =========================================
    // MEMBER ! GAME COMMANDS
    // =========================================

    client.on(
      Events.MessageCreate,

      async message => {
        try {
          if (
            !message.guild ||
            message.author.bot
          ) {
            return;
          }

          const content =
            String(
              message.content || ""
            ).trim();

          if (!content.startsWith("!")) {
            return;
          }

          const firstWord =
            content
              .split(/\s+/)[0]
              .toLowerCase();

          const settings =
            engine.getSettings(
              message.guildId
            );

          const game =
            GAMES.find(
              item => {
                const alias =
                  normalizeGameAlias(
                    settings.aliases?.[
                      item.key
                    ],
                    item.defaultAlias ||
                      `!${item.command}`
                  );

                return (
                  alias === firstWord
                );
              }
            );

          if (!game) {
            return;
          }

          const bet =
            getMessageBet(
              content
            );

          // ألعاب التحدي تحتاج منشن
          if (
            game.directChallenge &&
            !message.mentions.users
              .filter(
                user =>
                  user.id !==
                  message.author.id
              )
              .first()
          ) {
            const alias =
              normalizeGameAlias(
                settings.aliases?.[
                  game.key
                ],
                game.defaultAlias ||
                  `!${game.command}`
              );

            await message.reply(
              `❌ لازم تمنشن الشخص.\nمثال: \`${alias} @user 5\``
            );

            return;
          }

          const interaction =
            makeMessageInteraction(
              message,
              bet
            );

          switch (game.command) {
            case "elimination":
              return staff.elimination(
                interaction
              );

            case "spy":
              return staff.spy(
                interaction
              );

            case "xo":
              return games.xo(
                interaction
              );

            case "rps":
              return games.rps(
                interaction
              );

            case "coinout":
              return games.coinout(
                interaction
              );

            case "guessnumber":
              return games.guessnumber(
                interaction
              );

            case "highdice":
              return games.highdice(
                interaction
              );

            case "fastest":
              return games.fastest(
                interaction
              );

            case "quickquiz":
              return games.quickquiz(
                interaction
              );

            case "bannednumber":
              return games.bannednumber(
                interaction
              );

            case "safebox":
              return games.safebox(
                interaction
              );
          }

        } catch (error) {
          console.error(
            "Game text command:",
            error
          );

          await message
            .reply(
              "❌ صار خطأ أثناء تشغيل اللعبة."
            )
            .catch(() => {});
        }
      }
    );


    // =========================================
    // INTERACTIONS
    // =========================================

    client.on(
      Events.InteractionCreate,

      async interaction => {
        try {

          if (
            await engine.handleJoin(
              interaction
            )
          ) {
            return;
          }

          if (
            await staff.handle(
              interaction
            )
          ) {
            return;
          }

          if (
            await games.handle(
              interaction
            )
          ) {
            return;
          }

          if (
            !interaction
              .isChatInputCommand()
          ) {
            return;
          }

          const slashGame =
            GAMES.find(
              game =>
                game.command ===
                interaction.commandName
            );

          if (!slashGame) {
            return;
          }

          // Slash للألعاب للمشرفين فقط
          if (
            !(await engine.isStaff(
              interaction
            ))
          ) {
            await engine.privateReply(
              interaction,
              "❌ أوامر / للألعاب خاصة بالمشرفين. استخدم أمر ! الخاص باللعبة."
            );

            return;
          }

          if (!slashGame) {
            return;
          }

          // أوامر / للألعاب للمشرفين فقط
          if (
            !(await engine.isStaff(
              interaction
            ))
          ) {
            const settings =
              engine.getSettings(
                interaction.guildId
              );

            const alias =
              normalizeGameAlias(
                settings.aliases?.[
                  slashGame.key
                ],
                slashGame.defaultAlias ||
                  `!${slashGame.command}`
              );

            await engine.privateReply(
              interaction,
              `❌ أوامر **/** للألعاب خاصة بالمشرفين فقط. استخدم الأمر **${alias}**.`
            );

            return;
          }

          switch (
            interaction.commandName
          ) {
            case "elimination":
              return staff.elimination(
                interaction
              );

            case "spy":
              return staff.spy(
                interaction
              );

            case "xo":
              return games.xo(
                interaction
              );

            case "rps":
              return games.rps(
                interaction
              );

            case "coinout":
              return games.coinout(
                interaction
              );

            case "guessnumber":
              return games.guessnumber(
                interaction
              );

            case "highdice":
              return games.highdice(
                interaction
              );

            case "fastest":
              return games.fastest(
                interaction
              );

            case "quickquiz":
              return games.quickquiz(
                interaction
              );

            case "bannednumber":
              return games.bannednumber(
                interaction
              );

            case "safebox":
              return games.safebox(
                interaction
              );
          }

        } catch (error) {
          console.error(
            "Games interaction:",
            error
          );

          if (
            interaction.isRepliable()
          ) {
            await engine.privateReply(
              interaction,
              "❌ صار خطأ داخل اللعبة."
            );
          }
        }
      }
    );
  }
};
