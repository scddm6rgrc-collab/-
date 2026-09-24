const { Client, GatewayIntentBits } = require("discord.js");
const config = require("./config/settings");
const constants = require("./config/constants");
const JsonStore = require("./core/store");
const makeAudit = require("./core/audit");
const { loadModules } = require("./core/moduleLoader");
const startDashboard = require("./dashboard/app");
const commandGate = require("./core/commandGate");

const modules = [
  require("./modules/tickets"),
  require("./modules/messages"),
  require("./modules/roles"),
  require("./modules/eventsPublisher"),
  require("./modules/modGuide"),
  require("./modules/levels"),
  require("./modules/colorRoles"),
  require("./modules/helpCenter"),
  require("./modules/customCommands"),
  require("./modules/autoReplies"),
  require("./modules/credits"),
  require("./modules/betting"),
  require("./modules/memberCommands"),
  require("./modules/games"),
  require("./modules/staffPanel")
];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const store = new JsonStore(config.files.settings);
commandGate.configure(store);
const context = {
  config,
  constants,
  store,
  services: {},
  audit: makeAudit(store)
};

(async () => {
  if (!config.discord.token) {
    console.error("❌ DISCORD_TOKEN غير موجود في .env");
    process.exit(1);
  }

  await loadModules(client, context, modules);
  startDashboard(client, context);

  client.once("ready", () => {
    console.log(`🤖 ${client.user.tag} online`);
  });

  await client.login(config.discord.token);
})();
