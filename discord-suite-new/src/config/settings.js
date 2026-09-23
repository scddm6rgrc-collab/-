const path = require("path");
require("dotenv").config();

const envPort = Number(process.env.PORT);

module.exports = Object.freeze({
  discord: {
    token: process.env.DISCORD_TOKEN || "",
    clientId: process.env.DISCORD_CLIENT_ID || "",
    clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
    redirectUri: process.env.DISCORD_REDIRECT_URI || ""
  },

  web: {
    port:
      Number.isFinite(envPort) && envPort > 0
        ? envPort
        : 3000,

    sessionSecret:
      process.env.SESSION_SECRET || "change-me"
  },

  files: {
    settings: path.join(
      __dirname,
      "../../data/settings.json"
    ),

    levels: path.join(
      __dirname,
      "../../data/levels.json"
    ),

    rankCardSettings: path.join(
      __dirname,
      "../../data/rankCardSettings.json"
    ),

    credits: path.join(
      __dirname,
      "../../data/credits.json"
    ),

    gameRewards: path.join(
      __dirname,
      "../../data/gameRewards.json"
    )
  }
});
