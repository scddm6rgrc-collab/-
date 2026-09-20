const { ChannelType, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

const guideSections = [
  ["🎫 التكت", "من الداشبورد: عدّل شكل لوحة التكت، الرولات المسموحة، الكاتيجوري، النص، الصورة، زر الفتح، ورسالة الترحيب ثم اضغط نشر لوحة التكت."],
  ["💬 الرسائل", "من Message Center: اختر الروم، اكتب النص أو Embed، ثم نشر. للتعديل/الحذف اختر رسالة للبوت من الرسائل الأخيرة."],
  ["🎭 الرولات", "اختر أي رول قابل للتعديل ثم غيّر الاسم، اللون، Hoist، Mentionable والصلاحيات. يوجد أيضًا نسخ Permissions إلى عدة رولات."],
  ["🎉 الفعاليات", "اختر الروم واكتب النص الرئيسي، العنوان، النص تحته، لون الـEmbed، الصورة والفوتر ثم نشر."],
  ["📘 دليل المشرفين", "هذا الروم يمكن إعادة إنشائه أو تحديثه من الداشبورد في أي وقت."]
];

async function publishGuide(guild, botMember) {
  let channel = guild.channels.cache.find(ch => ch.name === "bot-mod-guide" && ch.type === ChannelType.GuildText);

  if (!channel) {
    channel = await guild.channels.create({
      name: "bot-mod-guide",
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.SendMessages]
        },
        {
          id: botMember.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages]
        }
      ]
    });
  }

  const old = await channel.messages.fetch({ limit: 50 });
  const botMessages = old.filter(m => m.author.id === botMember.id);
  if (botMessages.size) await channel.bulkDelete(botMessages, true).catch(() => {});

  const embed = new EmbedBuilder()
    .setTitle("📘 دليل استخدام البوت للمشرفين")
    .setDescription("هذا الروم يشرح الأقسام الأساسية. أغلب التحكم يتم من الداشبورد.")
    .setColor("#5865F2")
    .addFields(guideSections.map(([name, value]) => ({ name, value })));

  await channel.send({ embeds: [embed] });
  return channel;
}

module.exports = { publishGuide };
