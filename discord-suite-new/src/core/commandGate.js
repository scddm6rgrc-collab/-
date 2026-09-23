let store = null;

function getSettings(guildId) {
  return (
    store?.getGuild(guildId) ||
    {}
  );
}


async function getMember(interaction) {
  if (
    interaction.member &&
    interaction.member.permissions
  ) {
    return interaction.member;
  }

  return interaction.guild?.members
    ?.fetch(interaction.user.id)
    .catch(() => null);
}


async function isStaff(interaction) {
  if (!interaction.guildId) {
    return false;
  }

  const member =
    await getMember(interaction);

  if (!member) {
    return false;
  }

  const {
    PermissionFlagsBits
  } = require("discord.js");

  if (
    member.permissions.has(
      PermissionFlagsBits.Administrator
    ) ||
    member.permissions.has(
      PermissionFlagsBits.ManageGuild
    ) ||
    member.permissions.has(
      PermissionFlagsBits.ModerateMembers
    ) ||
    member.permissions.has(
      PermissionFlagsBits.ManageMessages
    )
  ) {
    return true;
  }

  const settings =
    getSettings(
      interaction.guildId
    );

  const staffRoles =
    settings.games
      ?.staffRoleIds || [];

  return staffRoles.some(
    roleId =>
      member.roles.cache.has(
        roleId
      )
  );
}


function getSlashRoom(
  guildId,
  commandName
) {
  const settings =
    getSettings(guildId);

  // rank / leaderboard / credits
  const memberRoom =
    settings.memberCommands
      ?.rooms
      ?.[commandName];

  if (memberRoom) {
    return memberRoom;
  }

  // الألعاب
  const gameRoom =
    settings.games
      ?.rooms
      ?.[commandName];

  if (gameRoom) {
    return gameRoom;
  }

  // دعم الإعداد القديم
  return (
    settings.commandChannelId ||
    null
  );
}


async function sendPrivate(
  interaction,
  content
) {
  const payload = {
    content,
    ephemeral: true
  };

  try {
    if (
      interaction.replied ||
      interaction.deferred
    ) {
      await interaction.followUp(
        payload
      );
    } else {
      await interaction.reply(
        payload
      );
    }
  } catch {}
}


async function commandGate(
  interaction
) {
  if (!interaction.guildId) {
    return false;
  }

  // =========================================
  // كل Slash للمشرفين فقط
  // =========================================

  if (
    !(await isStaff(
      interaction
    ))
  ) {
    await sendPrivate(
      interaction,
      "❌ أوامر `/` خاصة بالمشرفين. استخدم أمر `!` الخاص بهذا الأمر."
    );

    return false;
  }


  // =========================================
  // الروم المحدد للأمر
  // =========================================

  const roomId =
    getSlashRoom(
      interaction.guildId,
      interaction.commandName
    );

  if (!roomId) {
    await sendPrivate(
      interaction,
      "❌ لم يتم تحديد روم لهذا الأمر من الداشبورد."
    );

    return false;
  }

  if (
    interaction.channelId !==
    roomId
  ) {
    await sendPrivate(
      interaction,
      `❌ استخدم هذا الأمر في <#${roomId}> فقط.`
    );

    return false;
  }

  return true;
}


commandGate.configure =
function(nextStore) {
  store = nextStore;
};


commandGate.isStaff =
  isStaff;

commandGate.getSlashRoom =
  getSlashRoom;


module.exports =
  commandGate;
