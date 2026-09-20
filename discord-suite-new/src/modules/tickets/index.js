const service = require("./service");

module.exports = {
  name: "tickets",
  async setup(client, context) {
    context.services.tickets = service;

    client.on("interactionCreate", async interaction => {
      if (!interaction.isButton()) return;
      try {
        if (interaction.customId === "ticket:create") {
          await service.createTicket(interaction, context.store);
        }
        if (interaction.customId === "ticket:close") {
          await service.closeTicket(interaction, context.store);
        }
      } catch (error) {
        console.error("Ticket interaction error:", error);
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({ content: "صار خطأ في نظام التكت.", ephemeral: true }).catch(() => {});
        } else {
          await interaction.reply({ content: "صار خطأ في نظام التكت.", ephemeral: true }).catch(() => {});
        }
      }
    });
  }
};
