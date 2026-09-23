const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");


function roomMention(id) {
  return id
    ? `<#${id}>`
    : "⚠️ غير محدد";
}


function modeName(mode) {
  return mode === "staff"
    ? "🛡️ مشرفين"
    : "👥 عامة";
}


function getGames() {
  try {
    return require("../games/config").GAMES || [];
  } catch {
    return [];
  }
}


function getQuestionCount() {
  try {
    const {
      QUESTIONS
    } = require("../games/questions");

    return QUESTIONS.length;
  } catch {
    return 0;
  }
}



async function getAllSlashCommands(guild) {
  try {
    const commands =
      await guild.client.application.commands.fetch();

    return [...commands.values()]
      .sort(
        (a, b) =>
          a.name.localeCompare(b.name)
      )
      .map(command => {
        let usage =
          `/${command.name}`;

        const options =
          Array.isArray(command.options)
            ? command.options
            : [];

        for (const option of options) {
          if (
            option.type === 1 ||
            option.type === 2
          ) {
            usage +=
              ` ${option.name}`;
          } else {
            usage +=
              option.required
                ? ` <${option.name}>`
                : ` [${option.name}]`;
          }
        }

        return {
          name: command.name,
          usage,
          description:
            command.description ||
            "بدون وصف"
        };
      });

  } catch (error) {
    console.error(
      "Guide slash commands:",
      error
    );

    return [];
  }
}


function splitCommandLines(
  commands,
  maxLength = 950
) {
  const chunks = [];
  let current = "";

  for (const command of commands) {
    const line =
      `**${command.usage}**\n` +
      `${command.description}`;

    const next =
      current
        ? current +
          "\n\n" +
          line
        : line;

    if (
      next.length >
      maxLength
    ) {
      if (current) {
        chunks.push(current);
      }

      current = line;
    } else {
      current = next;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}


function getMemberCommandLines(settings) {
  const defaults = [
    {
      key: "rank",
      slash: "/rank",
      alias: "!rank",
      name: "الرتبة"
    },
    {
      key: "leaderboard",
      slash: "/leaderboard",
      alias: "!top",
      name: "الترتيب"
    },
    {
      key: "credits",
      slash: "/credits",
      alias: "!credits",
      name: "الرصيد"
    }
  ];

  const aliases =
    settings.memberCommands
      ?.aliases || {};

  const rooms =
    settings.memberCommands
      ?.rooms || {};

  return defaults
    .map(command => {
      const alias =
        aliases[command.key] ||
        command.alias;

      return (
        `**${command.name}**\n` +
        `🛡️ ${command.slash}\n` +
        `👤 ${alias}\n` +
        `📍 ${roomMention(rooms[command.key])}`
      );
    })
    .join("\n\n");
}


function getGameLines(settings) {
  const games =
    getGames();

  if (!games.length) {
    return "لا توجد ألعاب مسجلة حاليًا.";
  }

  const gameSettings =
    settings.games || {};

  return games
    .map(game => {
      const alias =
        gameSettings.aliases
          ?.[game.key] ||
        game.defaultAlias ||
        `!${game.command}`;

      const roomId =
        gameSettings.rooms
          ?.[game.key];

      const mode =
        gameSettings.modes
          ?.[game.key] ||
        game.defaultMode ||
        "public";

      return (
        `${game.emoji || "🎮"} **${game.name}**\n` +
        `🛡️ /${game.command}  •  👤 ${alias}\n` +
        `${modeName(mode)}  •  📍 ${roomMention(roomId)}`
      );
    })
    .join("\n\n");
}


function buildPermissions(
  guild,
  botMember,
  staffRoleIds
) {
  const overwrites = [
    {
      id: guild.id,

      deny: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages
      ]
    },

    {
      id: botMember.id,

      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages
      ]
    }
  ];


  for (
    const roleId
    of staffRoleIds
  ) {
    if (
      !guild.roles.cache.has(
        roleId
      )
    ) {
      continue;
    }

    overwrites.push({
      id: roleId,

      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory
      ],

      deny: [
        PermissionFlagsBits.SendMessages
      ]
    });
  }


  return overwrites;
}


