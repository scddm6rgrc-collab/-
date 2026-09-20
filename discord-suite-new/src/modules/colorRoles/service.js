const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  AttachmentBuilder
} = require("discord.js");

const {
  COLORS
} = require("./colors");

const {
  createPaletteImage
} = require("./paletteImage");


const PAGE_SIZE = 25;

const PAGE_COUNT =
  Math.ceil(
    COLORS.length /
      PAGE_SIZE
  );


function getPageColors(page) {

  page =
    Math.max(
      0,
      Math.min(
        PAGE_COUNT - 1,
        Number(page) || 0
      )
    );

  const start =
    page * PAGE_SIZE;

  return COLORS.slice(
    start,
    start + PAGE_SIZE
  );
}


function pickerComponents(page = 0) {

  page =
    Math.max(
      0,
      Math.min(
        PAGE_COUNT - 1,
        Number(page) || 0
      )
    );

  const colors =
    getPageColors(page);


  const select =
    new StringSelectMenuBuilder()

      .setCustomId(
        `color_pick:${page}`
      )

      .setPlaceholder(
        `اختر اللون — صفحة ${page + 1}/${PAGE_COUNT}`
      )

      .addOptions(
        colors.map(color => ({
          label:
            `${String(color.index).padStart(3, "0")} • ${color.name}`,

          value:
            String(color.index),

          description:
            color.hex
        }))
      );


  const selectRow =
    new ActionRowBuilder()
      .addComponents(
        select
      );


  const previous =
    new ButtonBuilder()

      .setCustomId(
        `color_page:${page - 1}`
      )

      .setLabel("السابق")

      .setEmoji("⬅️")

      .setStyle(
        ButtonStyle.Secondary
      )

      .setDisabled(
        page <= 0
      );


  const pageButton =
    new ButtonBuilder()

      .setCustomId(
        "color_page_info"
      )

      .setLabel(
        `${page + 1} / ${PAGE_COUNT}`
      )

      .setStyle(
        ButtonStyle.Secondary
      )

      .setDisabled(true);


  const next =
    new ButtonBuilder()

      .setCustomId(
        `color_page:${page + 1}`
      )

      .setLabel("التالي")

      .setEmoji("➡️")

      .setStyle(
        ButtonStyle.Secondary
      )

      .setDisabled(
        page >=
          PAGE_COUNT - 1
      );


  const navRow =
    new ActionRowBuilder()
      .addComponents(
        previous,
        pageButton,
        next
      );


  return [
    selectRow,
    navRow
  ];
}


async function applyColor(
  guild,
  member,
  color
) {

  const roleName =
    `CLR_${String(
      color.index
    ).padStart(
      3,
      "0"
    )}_${color.name}`;


  let role =
    guild.roles.cache.find(
      r =>
        r.name === roleName
    );


  if (!role) {

    role =
      await guild.roles.create({
        name:
          roleName,

        color:
          color.hex,

        hoist:
          false,

        mentionable:
          false,

        reason:
          "Color Roles"
      });
  }


  if (!role.editable) {

    throw new Error(
      "لا أستطيع إدارة رول اللون. ارفع رول البوت فوق رولات الألوان."
    );
  }


  const oldColorRoles =
    member.roles.cache.filter(
      currentRole =>
        currentRole.name.startsWith(
          "CLR_"
        ) &&
        currentRole.id !==
          role.id &&
        currentRole.editable
    );


  if (
    oldColorRoles.size
  ) {

    await member.roles.remove(
      oldColorRoles,
      "Changing color role"
    );
  }


  if (
    !member.roles.cache.has(
      role.id
    )
  ) {

    await member.roles.add(
      role,
      "Selected color role"
    );
  }


  return role;
}


async function publishPanel(
  guild,
  settings
) {

  const channel =
    guild.channels.cache.get(
      settings.channelId
    ) ||
    await guild.channels
      .fetch(
        settings.channelId
      )
      .catch(
        () => null
      );


  if (
    !channel ||
    !channel.isTextBased()
  ) {

    throw new Error(
      "روم الألوان غير صالح."
    );
  }


  const image =
    await createPaletteImage(
      COLORS
    );


  const embed =
    new EmbedBuilder()

      .setTitle(
        settings.title ||
        "🎨 اختر لون اسمك"
      )

      .setDescription(
        settings.description ||
        "اضغط الزر بالأسفل ثم اختر اللون الذي تريده. سيتم حذف لونك القديم تلقائيًا."
      )

      .setColor(
        settings.embedColor ||
        "#5865F2"
      )

      .setImage(
        "attachment://colors.png"
      )

      .setFooter({
        text:
          `${COLORS.length} colors available`
      });


  const button =
    new ButtonBuilder()

      .setCustomId(
        "color_panel_open"
      )

      .setLabel(
        settings.buttonLabel ||
        "اختر لونك"
      )

      .setEmoji("🎨")

      .setStyle(
        ButtonStyle.Primary
      );


  const row =
    new ActionRowBuilder()
      .addComponents(
        button
      );


  return channel.send({
    embeds: [
      embed
    ],

    files: [
      new AttachmentBuilder(
        image,
        {
          name:
            "colors.png"
        }
      )
    ],

    components: [
      row
    ]
  });
}


module.exports = {
  COLORS,
  PAGE_COUNT,
  pickerComponents,
  applyColor,
  publishPanel
};
