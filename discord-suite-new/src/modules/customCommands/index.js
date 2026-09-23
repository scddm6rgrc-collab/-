const {
  Events
} = require("discord.js");

const {
  findCommand,
  renderResponse
} = require("./service");

module.exports = {
  name: "customCommands",

  async setup(client, context) {
    const cooldowns = new Map();

    client.on(
      Events.MessageCreate,
      async message => {
        if (!message.guild)
          return;

        if (message.author.bot)
          return;

        const guildSettings =
          context.store.getGuild(
            message.guild.id
          );

        const commandSettings =
          guildSettings
            .customCommandSettings ||
          {};

        const prefix =
          commandSettings.prefix ||
          "!";

        const content =
          message.content.trim();

        if (
          !content.startsWith(prefix)
        ) {
          return;
        }

        const body =
          content
            .slice(prefix.length)
            .trim();

        if (!body)
          return;

        const parts =
          body.split(/\s+/);

        const commandName =
          parts.shift();

        const args =
          parts.join(" ");

        const commands =
          Array.isArray(
            guildSettings.customCommands
          )
            ? guildSettings.customCommands
            : [];

        const command =
          findCommand(
            commands,
            commandName
          );

        if (!command)
          return;

        if (
          command.enabled === false
        ) {
          return;
        }

        // إذا الأمر عنده روم خاص استخدمه
        // وإلا استخدم روم الأوامر العام
        const allowedChannelId =
          command.channelId ||
          guildSettings
            .commandChannelId ||
          "";

        if (
          allowedChannelId &&
          message.channelId !==
            allowedChannelId
        ) {
          const warning =
            await message.reply({
              content:
                `❌ استخدم هذا الأمر في <#${allowedChannelId}>`,
              allowedMentions: {
                repliedUser: false
              }
            }).catch(() => null);

          if (warning) {
            setTimeout(
              () =>
                warning
                  .delete()
                  .catch(() => {}),
              5000
            );
          }

          return;
        }

        const cooldownSeconds =
          Math.max(
            0,
            Number(
              command.cooldownSeconds ||
              0
            )
          );

        const cooldownKey =
          `${message.guild.id}:${command.id}:${message.author.id}`;

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
          return;
        }

        cooldowns.set(
          cooldownKey,
          now
        );

        const response =
          renderResponse(
            command.response,
            message,
            args
          ).slice(0, 2000);

        if (!response)
          return;

        try {
          if (
            command.replyMode ===
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
            "Custom Command:",
            error
          );
        }
      }
    );
  }
};