async function publishGuide(
  guild,
  botMember,
  context
) {
  if (!guild) {
    throw new Error(
      "السيرفر غير موجود."
    );
  }


  const settings =
    context?.store
      ?.getGuild(guild.id) ||
    {};


  const gameSettings =
    settings.games || {};


  const staffRoleIds =
    Array.isArray(
      gameSettings.staffRoleIds
    )
      ? gameSettings.staffRoleIds
      : [];


  const permissions =
    buildPermissions(
      guild,
      botMember,
      staffRoleIds
    );


  let channel =
    guild.channels.cache.find(
      ch =>
        ch.name ===
          "bot-mod-guide" &&
        ch.type ===
          ChannelType.GuildText
    );


  if (!channel) {
    channel =
      await guild.channels.create({
        name: "bot-mod-guide",

        type:
          ChannelType.GuildText,

        permissionOverwrites:
          permissions
      });
  } else {
    await channel.permissionOverwrites
      .set(permissions)
      .catch(() => {});
  }


  // حذف النسخة القديمة من الدليل
  const old =
    await channel.messages
      .fetch({
        limit: 100
      })
      .catch(
        () => null
      );


  if (old) {
    const botMessages =
      old.filter(
        message =>
          message.author.id ===
          botMember.id
      );

    if (
      botMessages.size
    ) {
      await channel
        .bulkDelete(
          botMessages,
          true
        )
        .catch(
          () => {}
        );
    }
  }


  // =============================================
  // SETTINGS
  // =============================================

  const startFee =
    Number(
      gameSettings
        .multiplayerStartFee ??
      5
    );


  const staffReward =
    Number(
      gameSettings
        .staffWinReward ??
      10
    );


  const maxWins =
    Number(
      gameSettings
        .staffMaxRewardStreak ??
      3
    );


  const lossesToUnlock =
    Number(
      gameSettings
        .staffLossesToUnlock ??
      3
    );


  const questionCount =
    getQuestionCount();


  // =============================================
  // ALL REGISTERED / COMMANDS
  // =============================================

  const slashCommands =
    await getAllSlashCommands(
      guild
    );

  const slashChunks =
    splitCommandLines(
      slashCommands
    );


  // =============================================
  // EMBED 1 — COMMAND SYSTEM
  // =============================================

  const commandEmbed =
    new EmbedBuilder()

      .setTitle(
        "📘 دليل المشرفين — نظام الأوامر"
      )

      .setDescription(
        [
          "هذا الدليل يتحدث حسب إعدادات الداشبورد الحالية.",
          "",
          "🛡️ **كل أوامر `/` خاصة بالمشرفين.**",
          "👤 الأعضاء يستخدمون أوامر `!`.",
          "📍 كل أمر أو لعبة تعمل فقط في الروم المحدد لها.",
          "🚫 لا تستخدم أوامر الألعاب في الشات العام."
        ].join("\n")
      )

      .setColor(
        "#5865F2"
      )

      .addFields(
        {
          name:
            "🛡️ أوامر المشرفين /",

          value:
            slashCommands.length
              ? `تم العثور على **${slashCommands.length}** أمر Slash مسجل في البوت. القائمة الكاملة موجودة في الرسائل التالية.`
              : "⚠️ لم أستطع جلب أوامر Slash حاليًا."
        },

        {
          name:
            "👤 أوامر الأعضاء !",

          value:
            getMemberCommandLines(
              settings
            )
        },

        {
          name:
            "⚙️ مركز الأوامر",

          value:
            "من **Dashboard → مركز الأوامر** تقدر تغير اختصارات `!`، الرومات، ونوع كل لعبة. أوامر `/` تبقى للمشرفين."
        }
      );


  // =============================================
  // EMBED 2 — GAMES
  // =============================================

  const gameText =
    getGameLines(
      settings
    );


  // Discord field max = 1024
  // نقسم الألعاب لو صار النص طويل
  const gameChunks = [];

  let current = "";


  for (
    const block
    of gameText.split("\n\n")
  ) {
    const next =
      current
        ? current +
          "\n\n" +
          block
        : block;

    if (
      next.length > 950
    ) {
      gameChunks.push(
        current
      );

      current = block;
    } else {
      current = next;
    }
  }


  if (current) {
    gameChunks.push(
      current
    );
  }


  const gamesEmbed =
    new EmbedBuilder()

      .setTitle(
        "🎮 دليل الألعاب"
      )

      .setColor(
        "#57F287"
      )

      .setDescription(
        [
          "**اللعبة العامة:** العضو يستطيع تشغيلها بأمر `!`.",
          "**لعبة المشرفين:** المشرف فقط يستطيع تشغيلها.",
          "",
          "نفس اللعبة لا يمكن تشغيلها مرتين في نفس الوقت."
        ].join("\n")
      );


  gameChunks
    .slice(0, 20)
    .forEach(
      (chunk, index) => {

        gamesEmbed.addFields({
          name:
            index === 0
              ? "🎮 قائمة الألعاب"
              : `🎮 الألعاب — ${index + 1}`,

          value:
            chunk
        });

      }
    );


  // =============================================
  // EMBED 3 — CREDITS
  // =============================================

  const economyEmbed =
    new EmbedBuilder()

      .setTitle(
        "💳 Credits & Bet"
      )

      .setColor(
        "#FEE75C"
      )

      .addFields(
        {
          name:
            "🛡️ ألعاب المشرفين",

          value:
            [
              `🏆 مكافأة الفوز: **${staffReward} Credits**.`,
              `🔒 بعد **${maxWins} انتصارات متتالية** تتوقف مكافأة اللاعب.`,
              `🔓 يحتاج بعدها **${lossesToUnlock} خسارات** في ألعاب المشرفين حتى تفتح المكافأة من جديد.`,
              "لا يوجد Bet في لعبة المشرفين."
            ].join("\n")
        },

        {
          name:
            "👥 الألعاب العامة الجماعية",

          value:
            [
              `🎟️ صاحب أمر اللعبة يدفع **${startFee} Credits** لفتحها.`,
              "باقي المشاركين لا يدفعون رسوم الفتح.",
              "💳 الـBet يبقى منفصلًا.",
              "إذا تم وضع Bet، المشاركون يدفعون نفس القيمة.",
              "🏆 الفائز يأخذ Pot الخاص بالـBet.",
              "إذا ألغيت اللعبة قبل البداية، ترجع رسوم الفتح حسب نظام اللعبة."
            ].join("\n")
        },

        {
          name:
            "⭐ Credits من اللفلات",

          value:
            [
              "Level 10 → +1",
              "Level 20 → +1",
              "Level 30 → +1",
              "Level 40 → +1",
              "Level 50 → +1",
              "Level 75 → +1",
              "Level 100 → +1",
              "Level 200 / 300 / 400 / 500 → +2",
              "",
              "مكافآت اللفلات تتوقف إذا وصل الرصيد إلى 100+، لكن أرباح الألعاب يمكن أن ترفع الرصيد فوق 100."
            ].join("\n")
        }
      );


  // =============================================
  // EMBED 4 — OTHER SYSTEMS
  // =============================================

  const systemsEmbed =
    new EmbedBuilder()

      .setTitle(
        "🛠️ أنظمة البوت"
      )

      .setColor(
        "#EB459E"
      )

      .addFields(
        {
          name:
            "⭐ اللفلات",

          value:
            [
              "`/rank` للمشرفين و`!rank` للأعضاء.",
              "`/leaderboard` للمشرفين و`!top` للأعضاء.",
              "XP يُحسب من رسائل الأعضاء حسب إعدادات صفحة اللفلات."
            ].join("\n")
        },

        {
          name:
            "🧠 سؤال سريع",

          value:
            questionCount
              ? `بنك الأسئلة يحتوي حاليًا على **${questionCount} سؤالًا مرقمًا**. البوت يسحب رقمًا عشوائيًا ثم يعرض السؤال المرتبط به.`
              : "بنك الأسئلة غير متوفر حاليًا."
        },

        {
          name:
            "🎫 التكت",

          value:
            "من الداشبورد تقدر تحدد روم اللوحة، Category، رولات الإدارة، Transcript، نصوص الأزرار، الصورة ورسالة الترحيب ثم تنشر لوحة التكت."
        },

        {
          name:
            "💬 الرسائل",

          value:
            "من Message Center تقدر تنشر نص أو Embed، وتعدل أو تحذف رسائل البوت."
        },

        {
          name:
            "🎭 الرولات",

          value:
            "تعديل الاسم واللون وHoist وMentionable والصلاحيات، ونسخ Permissions من رول إلى عدة رولات."
        },

        {
          name:
            "🎨 ألوان الأعضاء",

          value:
            "تحدد روم لوحة الألوان وشكلها من الداشبورد، ثم تنشر اللوحة للأعضاء."
        },

        {
          name:
            "🎉 الفعاليات",

          value:
            "إنشاء إعلان/فعالية من الداشبورد مع عنوان، وصف، صورة، لون وFooter."
        },

        {
          name:
            "📘 تحديث هذا الدليل",

          value:
            "بعد تغيير الأوامر أو الألعاب أو الرومات، افتح **دليل المشرفين** في الداشبورد واضغط **تحديث دليل المشرفين**."
        }
      );


  // =============================================
  // SLASH COMMAND EMBEDS
  // =============================================

  const slashEmbeds = [];

  slashChunks.forEach(
    (chunk, index) => {

      slashEmbeds.push(
        new EmbedBuilder()
          .setTitle(
            index === 0
              ? "🛡️ جميع أوامر المشرفين /"
              : `🛡️ أوامر المشرفين / — ${index + 1}`
          )
          .setDescription(
            chunk
          )
          .setColor(
            "#ED4245"
          )
      );

    }
  );


  // =============================================
  // SEND
  // =============================================

  await channel.send({
    content:
      "🛡️ **دليل خاص بإدارة السيرفر**",

    embeds: [
      commandEmbed,
      ...slashEmbeds,
      gamesEmbed,
      economyEmbed,
      systemsEmbed
    ].slice(0, 10)
  });


  return channel;
}


module.exports = {
  publishGuide
};
