const fs = require("fs");
const path = require("path");

function createLevelService(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });

  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "{}");
  }

  function read() {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      return {};
    }
  }

  function write(data) {
    const temp = `${file}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(data, null, 2));
    fs.renameSync(temp, file);
  }

  function ensureGuild(data, guildId) {
    if (!data[guildId]) {
      data[guildId] = {
        settings: {
          enabled: true,
          minXp: 15,
          maxXp: 25,
          cooldownSeconds: 60
        },
        users: {}
      };
    }

    return data[guildId];
  }

  function ensureUser(guild, userId, username = "") {
    if (!guild.users[userId]) {
      guild.users[userId] = {
        xp: 0,
        messages: 0,
        username
      };
    }

    if (username) {
      guild.users[userId].username = username;
    }

    return guild.users[userId];
  }

  function getSettings(guildId) {
    const data = read();
    const guild = ensureGuild(data, guildId);
    write(data);
    return guild.settings;
  }

  function setSettings(guildId, patch) {
    const data = read();
    const guild = ensureGuild(data, guildId);

    guild.settings = {
      ...guild.settings,
      ...patch
    };

    write(data);

    return guild.settings;
  }

  function addMessageXp(guildId, userId, amount, username = "") {
    const data = read();
    const guild = ensureGuild(data, guildId);
    const user = ensureUser(guild, userId, username);

    user.xp = Math.max(0, Number(user.xp || 0) + Number(amount || 0));
    user.messages = Number(user.messages || 0) + 1;

    write(data);

    return user;
  }

  function adjustXp(guildId, userId, amount, username = "") {
    const data = read();
    const guild = ensureGuild(data, guildId);
    const user = ensureUser(guild, userId, username);

    user.xp = Math.max(0, Number(user.xp || 0) + Number(amount || 0));

    write(data);

    return user;
  }

  function setXp(guildId, userId, amount, username = "") {
    const data = read();
    const guild = ensureGuild(data, guildId);
    const user = ensureUser(guild, userId, username);

    user.xp = Math.max(0, Number(amount || 0));

    write(data);

    return user;
  }

  function resetXp(guildId, userId, username = "") {
    const data = read();
    const guild = ensureGuild(data, guildId);
    const user = ensureUser(guild, userId, username);

    user.xp = 0;

    write(data);

    return user;
  }

  function getUser(guildId, userId) {
    const data = read();

    return data[guildId]?.users?.[userId] || {
      xp: 0,
      messages: 0
    };
  }

  function getTop(guildId, limit = 10) {
    const data = read();
    const users = data[guildId]?.users || {};

    return Object.entries(users)
      .map(([userId, info]) => ({
        userId,
        ...info
      }))
      .filter(user => Number(user.xp || 0) > 0)
      .sort((a, b) => Number(b.xp) - Number(a.xp))
      .slice(0, limit);
  }

  function getRank(guildId, userId) {
    const data = read();
    const users = data[guildId]?.users || {};

    const sorted = Object.entries(users)
      .sort(([, a], [, b]) => Number(b.xp || 0) - Number(a.xp || 0));

    const index = sorted.findIndex(([id]) => id === userId);

    return index === -1 ? null : index + 1;
  }

  function xpForLevel(level) {
    return 100 * level * level;
  }

  function levelFromXp(xp) {
    return Math.floor(
      Math.sqrt(Math.max(0, Number(xp || 0)) / 100)
    );
  }

  function progress(xp) {
    xp = Number(xp || 0);

    const level = levelFromXp(xp);
    const current = xpForLevel(level);
    const next = xpForLevel(level + 1);

    return {
      level,
      current,
      next,
      ratio: Math.max(
        0,
        Math.min(
          1,
          (xp - current) / Math.max(1, next - current)
        )
      )
    };
  }

  return {
    getSettings,
    setSettings,
    addMessageXp,
    adjustXp,
    setXp,
    resetXp,
    getUser,
    getTop,
    getRank,
    xpForLevel,
    levelFromXp,
    progress
  };
}

module.exports = {
  createLevelService
};
