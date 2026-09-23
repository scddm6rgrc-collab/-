const {
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  UserSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  MessageFlags
} = require("discord.js");

const commandGate =
  require("../../core/commandGate");


const sessions = new Map();


const MEMBER_COMMANDS = [
  {
    key: "rank",
    name: "Rank",
    slash: "/rank",
    defaultAlias: "!rank"
  },
  {
    key: "leaderboard",
    name: "Leaderboard",
    slash: "/leaderboard",
    defaultAlias: "!top"
  },
  {
    key: "credits",
    name: "Credits",
    slash: "/credits",
    defaultAlias: "!credits"
  }
];


function getGames() {
  try {
    return require("../games/config").GAMES || [];
  } catch {
    return [];
  }
}


function sessionKey(interaction) {
  return `${interaction.guildId}:${interaction.user.id}`;
}


function getSession(interaction) {
  const key =
    sessionKey(interaction);

  if (!sessions.has(key)) {
    sessions.set(key, {
      section: "home",
      messageChannelId: "",
      roleId: "",
      targetRoleIds: [],
      userId: "",
      eventChannelId: "",
      selectedGameKey: "",
      selectedCommandKey: "rank",
      eventDraft: {}
    });
  }

  return sessions.get(key);
}


function cut(value, max = 1000) {
  return String(value || "")
    .slice(0, max);
}


function field(
  id,
  label,
  value = "",
  style = TextInputStyle.Short,
  required = false
) {
  const input =
    new TextInputBuilder()
      .setCustomId(id)
      .setLabel(
        cut(label, 45)
      )
      .setStyle(style)
      .setRequired(required);

  if (
    value !== undefined &&
    value !== null &&
    String(value).length
  ) {
    input.setValue(
      cut(
        value,
        style === TextInputStyle.Paragraph
          ? 4000
          : 1000
      )
    );
  }

  return new ActionRowBuilder()
    .addComponents(input);
}


function navRow(section = "") {
  return new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("adm:nav")
        .setPlaceholder(
          "اختر قسم من لوحة المشرف"
        )
        .addOptions([
          {
            label: "الرئيسية",
            value: "home",
            emoji: "🏠",
            default:
              section === "home"
          },
          {
            label: "التكت",
            value: "tickets",
            emoji: "🎫",
            default:
              section === "tickets"
          },
          {
            label: "الرسائل",
            value: "messages",
            emoji: "💬",
            default:
              section === "messages"
          },
          {
            label: "الرولات",
            value: "roles",
            emoji: "🎭",
            default:
              section === "roles"
          },
          {
            label: "الفعاليات",
            value: "events",
            emoji: "🎉",
            default:
              section === "events"
          },
          {
            label: "اللفلات",
            value: "levels",
            emoji: "⭐",
            default:
              section === "levels"
          },
          {
            label: "Credits & Bet",
            value: "credits",
            emoji: "💳",
            default:
              section === "credits"
          },
          {
            label: "الألعاب",
            value: "games",
            emoji: "🎮",
            default:
              section === "games"
          },
          {
            label: "أوامر الأعضاء",
            value: "commands",
            emoji: "⚡",
            default:
              section === "commands"
          },
          {
            label: "ألوان الأعضاء",
            value: "colors",
            emoji: "🎨",
            default:
              section === "colors"
          },
          {
            label: "دليل المشرفين",
            value: "guide",
            emoji: "📘",
            default:
              section === "guide"
          }
        ])
    );
}


function getGuildSettings(
  context,
  guildId
) {
  return (
    context.store
      .getGuild(guildId) ||
    {}
  );
}


function saveSection(
  context,
  interaction,
  section,
  value,
  action
) {
  context.store
    .setGuildSection(
      interaction.guildId,
      section,
      value
    );

  context.audit(
    interaction.guildId,
    interaction.user,
    action,
    value
  );
}


async function ensureStaff(
  interaction
) {
  if (
    await commandGate.isStaff(
      interaction
    )
  ) {
    return true;
  }

  const payload = {
    content:
      "❌ لوحة `/admin` خاصة بالمشرفين فقط.",
    flags:
      MessageFlags.Ephemeral
  };

  if (
    interaction.replied ||
    interaction.deferred
  ) {
    await interaction
      .followUp(payload)
      .catch(() => {});
  } else {
    await interaction
      .reply(payload)
      .catch(() => {});
  }

  return false;
}


function homePanel() {
  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(
          "🛡️ NATUS Admin Panel"
        )
        .setDescription(
          [
            "لوحة تحكم مصغرة داخل Discord.",
            "",
            "كل هذه الصفحة **خاصة بالمشرف الذي فتحها**.",
            "",
            "تقدر تدير البوت بدون الدخول للداشبورد من المتصفح.",
            "",
            "اختر القسم من القائمة بالأسفل."
          ].join("\n")
        )
        .setColor("#5865F2")
    ],

    components: [
      navRow("home")
    ]
  };
}


/* =======================================================
   TICKETS
======================================================= */

function ticketsPanel(
  context,
  interaction
) {
  const settings =
    context.services.tickets
      ?.resolveSettings(
        context.store,
        interaction.guildId
      ) ||
    getGuildSettings(
      context,
      interaction.guildId
    ).tickets ||
    {};

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(
          "🎫 إدارة التكت"
        )
        .setColor(
          settings.enabled === false
            ? "#ED4245"
            : "#57F287"
        )
        .setDescription(
          [
            `الحالة: **${settings.enabled === false ? "متوقف" : "شغال"}**`,
            `روم اللوحة: ${settings.panelChannelId ? `<#${settings.panelChannelId}>` : "غير محدد"}`,
            `Category: ${settings.categoryId ? `<#${settings.categoryId}>` : "غير محدد"}`,
            `Transcript: ${settings.transcriptChannelId ? `<#${settings.transcriptChannelId}>` : "غير محدد"}`,
            `رولات الإدارة: ${(settings.staffRoleIds || []).length}`
          ].join("\n")
        )
    ],

    components: [
      navRow("tickets"),

      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(
              "adm:t:toggle"
            )
            .setLabel(
              settings.enabled === false
                ? "تشغيل"
                : "إيقاف"
            )
            .setStyle(
              settings.enabled === false
                ? ButtonStyle.Success
                : ButtonStyle.Danger
            ),

          new ButtonBuilder()
            .setCustomId(
              "adm:t:publish"
            )
            .setLabel(
              "نشر لوحة التكت"
            )
            .setEmoji("📨")
            .setStyle(
              ButtonStyle.Primary
            ),

          new ButtonBuilder()
            .setCustomId(
              "adm:t:text"
            )
            .setLabel(
              "النصوص"
            )
            .setStyle(
              ButtonStyle.Secondary
            ),

          new ButtonBuilder()
            .setCustomId(
              "adm:t:advanced"
            )
            .setLabel(
              "إعدادات إضافية"
            )
            .setStyle(
              ButtonStyle.Secondary
            )
        ),

      new ActionRowBuilder()
        .addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId(
              "adm:t:panelChannel"
            )
            .setPlaceholder(
              "روم لوحة التكت"
            )
            .setChannelTypes(
              ChannelType.GuildText,
              ChannelType.GuildAnnouncement
            )
        ),

      new ActionRowBuilder()
        .addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId(
              "adm:t:category"
            )
            .setPlaceholder(
              "Category التكت"
            )
            .setChannelTypes(
              ChannelType.GuildCategory
            )
        ),

      new ActionRowBuilder()
        .addComponents(
          new RoleSelectMenuBuilder()
            .setCustomId(
              "adm:t:staff"
            )
            .setPlaceholder(
              "رولات إدارة التكت"
            )
            .setMinValues(0)
            .setMaxValues(10)
        )
    ]
  };
}


/* =======================================================
   MESSAGES
======================================================= */

