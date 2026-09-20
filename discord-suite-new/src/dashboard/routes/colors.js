const express =
  require("express");

const {
  requireGuildAccess
} = require("../middleware");


module.exports =
function colorRoutes(
  client,
  context
) {

  const router =
    express.Router();


  router.post(
    "/save",
    requireGuildAccess,

    async (req, res) => {

      const guildId =
        req.body.guildId;


      const settings = {
        channelId:
          req.body.channelId ||
          "",

        title:
          req.body.title ||
          "🎨 اختر لون اسمك",

        description:
          req.body.description ||
          "اضغط الزر ثم اختر اللون الذي تريده.",

        embedColor:
          req.body.embedColor ||
          "#5865F2",

        buttonLabel:
          req.body.buttonLabel ||
          "اختر لونك"
      };


      context.store
        .setGuildSection(
          guildId,
          "colorRoles",
          settings
        );


      context.audit(
        guildId,
        req.session.user,
        "colorRoles.save",
        {
          channelId:
            settings.channelId
        }
      );


      res.redirect(
        `/?guild=${guildId}&tab=colors`
      );
    }
  );


  router.post(
    "/publish",
    requireGuildAccess,

    async (req, res) => {

      try {

        const guildId =
          req.body.guildId;


        const guild =
          client.guilds.cache.get(
            guildId
          );


        if (!guild) {

          return res
            .status(404)
            .send(
              "السيرفر غير موجود"
            );
        }


        const settings =
          context.store
            .getGuild(
              guildId
            )
            .colorRoles ||
          {};


        if (
          !settings.channelId
        ) {

          return res
            .status(400)
            .send(
              "اختر روم الألوان واحفظ الإعدادات أولاً."
            );
        }


        await context.services
          .colorRoles
          .publishPanel(
            guild,
            settings
          );


        context.audit(
          guildId,
          req.session.user,
          "colorRoles.publish",
          {
            channelId:
              settings.channelId
          }
        );


        res.redirect(
          `/?guild=${guildId}&tab=colors`
        );

      } catch (error) {

        console.error(error);

        res
          .status(500)
          .send(
            error.message ||
            "تعذر نشر لوحة الألوان"
          );
      }
    }
  );


  return router;
};
