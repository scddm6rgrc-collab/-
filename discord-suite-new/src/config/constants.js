const { ButtonStyle } = require("discord.js");

module.exports = Object.freeze({
  BRAND: {
    name: "Discord Control Suite",
    defaultColor: "#5865F2"
  },

  EMOJI: {
    home: "🏠",
    ticket: "🎫",
    message: "💬",
    role: "🎭",
    event: "🎉",
    guide: "📘",
    settings: "⚙️",
    close: "🔒",
    save: "💾",
    delete: "🗑️"
  },

  TICKET_BUTTON_STYLES: {
    Primary: ButtonStyle.Primary,
    Secondary: ButtonStyle.Secondary,
    Success: ButtonStyle.Success,
    Danger: ButtonStyle.Danger
  }
});
