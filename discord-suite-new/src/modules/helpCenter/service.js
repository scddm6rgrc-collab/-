const {
  EmbedBuilder
} = require("discord.js");

function clip(text, max = 1000) {
  const value =
    String(text || "");

  if (value.length <= max)
    return value;

  return (
    value.slice(
      0,
      max - 3
    ) + "..."
  );
}

function buildEmbed(
  guild,
  guildSettings
) {
  const help =
    guildSettings.helpCenter ||
    {};

  const commandSettings =
    guildSettings
      .customCommandSettings ||
    {};

  const prefix =
    commandSettings.prefix ||
    "!";

  const commands =
    Array.isArray(
      guildSettings.customCommands
    )
      ? guildSettings.customCommands
          .filter(
            command =>
              command.enabled !==
              false
          )
      : [];

  const autoReplies =
    Array.isArray(
      guildSettings.autoReplies
    )
      ? guildSettings.autoReplies
          .filter(
            rule =>
              rule.enabled !== false
          )
      : [];

  const customLines =
    commands.length
      ? commands.map(command => {
          const aliases =
            (command.aliases || [])
              .length
              ? ` | ${command.aliases
                  .map(
                    alias =>
                      `${prefix}${alias}`
                  )
                  .join(", ")}`
              : "";

          const description =
            command.description ||
            "أمر مخصص";

          return (
            `**${prefix}${command.name}**${aliases}\n` +
            `${description}`
          );
        }).join("\n\n")
      : "لا توجد أوامر مخصصة حاليًا.";

  const replyLines =
    autoReplies.length
      ? autoReplies
          .slice(0, 20)
          .map(rule =>
            `• **${rule.trigger}** → ${
              rule.matchType ||
              "includes"
            }`
          )
          .join("\n")
      : "لا توجد ردود تلقائية حاليًا.";

  const embed =
    new EmbedBuilder()
      .setTitle(
        help.title ||
        "📚 أوامر السيرفر"
      )
      .setDescription(
        help.description ||
        "هنا تجد أوامر البوت وطريقة استخدامها."
      )
      .setColor(
        help.embedColor ||
        "#5865F2"
      )
      .addFields(
        {
          name:
            "⭐ أوامر اللفلات",
          value:
            "`/rank` — ترتيبك وXP واللفل\n" +
            "`/leaderboard` — أفضل 10 أعضاء"
        },
        {
          name:
            "⚡ الأوامر المخصصة",
          value:
            clip(customLines)
        },
        {
          name:
            "💬 الردود التلقائية",
          value:
            clip(replyLines)
        }
      )
      .setFooter({
        text:
          `${guild.name} • يتم تحديث القائمة من الداشبورد`
      });

  return embed;
}

async function publish(
  guild,
  context
) {
  const guildSettings =
    context.store.getGuild(
      guild.id
    );

  const help =
    guildSettings.helpCenter ||
    {};

  if (!help.channelId) {
    throw new Error(
      "اختر روم التعليمات أولاً."
    );
  }

  const channel =
    guild.channels.cache.get(
      help.channelId
    ) ||
    await guild.channels
      .fetch(help.channelId)
      .catch(() => null);

  if (
    !channel ||
    !channel.isTextBased()
  ) {
    throw new Error(
      "روم التعليمات غير صالح."
    );
  }

  const embed =
    buildEmbed(
      guild,
      guildSettings
    );

  let message = null;

  if (help.messageId) {
    message =
      await channel.messages
        .fetch(help.messageId)
        .catch(() => null);

    if (message) {
      await message.edit({
        embeds: [embed]
      });
    }
  }

  if (!message) {
    message =
      await channel.send({
        embeds: [embed]
      });
  }

  context.store
    .setGuildSection(
      guild.id,
      "helpCenter",
      {
        ...help,
        channelId:
          channel.id,
        messageId:
          message.id
      }
    );

  return message;
}

async function refreshIfPublished(
  guild,
  context
) {
  const help =
    context.store
      .getGuild(guild.id)
      .helpCenter ||
    {};

  if (
    !help.channelId ||
    !help.messageId
  ) {
    return;
  }

  await publish(
    guild,
    context
  ).catch(error =>
    console.error(
      "Help Center refresh:",
      error
    )
  );
}

module.exports = {
  buildEmbed,
  publish,
  refreshIfPublished
};
