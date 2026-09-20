const fs = require("fs");
const path = require("path");

class JsonStore {
  constructor(file) {
    this.file = file;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (!fs.existsSync(file)) fs.writeFileSync(file, "{}\n");
  }

  readAll() {
    try {
      return JSON.parse(fs.readFileSync(this.file, "utf8"));
    } catch {
      return {};
    }
  }

  writeAll(data) {
    const temp = `${this.file}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(data, null, 2));
    fs.renameSync(temp, this.file);
  }

  getGuild(guildId) {
    const all = this.readAll();
    return all[guildId] || {};
  }

  patchGuild(guildId, patch) {
    const all = this.readAll();
    all[guildId] = { ...(all[guildId] || {}), ...patch };
    this.writeAll(all);
    return all[guildId];
  }

  setGuildSection(guildId, section, value) {
    const all = this.readAll();
    all[guildId] = all[guildId] || {};
    all[guildId][section] = value;
    this.writeAll(all);
    return value;
  }
}

module.exports = JsonStore;
