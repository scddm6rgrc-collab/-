const { EmbedBuilder } = require("discord.js");

async function getChannel(guild, channelId) {
  const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) throw new Error("Invalid text channel");
  return channel;
}

function buildPayload(input) {
  const payload = {};
  if (input.content?.trim()) payload.content = input.content.trim();

  if (input.title || input.description || input.image || input.subtitle) {
    const embed = new EmbedBuilder().setColor(input.color || "#5865F2");
    if (input.title) embed.setTitle(input.title);
    if (input.description) embed.setDescription(input.description);
    if (input.subtitle) embed.addFields({ name: input.subtitle, value: input.subtext || "\u200b" });
    if (input.image) embed.setImage(input.image);
    if (input.footer) embed.setFooter({ text: input.footer });
    payload.embeds = [embed];
  }

  if (!payload.content && !payload.embeds) throw new Error("Message is empty");
  return payload;
}

async function send(guild, input) {
  const channel = await getChannel(guild, input.channelId);
  return channel.send(buildPayload(input));
}

async function edit(guild, input) {
  const channel = await getChannel(guild, input.channelId);
  const message = await channel.messages.fetch(input.messageId);
  return message.edit(buildPayload(input));
}

async function remove(guild, channelId, messageId) {
  const channel = await getChannel(guild, channelId);
  const message = await channel.messages.fetch(messageId);
  await message.delete();
}

async function recentBotMessages(guild, channelId, botId) {
  const channel = await getChannel(guild, channelId);
  const messages = await channel.messages.fetch({ limit: 30 });
  return [...messages.values()]
    .filter(m => m.author.id === botId)
    .map(m => ({
      id: m.id,
      content: m.content || m.embeds[0]?.title || "Embed",
      createdAt: m.createdAt.toISOString()
    }));
}

module.exports = { send, edit, remove, recentBotMessages };
