const {
  Events
} = require("discord.js");

const {
  matches,
  renderText
} = require("./service");

module.exports = {
  name: "autoReplies",

  async setup(client, context) {
    const cooldowns = new Map();

    client.on(
      Events.MessageCreate,
      async message => {
        if (!message.guild) return;
        if (message.author.bot) return;

        const guildSettings =
          context.store.getGuild(
            message.guild.id
          );

        const commandPrefix =
          guildSettings
            .customCommandSettings
            ?.prefix || "!";

        // لا نخلي Auto Reply يتداخل مع Custom Commands
        if (
          commandPrefix &&
          message.content
            .trim()
            .startsWith(commandPrefix)
        ) {
          return;
        }

        const rules =
          Array.isArray(
            guildSettings.autoReplies
          )
            ? guildSettings.autoReplies
            : [];

        for (const rule of rules) {
          if (rule.enabled === false)
            continue;

          if (
            rule.channelId &&
            rule.channelId !==
              message.channelId
          ) {
            continue;
          }

          if (
            !matches(
              rule,
              message.content
            )
          ) {
            continue;
          }

          const cooldownSeconds =
            Math.max(
              0,
              Number(
                rule.cooldownSeconds || 0
              )
            );

          const cooldownKey =
            `${message.guild.id}:${rule.id}:${message.author.id}`;

          const now =
            Date.now();

          const last =
            cooldowns.get(
              cooldownKey
            ) || 0;

          if (
            cooldownSeconds > 0 &&
            now - last <
              cooldownSeconds * 1000
          ) {
            continue;
          }

          cooldowns.set(
            cooldownKey,
            now
          );

          const response =
            renderText(
              rule.response,
              message
            ).slice(0, 2000);

          if (!response)
            continue;

          try {
            if (
              rule.replyMode ===
              "send"
            ) {
              await message.channel.send({
                content: response,
                allowedMentions: {
                  parse: ["users"]
                }
              });
            } else {
              await message.reply({
                content: response,
                allowedMentions: {
                  parse: ["users"],
                  repliedUser: false
                }
              });
            }
          } catch (error) {
            console.error(
              "Auto Reply:",
              error
            );
          }

          // أول Rule مطابق فقط
          break;
        }
      }
    );
  }
};
