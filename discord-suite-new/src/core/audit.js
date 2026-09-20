function makeAudit(store) {
  return function audit(guildId, user, action, details = {}) {
    const guild = store.getGuild(guildId);
    const history = Array.isArray(guild.dashboardHistory)
      ? guild.dashboardHistory
      : [];

    history.unshift({
      at: new Date().toISOString(),
      userId: user?.id || "unknown",
      username: user?.username || "unknown",
      action,
      details
    });

    store.setGuildSection(guildId, "dashboardHistory", history.slice(0, 300));
  };
}

module.exports = makeAudit;