function messagesPanel(
  interaction
) {
  const state =
    getSession(interaction);

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(
          "💬 إدارة رسائل البوت"
        )
        .setDescription(
          [
            `الروم المحدد: ${state.messageChannelId ? `<#${state.messageChannelId}>` : "غير محدد"}`,
            "",
            "تقدر تنشر رسالة أو Embed، تعدل رسالة للبوت، أو تحذفها."
          ].join("\n")
        )
        .setColor("#5865F2")
    ],

    components: [
      navRow("messages"),

      new ActionRowBuilder()
        .addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId(
              "adm:m:channel"
            )
            .setPlaceholder(
              "اختر روم الرسائل"
            )
            .setChannelTypes(
              ChannelType.GuildText,
              ChannelType.GuildAnnouncement
            )
        ),

      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(
              "adm:m:send"
            )
            .setLabel(
              "إرسال رسالة"
            )
            .setEmoji("📨")
            .setStyle(
              ButtonStyle.Success
            ),

          new ButtonBuilder()
            .setCustomId(
              "adm:m:edit"
            )
            .setLabel(
              "تعديل رسالة"
            )
            .setStyle(
              ButtonStyle.Primary
            ),

          new ButtonBuilder()
            .setCustomId(
              "adm:m:delete"
            )
            .setLabel(
              "حذف رسالة"
            )
            .setStyle(
              ButtonStyle.Danger
            )
        )
    ]
  };
}


/* =======================================================
   ROLES
======================================================= */

function rolesPanel(
  interaction
) {
  const state =
    getSession(interaction);

  const role =
    state.roleId
      ? interaction.guild.roles.cache.get(
          state.roleId
        )
      : null;

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(
          "🎭 إدارة الرولات"
        )
        .setDescription(
          role
            ? [
                `الرول: ${role}`,
                `الاسم: **${role.name}**`,
                `اللون: **${role.hexColor}**`,
                `Hoist: **${role.hoist ? "نعم" : "لا"}**`,
                `Mentionable: **${role.mentionable ? "نعم" : "لا"}**`
              ].join("\n")
            : "اختر رول للتعديل."
        )
        .setColor(
          role?.hexColor &&
          role.hexColor !== "#000000"
            ? role.hexColor
            : "#5865F2"
        )
    ],

    components: [
      navRow("roles"),

      new ActionRowBuilder()
        .addComponents(
          new RoleSelectMenuBuilder()
            .setCustomId(
              "adm:r:role"
            )
            .setPlaceholder(
              "اختر الرول"
            )
            .setMinValues(1)
            .setMaxValues(1)
        ),

      new ActionRowBuilder()
        .addComponents(
          new RoleSelectMenuBuilder()
            .setCustomId(
              "adm:r:targets"
            )
            .setPlaceholder(
              "رولات هدف لنسخ الصلاحيات"
            )
            .setMinValues(0)
            .setMaxValues(10)
        ),

      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(
              "adm:r:edit"
            )
            .setLabel(
              "تعديل الرول"
            )
            .setStyle(
              ButtonStyle.Primary
            ),

          new ButtonBuilder()
            .setCustomId(
              "adm:r:permissions"
            )
            .setLabel(
              "الصلاحيات"
            )
            .setStyle(
              ButtonStyle.Secondary
            ),

          new ButtonBuilder()
            .setCustomId(
              "adm:r:clone"
            )
            .setLabel(
              "نسخ Permissions"
            )
            .setStyle(
              ButtonStyle.Success
            )
        )
    ]
  };
}


/* =======================================================
   EVENTS
======================================================= */

function eventsPanel(
  interaction
) {
  const state =
    getSession(interaction);

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(
          "🎉 الفعاليات"
        )
        .setDescription(
          [
            `الروم: ${state.eventChannelId ? `<#${state.eventChannelId}>` : "غير محدد"}`,
            "",
            "جهز محتوى الفعالية ثم اضغط نشر."
          ].join("\n")
        )
        .setColor("#FEE75C")
    ],

    components: [
      navRow("events"),

      new ActionRowBuilder()
        .addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId(
              "adm:e:channel"
            )
            .setPlaceholder(
              "اختر روم الفعالية"
            )
            .setChannelTypes(
              ChannelType.GuildText,
              ChannelType.GuildAnnouncement
            )
        ),

      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(
              "adm:e:basic"
            )
            .setLabel(
              "المحتوى الأساسي"
            )
            .setStyle(
              ButtonStyle.Primary
            ),

          new ButtonBuilder()
            .setCustomId(
              "adm:e:extra"
            )
            .setLabel(
              "تفاصيل إضافية"
            )
            .setStyle(
              ButtonStyle.Secondary
            ),

          new ButtonBuilder()
            .setCustomId(
              "adm:e:publish"
            )
            .setLabel(
              "نشر الآن"
            )
            .setEmoji("🎉")
            .setStyle(
              ButtonStyle.Success
            )
        )
    ]
  };
}


/* =======================================================
   LEVELS
======================================================= */

function levelsPanel(
  context,
  interaction
) {
  const state =
    getSession(interaction);

  let userText =
    "اختر عضو.";

  if (
    state.userId &&
    context.services.levels
  ) {
    const stats =
      context.services.levels
        .getUser(
          interaction.guildId,
          state.userId
        );

    const progress =
      context.services.levels
        .progress(
          stats.xp || 0
        );

    userText = [
      `العضو: <@${state.userId}>`,
      `Level: **${progress.level}**`,
      `XP: **${stats.xp || 0}**`,
      `Messages: **${stats.messages || 0}**`
    ].join("\n");
  }

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(
          "⭐ إدارة اللفلات"
        )
        .setDescription(
          userText
        )
        .setColor("#FEE75C")
    ],

    components: [
      navRow("levels"),

      new ActionRowBuilder()
        .addComponents(
          new UserSelectMenuBuilder()
            .setCustomId(
              "adm:l:user"
            )
            .setPlaceholder(
              "اختر العضو"
            )
            .setMinValues(1)
            .setMaxValues(1)
        ),

      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(
              "adm:l:add"
            )
            .setLabel("+ XP")
            .setStyle(
              ButtonStyle.Success
            ),

          new ButtonBuilder()
            .setCustomId(
              "adm:l:remove"
            )
            .setLabel("- XP")
            .setStyle(
              ButtonStyle.Danger
            ),

          new ButtonBuilder()
            .setCustomId(
              "adm:l:set"
            )
            .setLabel("Set XP")
            .setStyle(
              ButtonStyle.Primary
            ),

          new ButtonBuilder()
            .setCustomId(
              "adm:l:reset"
            )
            .setLabel("Reset XP")
            .setStyle(
              ButtonStyle.Secondary
            )
        ),

      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(
              "adm:l:settings"
            )
            .setLabel(
              "إعدادات XP"
            )
            .setStyle(
              ButtonStyle.Primary
            ),

          new ButtonBuilder()
            .setCustomId(
              "adm:l:theme"
            )
            .setLabel(
              "شكل Rank"
            )
            .setStyle(
              ButtonStyle.Secondary
            )
        )
    ]
  };
}


/* =======================================================
   CREDITS
======================================================= */

function creditsPanel(
  context,
  interaction
) {
  const state =
    getSession(interaction);

  let balanceText =
    "اختر عضو.";

  if (
    state.userId &&
    context.services.credits
  ) {
    const balance =
      context.services.credits
        .getBalance(
          interaction.guildId,
          state.userId
        );

    balanceText =
      `<@${state.userId}> لديه **${balance} Credits**`;
  }

  const betting =
    getGuildSettings(
      context,
      interaction.guildId
    ).betting || {};

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(
          "💳 Credits & Bet"
        )
        .setDescription(
          [
            balanceText,
            "",
            `Min Bet: **${betting.minBet ?? 1}**`,
            `Max Bet: **${betting.maxBet ?? 25}**`
          ].join("\n")
        )
        .setColor("#57F287")
    ],

    components: [
      navRow("credits"),

      new ActionRowBuilder()
        .addComponents(
          new UserSelectMenuBuilder()
            .setCustomId(
              "adm:c:user"
            )
            .setPlaceholder(
              "اختر العضو"
            )
            .setMinValues(1)
            .setMaxValues(1)
        ),

      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(
              "adm:c:add"
            )
            .setLabel("+ Credits")
            .setStyle(
              ButtonStyle.Success
            ),

          new ButtonBuilder()
            .setCustomId(
              "adm:c:remove"
            )
            .setLabel("- Credits")
            .setStyle(
              ButtonStyle.Danger
            ),

          new ButtonBuilder()
            .setCustomId(
              "adm:c:set"
            )
            .setLabel("Set")
            .setStyle(
              ButtonStyle.Primary
            ),

          new ButtonBuilder()
            .setCustomId(
              "adm:c:reset"
            )
            .setLabel("Reset")
            .setStyle(
              ButtonStyle.Secondary
            ),

          new ButtonBuilder()
            .setCustomId(
              "adm:c:bet"
            )
            .setLabel(
              "Bet Settings"
            )
            .setStyle(
              ButtonStyle.Secondary
            )
        )
    ]
  };
}


