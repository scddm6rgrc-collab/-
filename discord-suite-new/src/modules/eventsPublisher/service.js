const { EmbedBuilder } = require("discord.js");

async function publish(guild, input) {
  const channel = guild.channels.cache.get(input.channelId);
  if (!channel?.isTextBased()) throw new Error("Invalid event channel");

  const embed = new EmbedBuilder().setColor(input.color || "#5865F2");
  if (input.title) embed.setTitle(input.title);
  if (input.description) embed.setDescription(input.description);
  if (input.subtitle) embed.addFields({ name: input.subtitle, value: input.subtext || "\u200b" });
  if (input.image) embed.setImage(input.image);
  if (input.footer) embed.setFooter({ text: input.footer });

  return channel.send({
    content: input.content?.trim() || undefined,
    embeds: [embed]
  });
}

module.exports = { publish };
