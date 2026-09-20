const commandGate = require("../../core/commandGate");
const {
  Events,
  AttachmentBuilder
} = require("discord.js");

const {
  createLevelService
} = require("./service");

const {
  createCardSettingsService
} = require("./cardSettings");

const {
  createLeaderboardImage
} = require("./leaderboardImage");

const {
  createRankCard
} = require("./rankImage");


module.exports = {
  name: "levels",

  async setup(client, context) {

    const levels =
      createLevelService(
        context.config.files.levels
      );

    const cards =
      createCardSettingsService(
        context.config.files.rankCardSettings
      );

    context.services.levels = levels;
    context.services.levelCards = cards;

    const cooldown = new Map();


    client.on(
      Events.MessageCreate,
      message => {

        if (!message.guild)
          return;

        if (message.author.bot)
          return;

        const settings =
          levels.getSettings(
            message.guild.id
          );

        if (!settings.enabled)
          return;

        const key =
          `${message.guild.id}:${message.author.id}`;

        const now = Date.now();
        const previous =
          cooldown.get(key) || 0;

        if (
          now - previous <
          Number(settings.cooldownSeconds || 60) *
            1000
        ) {
          return;
        }

        cooldown.set(key, now);

        const min =
          Number(settings.minXp || 15);

        const max =
          Math.max(
            min,
            Number(settings.maxXp || 25)
          );

        const xp =
          Math.floor(
            Math.random() *
              (max - min + 1)
          ) + min;

        levels.addMessageXp(
          message.guild.id,
          message.author.id,
          xp,
          message.author.username
        );

      }
    );


    client.once(
      Events.ClientReady,
      async readyClient => {

        const existing =
          await readyClient.application.commands.fetch();

        async function upsert(name, description) {
          const command =
            existing.find(
              cmd => cmd.name === name
            );

          if (command) {
            await command.edit({
              description
            });
          } else {
            await readyClient.application.commands.create({
              name,
              description
            });
          }
        }

        await upsert(
          "leaderboard",
          "عرض أفضل 10 أعضاء في اللفلات"
        );

        await upsert(
          "rank",
          "عرض ترتيبك ولفلك وXP"
        );

        console.log(
          "✅ /rank + /leaderboard registered"
        );

      }
    );


    client.on(
      Events.InteractionCreate,
      async interaction => {

        if (!interaction.isChatInputCommand())
          return;

        if (!(await commandGate(interaction)))
          return;

        if (
          !["leaderboard", "rank"]
            .includes(interaction.commandName)
        ) {
          return;
        }

        await interaction.deferReply();


        if (
          interaction.commandName === "rank"
        ) {

          const stats =
            levels.getUser(
              interaction.guild.id,
              interaction.user.id
            );

          if (!Number(stats.xp || 0)) {
            return interaction.editReply(
              "ما عندك XP لحد الآن."
            );
          }

          const member =
            await interaction.guild.members
              .fetch(interaction.user.id)
              .catch(() => null);

          if (!member) {
            return interaction.editReply(
              "تعذر جلب بيانات العضو."
            );
          }

          const rank =
            levels.getRank(
              interaction.guild.id,
              interaction.user.id
            );

          const progress =
            levels.progress(stats.xp);

          const theme =
            cards.get(
              interaction.guild.id
            );

          const image =
            await createRankCard({
              guild:
                interaction.guild,
              member,
              stats,
              rank,
              progress,
              theme
            });

          return interaction.editReply({
            files: [
              new AttachmentBuilder(
                image,
                {
                  name: "rank.png"
                }
              )
            ]
          });
        }


        const raw =
          levels.getTop(
            interaction.guild.id,
            30
          );

        const users = [];

        for (const item of raw) {

          if (users.length >= 10)
            break;

          const member =
            await interaction.guild.members
              .fetch(item.userId)
              .catch(() => null);

          if (!member)
            continue;

          if (member.user.bot)
            continue;

          users.push({
            ...item,

            displayName:
              member.displayName,

            avatarURL:
              member.user.displayAvatarURL({
                extension: "png",
                size: 256
              })
          });
        }

        if (!users.length) {
          return interaction.editReply(
            "ما في XP كافي لعرض Leaderboard لحد الآن."
          );
        }

        const image =
          await createLeaderboardImage(
            interaction.guild,
            users,
            levels
          );

        return interaction.editReply({
          files: [
            new AttachmentBuilder(
              image,
              {
                name:
                  "leaderboard.png"
              }
            )
          ]
        });

      }
    );

  }
};