/* =======================================================
   GAMES
======================================================= */

function gamesPanel(
  context,
  interaction
) {
  const state =
    getSession(interaction);

  const games =
    getGames();

  if (
    !state.selectedGameKey &&
    games.length
  ) {
    state.selectedGameKey =
      games[0].key;
  }

  const game =
    games.find(
      item =>
        item.key ===
        state.selectedGameKey
    );

  const settings =
    getGuildSettings(
      context,
      interaction.guildId
    ).games || {};

  const mode =
    game
      ? (
          settings.modes
            ?.[game.key] ||
          game.defaultMode ||
          "public"
        )
      : "";

  const alias =
    game
      ? (
          settings.aliases
            ?.[game.key] ||
          game.defaultAlias ||
          `!${game.command}`
        )
      : "";

  const room =
    game
      ? settings.rooms
          ?.[game.key]
      : "";

  const select =
    new StringSelectMenuBuilder()
      .setCustomId(
        "adm:g:game"
      )
      .setPlaceholder(
        "اختر اللعبة"
      );

  if (games.length) {
    select.addOptions(
      games
        .slice(0, 25)
        .map(
          item => ({
            label:
              cut(
                item.name,
                100
              ),
            value:
              item.key,
            emoji:
              item.emoji || "🎮",
            default:
              item.key ===
              state.selectedGameKey
          })
        )
    );
  }

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(
          "🎮 إدارة الألعاب"
        )
        .setDescription(
          game
            ? [
                `${game.emoji || "🎮"} **${game.name}**`,
                `Slash: **/${game.command}**`,
                `Member: **${alias}**`,
                `نوعها: **${mode === "staff" ? "مشرفين" : "عامة"}**`,
                `الروم: ${room ? `<#${room}>` : "غير محدد"}`
              ].join("\n")
            : "لا توجد ألعاب."
        )
        .setColor("#5865F2")
    ],

    components: [
      navRow("games"),

      new ActionRowBuilder()
        .addComponents(select),

      new ActionRowBuilder()
        .addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId(
              "adm:g:room"
            )
            .setPlaceholder(
              "حدد روم اللعبة"
            )
            .setChannelTypes(
              ChannelType.GuildText,
              ChannelType.GuildAnnouncement
            )
        ),

      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(
              "adm:g:mode"
            )
            .setLabel(
              mode === "staff"
                ? "حولها عامة"
                : "حولها للمشرفين"
            )
            .setStyle(
              mode === "staff"
                ? ButtonStyle.Success
                : ButtonStyle.Danger
            ),

          new ButtonBuilder()
            .setCustomId(
              "adm:g:alias"
            )
            .setLabel(
              "تغيير !"
            )
            .setStyle(
              ButtonStyle.Primary
            ),

          new ButtonBuilder()
            .setCustomId(
              "adm:g:rules"
            )
            .setLabel(
              "قواعد Credits"
            )
            .setStyle(
              ButtonStyle.Secondary
            )
        )
    ]
  };
}


/* =======================================================
   MEMBER COMMANDS
======================================================= */

function commandsPanel(
  context,
  interaction
) {
  const state =
    getSession(interaction);

  const settings =
    getGuildSettings(
      context,
      interaction.guildId
    ).memberCommands || {};

  const command =
    MEMBER_COMMANDS.find(
      item =>
        item.key ===
        state.selectedCommandKey
    ) ||
    MEMBER_COMMANDS[0];

  const alias =
    settings.aliases
      ?.[command.key] ||
    command.defaultAlias;

  const room =
    settings.rooms
      ?.[command.key];

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(
          "⚡ أوامر الأعضاء"
        )
        .setDescription(
          [
            `الأمر: **${command.slash}**`,
            `اختصار العضو: **${alias}**`,
            `الروم: ${room ? `<#${room}>` : "غير محدد"}`,
            "",
            "`/` للمشرفين، و`!` للأعضاء."
          ].join("\n")
        )
        .setColor("#5865F2")
    ],

    components: [
      navRow("commands"),

      new ActionRowBuilder()
        .addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(
              "adm:cmd:select"
            )
            .setPlaceholder(
              "اختر الأمر"
            )
            .addOptions(
              MEMBER_COMMANDS.map(
                item => ({
                  label:
                    item.name,
                  value:
                    item.key,
                  description:
                    `${item.slash} / ${item.defaultAlias}`,
                  default:
                    item.key ===
                    command.key
                })
              )
            )
        ),

      new ActionRowBuilder()
        .addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId(
              "adm:cmd:room"
            )
            .setPlaceholder(
              "حدد روم الأمر"
            )
            .setChannelTypes(
              ChannelType.GuildText,
              ChannelType.GuildAnnouncement
            )
        ),

      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(
              "adm:cmd:alias"
            )
            .setLabel(
              "تغيير اختصار !"
            )
            .setStyle(
              ButtonStyle.Primary
            )
        )
    ]
  };
}


/* =======================================================
   COLORS
======================================================= */

function colorsPanel(
  context,
  interaction
) {
  const settings =
    getGuildSettings(
      context,
      interaction.guildId
    ).colorRoles || {};

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(
          "🎨 ألوان الأعضاء"
        )
        .setDescription(
          [
            `الروم: ${settings.channelId ? `<#${settings.channelId}>` : "غير محدد"}`,
            `العنوان: **${settings.title || "🎨 اختر لون اسمك"}**`,
            `زر اللوحة: **${settings.buttonLabel || "اختر لونك"}**`
          ].join("\n")
        )
        .setColor(
          settings.embedColor ||
          "#5865F2"
        )
    ],

    components: [
      navRow("colors"),

      new ActionRowBuilder()
        .addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId(
              "adm:color:room"
            )
            .setPlaceholder(
              "حدد روم الألوان"
            )
            .setChannelTypes(
              ChannelType.GuildText,
              ChannelType.GuildAnnouncement
            )
        ),

      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(
              "adm:color:edit"
            )
            .setLabel(
              "تعديل اللوحة"
            )
            .setStyle(
              ButtonStyle.Primary
            ),

          new ButtonBuilder()
            .setCustomId(
              "adm:color:publish"
            )
            .setLabel(
              "نشر لوحة الألوان"
            )
            .setStyle(
              ButtonStyle.Success
            )
        )
    ]
  };
}


/* =======================================================
   GUIDE
======================================================= */

function guidePanel() {
  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(
          "📘 دليل المشرفين"
        )
        .setDescription(
          "يعيد بناء `bot-mod-guide` ويضع أحدث الأوامر والإعدادات."
        )
        .setColor("#5865F2")
    ],

    components: [
      navRow("guide"),

      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(
              "adm:guide:update"
            )
            .setLabel(
              "تحديث الدليل الآن"
            )
            .setEmoji("📘")
            .setStyle(
              ButtonStyle.Success
            )
        )
    ]
  };
}


function renderSection(
  context,
  interaction,
  section
) {
  switch (section) {
    case "tickets":
      return ticketsPanel(
        context,
        interaction
      );

    case "messages":
      return messagesPanel(
        interaction
      );

    case "roles":
      return rolesPanel(
        interaction
      );

    case "events":
      return eventsPanel(
        interaction
      );

    case "levels":
      return levelsPanel(
        context,
        interaction
      );

    case "credits":
      return creditsPanel(
        context,
        interaction
      );

    case "games":
      return gamesPanel(
        context,
        interaction
      );

    case "commands":
      return commandsPanel(
        context,
        interaction
      );

    case "colors":
      return colorsPanel(
        context,
        interaction
      );

    case "guide":
      return guidePanel();

    default:
      return homePanel();
  }
}


async function refresh(
  context,
  interaction,
  section
) {
  const state =
    getSession(interaction);

  state.section =
    section ||
    state.section ||
    "home";

  return interaction.update(
    renderSection(
      context,
      interaction,
      state.section
    )
  );
}


