const {
  Events,
  MessageFlags
} = require("discord.js");

const service =
  require("./service");


module.exports = {
  name: "colorRoles",

  async setup(
    client,
    context
  ) {

    context.services.colorRoles =
      service;


    client.on(
      Events.InteractionCreate,

      async interaction => {

        try {

          // =========================
          // OPEN COLOR PICKER
          // =========================

          if (
            interaction.isButton() &&
            interaction.customId ===
              "color_panel_open"
          ) {

            return interaction.reply({
              content:
                `🎨 اختر لون اسمك\nصفحة 1/${service.PAGE_COUNT}`,

              components:
                service.pickerComponents(
                  0
                ),

              flags:
                MessageFlags.Ephemeral
            });
          }


          // =========================
          // PAGE
          // =========================

          if (
            interaction.isButton() &&
            interaction.customId.startsWith(
              "color_page:"
            )
          ) {

            const page =
              Number(
                interaction.customId
                  .split(":")[1]
              );


            return interaction.update({
              content:
                `🎨 اختر لون اسمك\nصفحة ${page + 1}/${service.PAGE_COUNT}`,

              components:
                service.pickerComponents(
                  page
                )
            });
          }


          // =========================
          // SELECT COLOR
          // =========================

          if (
            interaction.isStringSelectMenu() &&
            interaction.customId.startsWith(
              "color_pick:"
            )
          ) {

            const index =
              Number(
                interaction.values[0]
              );


            const color =
              service.COLORS.find(
                c =>
                  c.index ===
                  index
              );


            if (!color) {

              return interaction.update({
                content:
                  "❌ اللون غير موجود.",

                components: []
              });
            }


            const member =
              await interaction.guild.members
                .fetch(
                  interaction.user.id
                );


            await service.applyColor(
              interaction.guild,
              member,
              color
            );


            return interaction.update({
              content:
                `✅ تم تغيير لون اسمك إلى **${color.name}** (${color.hex})`,

              components: []
            });
          }

        } catch (error) {

          console.error(
            "Color Roles:",
            error
          );


          const message = {
            content:
              `❌ ${error.message || "حدث خطأ أثناء تغيير اللون."}`,

            components: [],

            flags:
              MessageFlags.Ephemeral
          };


          if (
            interaction.replied ||
            interaction.deferred
          ) {

            await interaction
              .followUp(
                message
              )
              .catch(
                () => {}
              );

          } else {

            await interaction
              .reply(
                message
              )
              .catch(
                () => {}
              );
          }
        }
      }
    );
  }
};
