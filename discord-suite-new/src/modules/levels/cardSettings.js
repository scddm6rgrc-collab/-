const fs = require("fs");
const path = require("path");

function createCardSettingsService(file) {
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
    fs.writeFileSync(
      file,
      JSON.stringify(data, null, 2)
    );
  }

  function get(guildId) {
    const data = read();

    if (!data[guildId]) {
      data[guildId] = {
        backgroundImage: "",
        progressBarColor: "#5865f2",
        circleColor: "#5865f2",
        textColor: "#ffffff",
        barTextColor: "#ffffff"
      };

      write(data);
    }

    return data[guildId];
  }

  function set(guildId, patch) {
    const data = read();

    data[guildId] = {
      ...get(guildId),
      ...patch
    };

    write(data);

    return data[guildId];
  }

  return {
    get,
    set
  };
}

module.exports = {
  createCardSettingsService
};