function amountModal(
  customId,
  title
) {
  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(title)
    .addComponents(
      field(
        "amount",
        "القيمة",
        "",
        TextInputStyle.Short,
        true
      )
    );
}


module.exports = {
  name: "staffPanel",

  async setup(
    client,
    context
  ) {

    /* ===================================================
       REGISTER /admin
    =================================================== */

    client.once(
      Events.ClientReady,

      async readyClient => {

        const existing =
          await readyClient
            .application
            .commands
            .fetch();

        const current =
          existing.find(
            command =>
              command.name ===
              "admin"
          );

        const definition = {
          name: "admin",
          description:
            "فتح لوحة التحكم المصغرة للمشرفين"
        };

        if (current) {
          await current.edit(
            definition
          );
        } else {
          await readyClient
            .application
            .commands
            .create(
              definition
            );
        }

        console.log(
          "✅ /admin global command registered"
        );

        // تسجيل /admin داخل كل سيرفر فورًا
        // Guild commands تظهر مباشرة بدون انتظار Discord global sync
        for (const guild of readyClient.guilds.cache.values()) {
          try {
            const guildCommands =
              await guild.commands.fetch();

            const existingAdmin =
              guildCommands.find(
                command =>
                  command.name === "admin"
              );

            const adminDefinition = {
              name: "admin",
              description:
                "فتح لوحة التحكم المصغرة للمشرفين"
            };

            if (existingAdmin) {
              await existingAdmin.edit(
                adminDefinition
              );
            } else {
              await guild.commands.create(
                adminDefinition
              );
            }

            console.log(
              `✅ /admin registered in ${guild.name}`
            );

          } catch (error) {
            console.error(
              `❌ /admin register failed in ${guild.name}:`,
              error.message
            );
          }
        }
      }
    );


    client.on(
      Events.InteractionCreate,

      async interaction => {

        try {

          /* =================================================
             /admin
          ================================================= */

          if (
            interaction.isChatInputCommand() &&
            interaction.commandName ===
              "admin"
          ) {

            if (
              !(await ensureStaff(
                interaction
              ))
            ) {
              return;
            }

            sessions.set(
              sessionKey(
                interaction
              ),
              {
                section: "home",
                messageChannelId: "",
                roleId: "",
                targetRoleIds: [],
                userId: "",
                eventChannelId: "",
                selectedGameKey: "",
                selectedCommandKey:
                  "rank",
                eventDraft: {}
              }
            );

            return interaction.reply({
              ...homePanel(),

              flags:
                MessageFlags.Ephemeral
            });
          }


          if (
            !interaction.customId
              ?.startsWith(
                "adm:"
              )
          ) {
            return;
          }


          if (
            !(await ensureStaff(
              interaction
            ))
          ) {
            return;
          }


          const state =
            getSession(
              interaction
            );


          /* =================================================
             NAVIGATION
          ================================================= */

          if (
            interaction.isStringSelectMenu() &&
            interaction.customId ===
              "adm:nav"
          ) {
            state.section =
              interaction.values[0];

            return refresh(
              context,
              interaction,
              state.section
            );
          }


          /* =================================================
             TICKET SELECTS
          ================================================= */

          if (
            interaction.customId ===
              "adm:t:panelChannel"
          ) {
            const current =
              context.services.tickets
                .resolveSettings(
                  context.store,
                  interaction.guildId
                );

            current.panelChannelId =
              interaction.values[0];

            saveSection(
              context,
              interaction,
              "tickets",
              current,
              "admin.ticket.panelChannel"
            );

            return refresh(
              context,
              interaction,
              "tickets"
            );
          }


          if (
            interaction.customId ===
              "adm:t:category"
          ) {
            const current =
              context.services.tickets
                .resolveSettings(
                  context.store,
                  interaction.guildId
                );

            current.categoryId =
              interaction.values[0];

            saveSection(
              context,
              interaction,
              "tickets",
              current,
              "admin.ticket.category"
            );

            return refresh(
              context,
              interaction,
              "tickets"
            );
          }


          if (
            interaction.customId ===
              "adm:t:staff"
          ) {
            const current =
              context.services.tickets
                .resolveSettings(
                  context.store,
                  interaction.guildId
                );

            current.staffRoleIds =
              [...interaction.values];

            saveSection(
              context,
              interaction,
              "tickets",
              current,
              "admin.ticket.staffRoles"
            );

            return refresh(
              context,
              interaction,
              "tickets"
            );
          }


          /* =================================================
             MESSAGE CHANNEL
          ================================================= */

          if (
            interaction.customId ===
              "adm:m:channel"
          ) {
            state.messageChannelId =
              interaction.values[0];

            return refresh(
              context,
              interaction,
              "messages"
            );
          }


          /* =================================================
             ROLE SELECTS
          ================================================= */

          if (
            interaction.customId ===
              "adm:r:role"
          ) {
            state.roleId =
              interaction.values[0];

            return refresh(
              context,
              interaction,
              "roles"
            );
          }


          if (
            interaction.customId ===
              "adm:r:targets"
          ) {
            state.targetRoleIds =
              [...interaction.values];

            return refresh(
              context,
              interaction,
              "roles"
            );
          }


          /* =================================================
             EVENT CHANNEL
          ================================================= */

          if (
            interaction.customId ===
              "adm:e:channel"
          ) {
            state.eventChannelId =
              interaction.values[0];

            return refresh(
              context,
              interaction,
              "events"
            );
          }


          /* =================================================
             USER
          ================================================= */

          if (
            interaction.customId ===
              "adm:l:user" ||
            interaction.customId ===
              "adm:c:user"
          ) {
            state.userId =
              interaction.values[0];

            return refresh(
              context,
              interaction,
              interaction.customId ===
                "adm:l:user"
                ? "levels"
                : "credits"
            );
          }


          /* =================================================
             GAME
          ================================================= */

          if (
            interaction.customId ===
              "adm:g:game"
          ) {
            state.selectedGameKey =
              interaction.values[0];

            return refresh(
              context,
              interaction,
              "games"
            );
          }


          if (
            interaction.customId ===
              "adm:g:room"
          ) {
            const current =
              getGuildSettings(
                context,
                interaction.guildId
              ).games || {};

            current.rooms ||= {};

            current.rooms[
              state.selectedGameKey
            ] =
              interaction.values[0];

            saveSection(
              context,
              interaction,
              "games",
              current,
              "admin.game.room"
            );

            return refresh(
              context,
              interaction,
              "games"
            );
          }


          /* =================================================
             MEMBER COMMAND
          ================================================= */

          if (
            interaction.customId ===
              "adm:cmd:select"
          ) {
            state.selectedCommandKey =
              interaction.values[0];

            return refresh(
              context,
              interaction,
              "commands"
            );
          }


          if (
            interaction.customId ===
              "adm:cmd:room"
          ) {
            const current =
              getGuildSettings(
                context,
                interaction.guildId
              ).memberCommands || {};

            current.rooms ||= {};

            current.rooms[
              state.selectedCommandKey
            ] =
              interaction.values[0];

            saveSection(
              context,
              interaction,
              "memberCommands",
              current,
              "admin.command.room"
            );

            return refresh(
              context,
              interaction,
              "commands"
            );
          }


          /* =================================================
             COLOR ROOM
          ================================================= */

          if (
            interaction.customId ===
              "adm:color:room"
          ) {
            const current =
              getGuildSettings(
                context,
                interaction.guildId
              ).colorRoles || {};

            current.channelId =
              interaction.values[0];

            saveSection(
              context,
              interaction,
              "colorRoles",
              current,
              "admin.colors.room"
            );

            return refresh(
              context,
              interaction,
              "colors"
            );
          }


          /* =================================================
             BUTTONS
          ================================================= */

          if (!interaction.isButton()) {
            // modal handler below
          } else {

            /* TICKETS */

            if (
              interaction.customId ===
                "adm:t:toggle"
            ) {
              const current =
                context.services.tickets
                  .resolveSettings(
                    context.store,
                    interaction.guildId
                  );

              current.enabled =
                !current.enabled;

              saveSection(
                context,
                interaction,
                "tickets",
                current,
                "admin.ticket.toggle"
              );

              return refresh(
                context,
                interaction,
                "tickets"
              );
            }


            if (
              interaction.customId ===
                "adm:t:publish"
            ) {
              await context.services
                .tickets
                .publishPanel(
                  interaction.guild,
                  context.store
                );

              context.audit(
                interaction.guildId,
                interaction.user,
                "admin.ticket.publish"
              );

              return interaction.reply({
                content:
                  "✅ تم نشر لوحة التكت.",
                flags:
                  MessageFlags.Ephemeral
              });
            }


            if (
              interaction.customId ===
                "adm:t:text"
            ) {
              const t =
                context.services.tickets
                  .resolveSettings(
                    context.store,
                    interaction.guildId
                  );

              return interaction.showModal(
                new ModalBuilder()
                  .setCustomId(
                    "adm:modal:t:text"
                  )
                  .setTitle(
                    "نصوص التكت"
                  )
                  .addComponents(
                    field(
                      "title",
                      "عنوان اللوحة",
                      t.panelTitle,
                      TextInputStyle.Short,
                      true
                    ),
                    field(
                      "description",
                      "وصف اللوحة",
                      t.panelDescription,
                      TextInputStyle.Paragraph,
                      true
                    ),
                    field(
                      "button",
                      "نص زر الفتح",
                      t.buttonLabel,
                      TextInputStyle.Short,
                      true
                    ),
                    field(
                      "welcome",
                      "رسالة داخل التكت",
                      t.welcomeMessage,
                      TextInputStyle.Paragraph,
                      true
                    ),
                    field(
                      "close",
                      "نص زر الإغلاق",
                      t.closeLabel,
                      TextInputStyle.Short,
                      true
                    )
                  )
              );
            }


            if (
              interaction.customId ===
                "adm:t:advanced"
            ) {
              const t =
                context.services.tickets
                  .resolveSettings(
                    context.store,
                    interaction.guildId
                  );

              return interaction.showModal(
                new ModalBuilder()
                  .setCustomId(
                    "adm:modal:t:advanced"
                  )
                  .setTitle(
                    "إعدادات التكت"
                  )
                  .addComponents(
                    field(
                      "color",
                      "لون Embed",
                      t.panelColor ||
                        "#5865F2"
                    ),
                    field(
                      "image",
                      "رابط الصورة",
                      t.panelImage || ""
                    ),
                    field(
                      "openEmoji",
                      "إيموجي الفتح",
                      t.buttonEmoji || "🎫"
                    ),
                    field(
                      "closeEmoji",
                      "إيموجي الإغلاق",
                      t.closeEmoji || "🔒"
                    ),
                    field(
                      "pattern",
                      "اسم التكت",
                      t.ticketNamePattern ||
                        "ticket-{user}"
                    )
                  )
              );
            }


            /* MESSAGES */

            if (
              [
                "adm:m:send",
                "adm:m:edit",
                "adm:m:delete"
              ].includes(
                interaction.customId
              ) &&
              !state.messageChannelId
            ) {
              return interaction.reply({
                content:
                  "❌ اختر الروم أولًا.",
                flags:
                  MessageFlags.Ephemeral
              });
            }


            if (
              interaction.customId ===
                "adm:m:send"
            ) {
              return interaction.showModal(
                new ModalBuilder()
                  .setCustomId(
                    "adm:modal:m:send"
                  )
                  .setTitle(
                    "إرسال رسالة"
                  )
                  .addComponents(
                    field(
                      "content",
                      "النص العادي",
                      "",
                      TextInputStyle.Paragraph
                    ),
                    field(
                      "title",
                      "عنوان Embed"
                    ),
                    field(
                      "description",
                      "وصف Embed",
                      "",
                      TextInputStyle.Paragraph
                    ),
                    field(
                      "image",
                      "رابط الصورة"
                    ),
                    field(
                      "color",
                      "لون Embed",
                      "#5865F2"
                    )
                  )
              );
            }


            if (
              interaction.customId ===
                "adm:m:edit"
            ) {
              return interaction.showModal(
                new ModalBuilder()
                  .setCustomId(
                    "adm:modal:m:edit"
                  )
                  .setTitle(
                    "تعديل رسالة للبوت"
                  )
                  .addComponents(
                    field(
                      "messageId",
                      "Message ID",
                      "",
                      TextInputStyle.Short,
                      true
                    ),
                    field(
                      "content",
                      "النص الجديد",
                      "",
                      TextInputStyle.Paragraph
                    ),
                    field(
                      "title",
                      "عنوان Embed"
                    ),
                    field(
                      "description",
                      "وصف Embed",
                      "",
                      TextInputStyle.Paragraph
                    )
                  )
              );
            }


            if (
              interaction.customId ===
                "adm:m:delete"
            ) {
              return interaction.showModal(
                new ModalBuilder()
                  .setCustomId(
                    "adm:modal:m:delete"
                  )
                  .setTitle(
                    "حذف رسالة للبوت"
                  )
                  .addComponents(
                    field(
                      "messageId",
                      "Message ID",
                      "",
                      TextInputStyle.Short,
                      true
                    )
                  )
              );
            }


            /* ROLES */

            if (
              [
                "adm:r:edit",
                "adm:r:permissions",
                "adm:r:clone"
              ].includes(
                interaction.customId
              ) &&
              !state.roleId
            ) {
              return interaction.reply({
                content:
                  "❌ اختر رول أولًا.",
                flags:
                  MessageFlags.Ephemeral
              });
            }


            if (
              interaction.customId ===
                "adm:r:edit"
            ) {
              const role =
                interaction.guild.roles
                  .cache.get(
                    state.roleId
                  );

              if (!role) return;

              return interaction.showModal(
                new ModalBuilder()
                  .setCustomId(
                    "adm:modal:r:edit"
                  )
                  .setTitle(
                    "تعديل الرول"
                  )
                  .addComponents(
                    field(
                      "name",
                      "اسم الرول",
                      role.name,
                      TextInputStyle.Short,
                      true
                    ),
                    field(
                      "color",
                      "اللون HEX",
                      role.hexColor
                    ),
                    field(
                      "hoist",
                      "Hoist true / false",
                      String(role.hoist)
                    ),
                    field(
                      "mentionable",
                      "Mentionable true / false",
                      String(
                        role.mentionable
                      )
                    )
                  )
              );
            }


            if (
              interaction.customId ===
                "adm:r:permissions"
            ) {
              const role =
                interaction.guild.roles
                  .cache.get(
                    state.roleId
                  );

              return interaction.showModal(
                new ModalBuilder()
                  .setCustomId(
                    "adm:modal:r:permissions"
                  )
                  .setTitle(
                    "Permissions"
                  )
                  .addComponents(
                    field(
                      "permissions",
                      "Permission names مفصولة بفاصلة",
                      role.permissions
                        .toArray()
                        .join(", "),
                      TextInputStyle.Paragraph,
                      false
                    )
                  )
              );
            }


            if (
              interaction.customId ===
                "adm:r:clone"
            ) {
              if (
                !state.targetRoleIds.length
              ) {
                return interaction.reply({
                  content:
                    "❌ اختر الرولات الهدف.",
                  flags:
                    MessageFlags.Ephemeral
                });
              }

              await context.services.roles
                .clonePermissions(
                  interaction.guild,
                  state.roleId,
                  state.targetRoleIds
                );

              context.audit(
                interaction.guildId,
                interaction.user,
                "admin.role.clone",
                {
                  source:
                    state.roleId,
                  targets:
                    state.targetRoleIds
                }
              );

              return interaction.reply({
                content:
                  "✅ تم نسخ الصلاحيات.",
                flags:
                  MessageFlags.Ephemeral
              });
            }


            /* EVENTS */

            if (
              interaction.customId ===
                "adm:e:basic"
            ) {
              const d =
                state.eventDraft;

              return interaction.showModal(
                new ModalBuilder()
                  .setCustomId(
                    "adm:modal:e:basic"
                  )
                  .setTitle(
                    "محتوى الفعالية"
                  )
                  .addComponents(
                    field(
                      "content",
                      "نص فوق Embed",
                      d.content || "",
                      TextInputStyle.Paragraph
                    ),
                    field(
                      "title",
                      "العنوان",
                      d.title || ""
                    ),
                    field(
                      "description",
                      "الوصف",
                      d.description || "",
                      TextInputStyle.Paragraph
                    ),
                    field(
                      "image",
                      "رابط الصورة",
                      d.image || ""
                    ),
                    field(
                      "color",
                      "لون Embed",
                      d.color || "#5865F2"
                    )
                  )
              );
            }


            if (
              interaction.customId ===
                "adm:e:extra"
            ) {
              const d =
                state.eventDraft;

              return interaction.showModal(
                new ModalBuilder()
                  .setCustomId(
                    "adm:modal:e:extra"
                  )
                  .setTitle(
                    "تفاصيل الفعالية"
                  )
                  .addComponents(
                    field(
                      "subtitle",
                      "العنوان الفرعي",
                      d.subtitle || ""
                    ),
                    field(
                      "subtext",
                      "النص تحت العنوان",
                      d.subtext || "",
                      TextInputStyle.Paragraph
                    ),
                    field(
                      "footer",
                      "Footer",
                      d.footer || ""
                    )
                  )
              );
            }


            if (
              interaction.customId ===
                "adm:e:publish"
            ) {
              if (
                !state.eventChannelId
              ) {
                return interaction.reply({
                  content:
                    "❌ اختر روم الفعالية.",
                  flags:
                    MessageFlags.Ephemeral
                });
              }

              const message =
                await context.services
                  .eventsPublisher
                  .publish(
                    interaction.guild,
                    {
                      ...state.eventDraft,
                      channelId:
                        state.eventChannelId
                    }
                  );

              context.audit(
                interaction.guildId,
                interaction.user,
                "admin.event.publish",
                {
                  channelId:
                    state.eventChannelId,
                  messageId:
                    message.id
                }
              );

              state.eventDraft = {};

              return interaction.reply({
                content:
                  "✅ تم نشر الفعالية.",
                flags:
                  MessageFlags.Ephemeral
              });
            }


            /* LEVELS */

            if (
              [
                "adm:l:add",
                "adm:l:remove",
                "adm:l:set",
                "adm:l:reset"
              ].includes(
                interaction.customId
              ) &&
              !state.userId
            ) {
              return interaction.reply({
                content:
                  "❌ اختر عضو أولًا.",
                flags:
                  MessageFlags.Ephemeral
              });
            }


            if (
              interaction.customId ===
                "adm:l:add"
            ) {
              return interaction.showModal(
                amountModal(
                  "adm:modal:l:add",
                  "إضافة XP"
                )
              );
            }


            if (
              interaction.customId ===
                "adm:l:remove"
            ) {
              return interaction.showModal(
                amountModal(
                  "adm:modal:l:remove",
                  "حذف XP"
                )
              );
            }


            if (
              interaction.customId ===
                "adm:l:set"
            ) {
              return interaction.showModal(
                amountModal(
                  "adm:modal:l:set",
                  "تحديد XP"
                )
              );
            }


            if (
              interaction.customId ===
                "adm:l:reset"
            ) {
              const member =
                await interaction.guild.members
                  .fetch(
                    state.userId
                  )
                  .catch(() => null);

              context.services.levels
                .resetXp(
                  interaction.guildId,
                  state.userId,
                  member?.user
                    ?.username || ""
                );

              context.audit(
                interaction.guildId,
                interaction.user,
                "admin.level.reset",
                {
                  target:
                    state.userId
                }
              );

              return refresh(
                context,
                interaction,
                "levels"
              );
            }


            if (
              interaction.customId ===
                "adm:l:settings"
            ) {
              const s =
                context.services.levels
                  .getSettings(
                    interaction.guildId
                  );

              return interaction.showModal(
                new ModalBuilder()
                  .setCustomId(
                    "adm:modal:l:settings"
                  )
                  .setTitle(
                    "إعدادات XP"
                  )
                  .addComponents(
                    field(
                      "enabled",
                      "enabled true / false",
                      String(s.enabled)
                    ),
                    field(
                      "min",
                      "Minimum XP",
                      String(s.minXp)
                    ),
                    field(
                      "max",
                      "Maximum XP",
                      String(s.maxXp)
                    ),
                    field(
                      "cooldown",
                      "Cooldown بالثواني",
                      String(
                        s.cooldownSeconds
                      )
                    )
                  )
              );
            }


            if (
              interaction.customId ===
                "adm:l:theme"
            ) {
              const theme =
                context.services.levelCards
                  .get(
                    interaction.guildId
                  );

              return interaction.showModal(
                new ModalBuilder()
                  .setCustomId(
                    "adm:modal:l:theme"
                  )
                  .setTitle(
                    "Rank Card"
                  )
                  .addComponents(
                    field(
                      "background",
                      "Background Image URL",
                      theme.backgroundImage ||
                        ""
                    ),
                    field(
                      "progress",
                      "Progress Bar Color",
                      theme.progressBarColor ||
                        "#5865f2"
                    ),
                    field(
                      "circle",
                      "Circle Color",
                      theme.circleColor ||
                        "#5865f2"
                    ),
                    field(
                      "text",
                      "Text Color",
                      theme.textColor ||
                        "#ffffff"
                    ),
                    field(
                      "barText",
                      "Bar Text Color",
                      theme.barTextColor ||
                        "#ffffff"
                    )
                  )
              );
            }


            /* CREDITS */

            if (
              [
                "adm:c:add",
                "adm:c:remove",
                "adm:c:set",
                "adm:c:reset"
              ].includes(
                interaction.customId
              ) &&
              !state.userId
            ) {
              return interaction.reply({
                content:
                  "❌ اختر عضو أولًا.",
                flags:
                  MessageFlags.Ephemeral
              });
            }


            if (
              interaction.customId ===
                "adm:c:add"
            ) {
              return interaction.showModal(
                amountModal(
                  "adm:modal:c:add",
                  "إضافة Credits"
                )
              );
            }


            if (
              interaction.customId ===
                "adm:c:remove"
            ) {
              return interaction.showModal(
                amountModal(
                  "adm:modal:c:remove",
                  "حذف Credits"
                )
              );
            }


            if (
              interaction.customId ===
                "adm:c:set"
            ) {
              return interaction.showModal(
                amountModal(
                  "adm:modal:c:set",
                  "تحديد Credits"
                )
              );
            }


            if (
              interaction.customId ===
                "adm:c:reset"
            ) {
              context.services.credits
                .setBalance(
                  interaction.guildId,
                  state.userId,
                  0
                );

              context.audit(
                interaction.guildId,
                interaction.user,
                "admin.credits.reset",
                {
                  target:
                    state.userId
                }
              );

              return refresh(
                context,
                interaction,
                "credits"
              );
            }


            if (
              interaction.customId ===
                "adm:c:bet"
            ) {
              const b =
                getGuildSettings(
                  context,
                  interaction.guildId
                ).betting || {};

              return interaction.showModal(
                new ModalBuilder()
                  .setCustomId(
                    "adm:modal:c:bet"
                  )
                  .setTitle(
                    "Bet Settings"
                  )
                  .addComponents(
                    field(
                      "min",
                      "Minimum Bet",
                      String(
                        b.minBet ?? 1
                      )
                    ),
                    field(
                      "max",
                      "Maximum Bet",
                      String(
                        b.maxBet ?? 25
                      )
                    )
                  )
              );
            }


            /* GAMES */

            if (
              interaction.customId ===
                "adm:g:mode"
            ) {
              const games =
                getGames();

              const game =
                games.find(
                  item =>
                    item.key ===
                    state.selectedGameKey
                );

              if (!game) return;

              const current =
                getGuildSettings(
                  context,
                  interaction.guildId
                ).games || {};

              current.modes ||= {};

              const oldMode =
                current.modes[
                  game.key
                ] ||
                game.defaultMode ||
                "public";

              current.modes[
                game.key
              ] =
                oldMode === "staff"
                  ? "public"
                  : "staff";

              saveSection(
                context,
                interaction,
                "games",
                current,
                "admin.game.mode"
              );

              return refresh(
                context,
                interaction,
                "games"
              );
            }


            if (
              interaction.customId ===
                "adm:g:alias"
            ) {
              const game =
                getGames().find(
                  item =>
                    item.key ===
                    state.selectedGameKey
                );

              if (!game) return;

              const current =
                getGuildSettings(
                  context,
                  interaction.guildId
                ).games || {};

              const alias =
                current.aliases
                  ?.[game.key] ||
                game.defaultAlias ||
                `!${game.command}`;

              return interaction.showModal(
                new ModalBuilder()
                  .setCustomId(
                    "adm:modal:g:alias"
                  )
                  .setTitle(
                    "اختصار اللعبة"
                  )
                  .addComponents(
                    field(
                      "alias",
                      "الأمر الذي يبدأ بـ !",
                      alias,
                      TextInputStyle.Short,
                      true
                    )
                  )
              );
            }


            if (
              interaction.customId ===
                "adm:g:rules"
            ) {
              const current =
                getGuildSettings(
                  context,
                  interaction.guildId
                ).games || {};

              return interaction.showModal(
                new ModalBuilder()
                  .setCustomId(
                    "adm:modal:g:rules"
                  )
                  .setTitle(
                    "قواعد الألعاب"
                  )
                  .addComponents(
                    field(
                      "fee",
                      "رسوم فتح اللعبة الجماعية",
                      String(
                        current.multiplayerStartFee ??
                        5
                      )
                    ),
                    field(
                      "reward",
                      "مكافأة لعبة المشرفين",
                      String(
                        current.staffWinReward ??
                        10
                      )
                    ),
                    field(
                      "wins",
                      "عدد الفوز قبل القفل",
                      String(
                        current.staffMaxRewardStreak ??
                        3
                      )
                    ),
                    field(
                      "losses",
                      "الخسارات المطلوبة للفك",
                      String(
                        current.staffLossesToUnlock ??
                        3
                      )
                    )
                  )
              );
            }


            /* MEMBER COMMAND */

            if (
              interaction.customId ===
                "adm:cmd:alias"
            ) {
              const command =
                MEMBER_COMMANDS.find(
                  item =>
                    item.key ===
                    state.selectedCommandKey
                );

              const current =
                getGuildSettings(
                  context,
                  interaction.guildId
                ).memberCommands || {};

              const alias =
                current.aliases
                  ?.[command.key] ||
                command.defaultAlias;

              return interaction.showModal(
                new ModalBuilder()
                  .setCustomId(
                    "adm:modal:cmd:alias"
                  )
                  .setTitle(
                    "اختصار أمر العضو"
                  )
                  .addComponents(
                    field(
                      "alias",
                      "يجب أن يبدأ بـ !",
                      alias,
                      TextInputStyle.Short,
                      true
                    )
                  )
              );
            }


            /* COLORS */

            if (
              interaction.customId ===
                "adm:color:edit"
            ) {
              const c =
                getGuildSettings(
                  context,
                  interaction.guildId
                ).colorRoles || {};

              return interaction.showModal(
                new ModalBuilder()
                  .setCustomId(
                    "adm:modal:color:edit"
                  )
                  .setTitle(
                    "لوحة الألوان"
                  )
                  .addComponents(
                    field(
                      "title",
                      "العنوان",
                      c.title ||
                        "🎨 اختر لون اسمك"
                    ),
                    field(
                      "description",
                      "الوصف",
                      c.description ||
                        "اضغط الزر ثم اختر اللون.",
                      TextInputStyle.Paragraph
                    ),
                    field(
                      "color",
                      "Embed Color",
                      c.embedColor ||
                        "#5865F2"
                    ),
                    field(
                      "button",
                      "نص الزر",
                      c.buttonLabel ||
                        "اختر لونك"
                    )
                  )
              );
            }


            if (
              interaction.customId ===
                "adm:color:publish"
            ) {
              const c =
                getGuildSettings(
                  context,
                  interaction.guildId
                ).colorRoles || {};

              if (!c.channelId) {
                return interaction.reply({
                  content:
                    "❌ حدد روم الألوان أولًا.",
                  flags:
                    MessageFlags.Ephemeral
                });
              }

              await context.services
                .colorRoles
                .publishPanel(
                  interaction.guild,
                  c
                );

              context.audit(
                interaction.guildId,
                interaction.user,
                "admin.colors.publish"
              );

              return interaction.reply({
                content:
                  "✅ تم نشر لوحة الألوان.",
                flags:
                  MessageFlags.Ephemeral
              });
            }


            /* GUIDE */

            if (
              interaction.customId ===
                "adm:guide:update"
            ) {
              await context.services
                .modGuide
                .publishGuide(
                  interaction.guild,
                  interaction.guild
                    .members.me,
                  context
                );

              context.audit(
                interaction.guildId,
                interaction.user,
                "admin.guide.update"
              );

              return interaction.reply({
                content:
                  "✅ تم تحديث دليل المشرفين.",
                flags:
                  MessageFlags.Ephemeral
              });
            }
          }


          /* =================================================
             MODALS
          ================================================= */

          if (
            !interaction
              .isModalSubmit()
          ) {
            return;
          }


          const value =
            name =>
              interaction.fields
                .getTextInputValue(
                  name
                )
                .trim();


          /* TICKET TEXT */

          if (
            interaction.customId ===
              "adm:modal:t:text"
          ) {
            const t =
              context.services.tickets
                .resolveSettings(
                  context.store,
                  interaction.guildId
                );

            t.panelTitle =
              value("title");

            t.panelDescription =
              value("description");

            t.buttonLabel =
              value("button");

            t.welcomeMessage =
              value("welcome");

            t.closeLabel =
              value("close");

            saveSection(
              context,
              interaction,
              "tickets",
              t,
              "admin.ticket.text"
            );
          }


          /* TICKET ADVANCED */

          else if (
            interaction.customId ===
              "adm:modal:t:advanced"
          ) {
            const t =
              context.services.tickets
                .resolveSettings(
                  context.store,
                  interaction.guildId
                );

            t.panelColor =
              value("color") ||
              "#5865F2";

            t.panelImage =
              value("image");

            t.buttonEmoji =
              value("openEmoji");

            t.closeEmoji =
              value("closeEmoji");

            t.ticketNamePattern =
              value("pattern") ||
              "ticket-{user}";

            saveSection(
              context,
              interaction,
              "tickets",
              t,
              "admin.ticket.advanced"
            );
          }


          /* MESSAGE SEND */

          else if (
            interaction.customId ===
              "adm:modal:m:send"
          ) {
            const sent =
              await context.services
                .messages
                .send(
                  interaction.guild,
                  {
                    channelId:
                      state.messageChannelId,
                    content:
                      value("content"),
                    title:
                      value("title"),
                    description:
                      value("description"),
                    image:
                      value("image"),
                    color:
                      value("color") ||
                      "#5865F2"
                  }
                );

            context.audit(
              interaction.guildId,
              interaction.user,
              "admin.message.send",
              {
                channelId:
                  state.messageChannelId,
                messageId:
                  sent.id
              }
            );
          }


          /* MESSAGE EDIT */

          else if (
            interaction.customId ===
              "adm:modal:m:edit"
          ) {
            await context.services
              .messages
              .edit(
                interaction.guild,
                {
                  channelId:
                    state.messageChannelId,
                  messageId:
                    value("messageId"),
                  content:
                    value("content"),
                  title:
                    value("title"),
                  description:
                    value("description")
                }
              );

            context.audit(
              interaction.guildId,
              interaction.user,
              "admin.message.edit"
            );
          }


          /* MESSAGE DELETE */

          else if (
            interaction.customId ===
              "adm:modal:m:delete"
          ) {
            await context.services
              .messages
              .remove(
                interaction.guild,
                state.messageChannelId,
                value("messageId")
              );

            context.audit(
              interaction.guildId,
              interaction.user,
              "admin.message.delete"
            );
          }


          /* ROLE EDIT */

          else if (
            interaction.customId ===
              "adm:modal:r:edit"
          ) {
            const role =
              interaction.guild.roles
                .cache.get(
                  state.roleId
                );

            await context.services.roles
              .updateRole(
                interaction.guild,
                {
                  roleId:
                    state.roleId,
                  name:
                    value("name"),
                  color:
                    value("color"),
                  hoist:
                    value("hoist")
                      .toLowerCase() ===
                    "true",
                  mentionable:
                    value(
                      "mentionable"
                    )
                      .toLowerCase() ===
                    "true",
                  permissions:
                    role.permissions
                      .toArray()
                }
              );

            context.audit(
              interaction.guildId,
              interaction.user,
              "admin.role.edit",
              {
                roleId:
                  state.roleId
              }
            );
          }


          /* ROLE PERMISSIONS */

          else if (
            interaction.customId ===
              "adm:modal:r:permissions"
          ) {
            const role =
              interaction.guild.roles
                .cache.get(
                  state.roleId
                );

            const permissions =
              value("permissions")
                .split(",")
                .map(
                  item =>
                    item.trim()
                )
                .filter(Boolean);

            await context.services.roles
              .updateRole(
                interaction.guild,
                {
                  roleId:
                    state.roleId,
                  name:
                    role.name,
                  color:
                    role.hexColor,
                  hoist:
                    role.hoist,
                  mentionable:
                    role.mentionable,
                  permissions
                }
              );

            context.audit(
              interaction.guildId,
              interaction.user,
              "admin.role.permissions",
              {
                roleId:
                  state.roleId
              }
            );
          }


          /* EVENT BASIC */

          else if (
            interaction.customId ===
              "adm:modal:e:basic"
          ) {
            state.eventDraft = {
              ...state.eventDraft,
              content:
                value("content"),
              title:
                value("title"),
              description:
                value("description"),
              image:
                value("image"),
              color:
                value("color") ||
                "#5865F2"
            };
          }


          /* EVENT EXTRA */

          else if (
            interaction.customId ===
              "adm:modal:e:extra"
          ) {
            state.eventDraft = {
              ...state.eventDraft,
              subtitle:
                value("subtitle"),
              subtext:
                value("subtext"),
              footer:
                value("footer")
            };
          }


          /* XP */

          else if (
            interaction.customId
              .startsWith(
                "adm:modal:l:"
              )
          ) {
            const action =
              interaction.customId
                .split(":")
                .pop();

            if (
              action ===
              "settings"
            ) {
              context.services.levels
                .setSettings(
                  interaction.guildId,
                  {
                    enabled:
                      value("enabled")
                        .toLowerCase() ===
                      "true",
                    minXp:
                      Number(
                        value("min")
                      ) || 15,
                    maxXp:
                      Number(
                        value("max")
                      ) || 25,
                    cooldownSeconds:
                      Number(
                        value(
                          "cooldown"
                        )
                      ) || 60
                  }
                );
            }

            else if (
              action === "theme"
            ) {
              context.services.levelCards
                .set(
                  interaction.guildId,
                  {
                    backgroundImage:
                      value(
                        "background"
                      ),
                    progressBarColor:
                      value(
                        "progress"
                      ),
                    circleColor:
                      value(
                        "circle"
                      ),
                    textColor:
                      value(
                        "text"
                      ),
                    barTextColor:
                      value(
                        "barText"
                      )
                  }
                );
            }

            else {
              const amount =
                Math.max(
                  0,
                  Number(
                    value("amount")
                  ) || 0
                );

              const member =
                await interaction.guild.members
                  .fetch(
                    state.userId
                  )
                  .catch(() => null);

              const username =
                member?.user
                  ?.username || "";

              if (action === "add") {
                context.services.levels
                  .adjustXp(
                    interaction.guildId,
                    state.userId,
                    amount,
                    username
                  );
              }

              if (
                action === "remove"
              ) {
                context.services.levels
                  .adjustXp(
                    interaction.guildId,
                    state.userId,
                    -amount,
                    username
                  );
              }

              if (action === "set") {
                context.services.levels
                  .setXp(
                    interaction.guildId,
                    state.userId,
                    amount,
                    username
                  );
              }
            }

            context.audit(
              interaction.guildId,
              interaction.user,
              "admin.level.update"
            );
          }


          /* CREDITS */

          else if (
            interaction.customId
              .startsWith(
                "adm:modal:c:"
              )
          ) {
            const action =
              interaction.customId
                .split(":")
                .pop();

            if (action === "bet") {
              const current =
                getGuildSettings(
                  context,
                  interaction.guildId
                ).betting || {};

              current.minBet =
                Math.max(
                  1,
                  Number(
                    value("min")
                  ) || 1
                );

              current.maxBet =
                Math.max(
                  current.minBet,
                  Number(
                    value("max")
                  ) ||
                  current.minBet
                );

              saveSection(
                context,
                interaction,
                "betting",
                current,
                "admin.bet.settings"
              );
            } else {
              const amount =
                Math.max(
                  0,
                  Number(
                    value("amount")
                  ) || 0
                );

              if (action === "add") {
                context.services.credits
                  .adjust(
                    interaction.guildId,
                    state.userId,
                    amount
                  );
              }

              if (
                action === "remove"
              ) {
                context.services.credits
                  .adjust(
                    interaction.guildId,
                    state.userId,
                    -amount
                  );
              }

              if (action === "set") {
                context.services.credits
                  .setBalance(
                    interaction.guildId,
                    state.userId,
                    amount
                  );
              }

              context.audit(
                interaction.guildId,
                interaction.user,
                "admin.credits.update",
                {
                  target:
                    state.userId,
                  action,
                  amount
                }
              );
            }
          }


          /* GAME ALIAS */

          else if (
            interaction.customId ===
              "adm:modal:g:alias"
          ) {
            let alias =
              value("alias");

            if (
              !alias.startsWith("!")
            ) {
              alias =
                "!" + alias;
            }

            const current =
              getGuildSettings(
                context,
                interaction.guildId
              ).games || {};

            current.aliases ||= {};

            current.aliases[
              state.selectedGameKey
            ] =
              alias
                .split(/\s+/)[0]
                .slice(0, 32);

            saveSection(
              context,
              interaction,
              "games",
              current,
              "admin.game.alias"
            );
          }


          /* GAME RULES */

          else if (
            interaction.customId ===
              "adm:modal:g:rules"
          ) {
            const current =
              getGuildSettings(
                context,
                interaction.guildId
              ).games || {};

            current.multiplayerStartFee =
              Math.max(
                0,
                Number(
                  value("fee")
                ) || 0
              );

            current.staffWinReward =
              Math.max(
                0,
                Number(
                  value("reward")
                ) || 0
              );

            current.staffMaxRewardStreak =
              Math.max(
                1,
                Number(
                  value("wins")
                ) || 3
              );

            current.staffLossesToUnlock =
              Math.max(
                1,
                Number(
                  value("losses")
                ) || 3
              );

            saveSection(
              context,
              interaction,
              "games",
              current,
              "admin.game.rules"
            );
          }


          /* COMMAND ALIAS */

          else if (
            interaction.customId ===
              "adm:modal:cmd:alias"
          ) {
            let alias =
              value("alias");

            if (
              !alias.startsWith("!")
            ) {
              alias =
                "!" + alias;
            }

            const current =
              getGuildSettings(
                context,
                interaction.guildId
              ).memberCommands || {};

            current.aliases ||= {};

            current.aliases[
              state.selectedCommandKey
            ] =
              alias
                .split(/\s+/)[0]
                .slice(0, 32);

            saveSection(
              context,
              interaction,
              "memberCommands",
              current,
              "admin.command.alias"
            );
          }


          /* COLOR PANEL */

          else if (
            interaction.customId ===
              "adm:modal:color:edit"
          ) {
            const current =
              getGuildSettings(
                context,
                interaction.guildId
              ).colorRoles || {};

            current.title =
              value("title");

            current.description =
              value("description");

            current.embedColor =
              value("color") ||
              "#5865F2";

            current.buttonLabel =
              value("button");

            saveSection(
              context,
              interaction,
              "colorRoles",
              current,
              "admin.colors.edit"
            );
          }


          return interaction.reply({
            content:
              "✅ تم حفظ التعديل.",
            flags:
              MessageFlags.Ephemeral
          });


        } catch (error) {

          console.error(
            "Staff admin panel:",
            error
          );

          if (
            interaction.isRepliable()
          ) {
            const payload = {
              content:
                `❌ صار خطأ: ${error.message}`,
              flags:
                MessageFlags.Ephemeral
            };

            if (
              interaction.replied ||
              interaction.deferred
            ) {
              await interaction
                .followUp(payload)
                .catch(() => {});
            } else {
              await interaction
                .reply(payload)
                .catch(() => {});
            }
          }

        }
      }
    );
  }
};
