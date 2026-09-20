const ADMINISTRATOR = 8n;
const MANAGE_GUILD = 32n;

function canManageGuild(guild) {
  const permissions = BigInt(guild.permissions || "0");
  return (
    (permissions & ADMINISTRATOR) === ADMINISTRATOR ||
    (permissions & MANAGE_GUILD) === MANAGE_GUILD
  );
}

function userCanAccessGuild(req, guildId) {
  return (req.session.user?.guilds || []).some(g => g.id === guildId);
}

module.exports = { canManageGuild, userCanAccessGuild };
