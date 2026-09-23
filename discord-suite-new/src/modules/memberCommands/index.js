const {
  Events,
  AttachmentBuilder
} = require("discord.js");

const {
  createRankCard
} = require(
  "../levels/rankImage"
);

const {
  createLeaderboardImage
} = require(
  "../levels/leaderboardImage"
);


const DEFAULTS = {
  rank: "!rank",
  leaderboard: "!top",
  credits: "!credits"
};


function normalizeAlias(
  value,
  fallback
) {
  let alias =
    String(
      value ||
      fallback ||
      ""
    )
      .trim()
      .split(/\s+/)[0];

  if (
    !alias.startsWith("!")
  ) {
    alias =
      "!" + alias;
  }

  return alias.toLowerCase();
}


module.exports = {
  name: "memberCommands",

  async setup(
    client,
    context
  ) {

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

          if (
            !content.startsWith("!")
          ) {
            return;
          }


          const settings =
            context.store
              .getGuild(
                message.guildId
              )
              .memberCommands || {};


          const aliases = {
            ...DEFAULTS,
            ...(
              settings.aliases ||
              {}
            )
          };


          const first =
            content
              .split(/\s+/)[0]
              .toLowerCase();


          let commandName = null;

          for (
            const [
              name,
              alias
            ]
            of Object.entries(
              aliases
            )
          ) {

            if (
              first ===
              normalizeAlias(
                alias,
                DEFAULTS[name]
              )
            ) {
              commandName = name;
              break;
            }

          }


          if (!commandName) {
            return;
          }


          // =====================================
          // روم خاص بكل أمر
          // =====================================

          const roomId =
            settings.rooms
              ?.[commandName];

          if (!roomId) {
            await message.reply(
              "❌ هذا الأمر ليس له روم محدد حتى الآن."
            );

            return;
          }


          if (
            message.channelId !==
            roomId
          ) {
            // لا نخلي البوت يزعج الشات العام
            // يحذف الرد تلقائيًا بعد فترة إن أمكن
            const warning =
              await message.reply(
                `❌ استخدم الأمر في <#${roomId}>.`
              )
                .catch(
                  () => null
                );

            if (warning) {
              setTimeout(
                () =>
                  warning.delete()
                    .catch(
                      () => {}
                    ),
                5000
              );
            }

            return;
          }


          // =====================================
          // !rank
          // =====================================

          if (
            commandName ===
            "rank"
          ) {

            const levels =
              context.services.levels;

            const cards =
              context.services.levelCards;

            if (
              !levels ||
              !cards
            ) {
              return message.reply(
                "❌ نظام اللفلات غير جاهز."
              );
            }

            const stats =
              levels.getUser(
                message.guildId,
                message.author.id
              );

            if (
              !Number(
                stats.xp || 0
              )
            ) {
              return message.reply(
                "ما عندك XP لحد الآن."
              );
            }


            const member =
              await message.guild.members
                .fetch(
                  message.author.id
                )
                .catch(
                  () => null
                );

            if (!member) {
              return;
            }


            const rank =
              levels.getRank(
                message.guildId,
                message.author.id
              );

            const progress =
              levels.progress(
                stats.xp
              );

            const theme =
              cards.get(
                message.guildId
              );


            const image =
              await createRankCard({
                guild:
                  message.guild,

                member,
                stats,
                rank,
                progress,
                theme
              });


            return message.reply({
              files: [
                new AttachmentBuilder(
                  image,
                  {
                    name:
                      "rank.png"
                  }
                )
              ]
            });

          }


          // =====================================
          // !top / !leaderboard
          // =====================================

          if (
            commandName ===
            "leaderboard"
          ) {

            const levels =
              context.services.levels;

            if (!levels) {
              return message.reply(
                "❌ نظام اللفلات غير جاهز."
              );
            }


            const raw =
              levels.getTop(
                message.guildId,
                30
              );

            const users = [];


            for (
              const item of raw
            ) {

              if (
                users.length >= 10
              ) {
                break;
              }


              const member =
                await message.guild.members
                  .fetch(
                    item.userId
                  )
                  .catch(
                    () => null
                  );

              if (
                !member ||
                member.user.bot
              ) {
                continue;
              }


              users.push({
                ...item,

                displayName:
                  member.displayName,

                avatarURL:
                  member.user
                    .displayAvatarURL({
                      extension:
                        "png",

                      size: 256
                    })
              });

            }


            if (
              !users.length
            ) {
              return message.reply(
                "ما في XP كافي لعرض الترتيب."
              );
            }


            const image =
              await createLeaderboardImage(
                message.guild,
                users,
                levels
              );


            return message.reply({
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


          // =====================================
          // !credits
          // =====================================

          if (
            commandName ===
            "credits"
          ) {

            const credits =
              context.services.credits;

            if (!credits) {
              return message.reply(
                "❌ نظام Credits غير جاهز."
              );
            }


            const levels =
              context.services.levels;


            if (
              levels &&
              typeof credits
                .syncLevelRewards ===
                "function"
            ) {

              const stats =
                levels.getUser(
                  message.guildId,
                  message.author.id
                );

              const level =
                levels.levelFromXp(
                  stats.xp
                );


              credits.syncLevelRewards(
                message.guildId,
                message.author.id,
                level,
                message.author.username
              );

            }


            const balance =
              credits.getBalance(
                message.guildId,
                message.author.id
              );


            let text =
              `💳 <@${message.author.id}> لديك **${balance} Credits**.`;


            if (
              typeof credits
                .nextMilestone ===
                "function"
            ) {

              const stats =
                levels?.getUser(
                  message.guildId,
                  message.author.id
                );

              const level =
                levels
                  ? levels.levelFromXp(
                      stats?.xp || 0
                    )
                  : 0;

              const next =
                credits.nextMilestone(
                  level
                );

              if (next) {
                text +=
                  `\n⭐ المكافأة القادمة عند Level **${next.level}**: +${next.reward} Credit.`;
              }

            }


            return message.reply(
              text
            );

          }


        } catch (error) {

          console.error(
            "Member ! command:",
            error
          );

          await message
            .reply(
              "❌ صار خطأ في الأمر."
            )
            .catch(
              () => {}
            );

        }
      }
    );

  }
};
