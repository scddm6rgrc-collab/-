const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  AttachmentBuilder
} = require("discord.js");
const { TICKET_BUTTON_STYLES } = require("../../config/constants");

function getDefaults() {
  return {
    enabled: true,
    panelChannelId: "",
    categoryId: "",
    transcriptChannelId: "",
    staffRoleIds: [],
    panelTitle: "الدعم",
    panelDescription: "اضغط الزر لفتح تذكرة.",
    panelColor: "#5865F2",
    panelImage: "",
    buttonLabel: "فتح تذكرة",
    buttonEmoji: "🎫",
    buttonStyle: "Primary",
    ticketNamePattern: "ticket-{user}",
    welcomeMessage: "أهلاً {user}، اكتب مشكلتك وسيأتي أحد المشرفين.",
    closeLabel: "إغلاق التذكرة",
    closeEmoji: "🔒"
  };
}

function resolveSettings(store, guildId) {
  return {
    ...getDefaults(),
    ...(store.getGuild(guildId).tickets || {})
  };
}

async function publishPanel(guild, store) {
  const settings = resolveSettings(store, guild.id);
  const channel = guild.channels.cache.get(settings.panelChannelId);
  if (!channel?.isTextBased()) throw new Error("Ticket panel channel is invalid");

  const embed = new EmbedBuilder()
    .setTitle(settings.panelTitle)
    .setDescription(settings.panelDescription)
    .setColor(settings.panelColor || "#5865F2");

  if (settings.panelImage) embed.setImage(settings.panelImage);

  const button = new ButtonBuilder()
    .setCustomId("ticket:create")
    .setLabel(settings.buttonLabel)
    .setStyle(TICKET_BUTTON_STYLES[settings.buttonStyle] || TICKET_BUTTON_STYLES.Primary);

  if (settings.buttonEmoji) button.setEmoji(settings.buttonEmoji);

  await channel.send({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(button)]
  });
}

async function createTicket(interaction, store) {
  const guild = interaction.guild;
  const settings = resolveSettings(store, guild.id);
  if (!settings.enabled) return interaction.reply({ content: "نظام التكت متوقف.", ephemeral: true });

  const existing = guild.channels.cache.find(ch => ch.topic === `ticket-owner:${interaction.user.id}`);
  if (existing) {
    return interaction.reply({ content: `عندك تذكرة مفتوحة بالفعل: ${existing}`, ephemeral: true });
  }

  const overwrites = [
    {
      id: guild.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks
      ]
    }
  ];

  for (const roleId of settings.staffRoleIds || []) {
    overwrites.push({
      id: roleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages
      ]
    });
  }

  const safeName = interaction.user.username.toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 20);
  const name = settings.ticketNamePattern.replace("{user}", safeName).slice(0, 90);

  const channel = await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: settings.categoryId || undefined,
    topic: `ticket-owner:${interaction.user.id}`,
    permissionOverwrites: overwrites
  });

  const close = new ButtonBuilder()
    .setCustomId("ticket:close")
    .setLabel(settings.closeLabel)
    .setStyle(TICKET_BUTTON_STYLES.Danger);

  if (settings.closeEmoji) close.setEmoji(settings.closeEmoji);

  await channel.send({
    content: settings.welcomeMessage.replace("{user}", `<@${interaction.user.id}>`),
    components: [new ActionRowBuilder().addComponents(close)]
  });

  await interaction.reply({ content: `تم فتح ${channel}`, ephemeral: true });
}

async function closeTicket(interaction, store) {
  const channel = interaction.channel;
  if (!channel?.topic?.startsWith("ticket-owner:")) {
    return interaction.reply({ content: "هذا ليس روم تكت.", ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });
  const settings = resolveSettings(store, interaction.guild.id);

  try {
    const messages = await channel.messages.fetch({ limit: 100 });
    const transcript = [...messages.values()]
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
      .map(m => `[${new Date(m.createdTimestamp).toISOString()}] ${m.author.tag}: ${m.content || "[embed/file]"}`)
      .join("\n");

    const transcriptChannel = interaction.guild.channels.cache.get(settings.transcriptChannelId);
    if (transcriptChannel?.isTextBased()) {
      await transcriptChannel.send({
        content: `Transcript: #${channel.name}`,
        files: [new AttachmentBuilder(Buffer.from(transcript || "No messages", "utf8"), { name: `${channel.name}.txt` })]
      });
    }
  } catch (error) {
    console.error("Transcript error:", error.message);
  }

  await interaction.editReply("سيتم إغلاق التذكرة.");
  setTimeout(() => channel.delete().catch(() => {}), 1200);
}

module.exports = {
  getDefaults,
  resolveSettings,
  publishPanel,
  createTicket,
  closeTicket
};
