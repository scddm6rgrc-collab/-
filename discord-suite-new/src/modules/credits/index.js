const {
  Events
} = require("discord.js");

const commandGate =
  require(
    "../../core/commandGate"
  );

const {
  createCreditsService
} = require("./service");


module.exports = {
  name: "credits",

  async setup(
    client,
    context
  ) {

    const credits =
      createCreditsService(
        context.config.files
          .credits
      );

    context.services.credits =
      credits;


    client.once(
      Events.ClientReady,

      async readyClient => {

        const existing =
          await readyClient
            .application
            .commands
            .fetch();

        const old =
          existing.find(
            command =>
              command.name ===
              "credits"
          );


        const definition = {
          name: "credits",

          description:
            "عرض Credits الخاصة بك"
        };


        if (old) {
          await old.edit(
            definition
          );
        } else {
          await readyClient
            .application
            .commands
            .create(
              definition
            );
        }

        console.log(
          "✅ /credits registered"
        );

      }
    );


    client.on(
      Events.InteractionCreate,

      async interaction => {

        if (
          !interaction
            .isChatInputCommand()
        ) {
          return;
        }


        if (
          interaction.commandName !==
          "credits"
        ) {
          return;
        }


        // Slash = STAFF ONLY
        if (
          !(await commandGate(
            interaction
          ))
        ) {
          return;
        }


        const levels =
          context.services.levels;


        if (
          levels &&
          typeof credits
            .syncLevelRewards ===
            "function"
        ) {

          const stats =
            levels.getUser(
              interaction.guildId,
              interaction.user.id
            );

          const level =
            levels.levelFromXp(
              stats.xp
            );


          credits.syncLevelRewards(
            interaction.guildId,
            interaction.user.id,
            level,
            interaction.user.username
          );

        }


        const balance =
          credits.getBalance(
            interaction.guildId,
            interaction.user.id
          );


        await interaction.reply({
          content:
            `💳 لديك **${balance} Credits**.`,

          ephemeral: true
        });

      }
    );

  }
};
