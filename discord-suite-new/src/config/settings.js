const path = require("path");
require("dotenv").config();

module.exports = Object.freeze({
  discord: {
    token: process.env.DISCORD_TOKEN || "",
    clientId: process.env.DISCORD_CLIENT_ID || "",
    clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
    redirectUri: process.env.DISCORD_REDIRECT_URI || ""
  },

  web: {
    port: Number(process.env.PORT || 3000),
    sessionSecret: process.env.SESSION_SECRET || "change-me"
  },

  files: {
    settings: path.join(__dirname, "../../data/settings.json")
  }
});
