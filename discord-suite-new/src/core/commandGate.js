let store = null;

async function commandGate(interaction) {
  if (!interaction.guildId) {
    return true;
  }

  const settings =
    store?.getGuild(interaction.guildId) || {};

  const allowedChannelId =
    settings.commandChannelId;

  // إذا ما تم اختيار روم من الداشبورد
  // نسمح بالأوامر في كل مكان
  if (!allowedChannelId) {
    return true;
  }

  if (
    interaction.channelId ===
    allowedChannelId
  ) {
    return true;
  }

  const content =
    `❌ استخدم أوامر البوت فقط في <#${allowedChannelId}>`;

  try {
    if (
      interaction.replied ||
      interaction.deferred
    ) {
      await interaction.followUp({
        content,
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content,
        ephemeral: true
      });
    }
  } catch {}

  return false;
}

commandGate.configure = function(nextStore) {
  store = nextStore;
};

module.exports = commandGate;
