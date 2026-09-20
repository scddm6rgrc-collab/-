const { PermissionsBitField, PermissionFlagsBits } = require("discord.js");

const permissionNames = Object.keys(PermissionFlagsBits).sort();

async function getRole(guild, roleId) {
  const role = guild.roles.cache.get(roleId) || await guild.roles.fetch(roleId).catch(() => null);
  if (!role) throw new Error("Role not found");
  if (role.managed) throw new Error("Managed roles cannot be edited");
  if (!role.editable) throw new Error("Move the bot role above this role first");
  return role;
}

async function updateRole(guild, input) {
  const role = await getRole(guild, input.roleId);
  const permissions = new PermissionsBitField(input.permissions || []);

  await role.edit({
    name: input.name || role.name,
    color: input.color || role.hexColor,
    hoist: Boolean(input.hoist),
    mentionable: Boolean(input.mentionable),
    permissions
  });

  return role;
}

async function clonePermissions(guild, sourceRoleId, targetRoleIds) {
  const source = guild.roles.cache.get(sourceRoleId) || await guild.roles.fetch(sourceRoleId);
  for (const id of targetRoleIds) {
    const role = await getRole(guild, id);
    await role.setPermissions(source.permissions);
  }
}

module.exports = { permissionNames, updateRole, clonePermissions };
