const express =
  require("express");

const {
  requireGuildAccess
} = require("../middleware");


module.exports =
function guideRoutes(
  client,
  context
) {

  const router =
    express.Router();


  router.post(
    "/publish",
    requireGuildAccess,

    async (
      req,
      res
    ) => {

      try {

        const guild =
          client.guilds.cache.get(
            req.body.guildId
          );


        if (!guild) {
          throw new Error(
            "السيرفر غير موجود."
          );
        }


        const channel =
          await context.services
            .modGuide
            .publishGuide(
              guild,
              guild.members.me,
              context
            );


        context.audit(
          guild.id,
          req.session.user,
          "guide.publish",
          {
            channelId:
              channel.id
          }
        );


        res.redirect(
          `/?guild=${guild.id}&tab=guide`
        );

      } catch (error) {

        console.error(
          "Guide publish:",
          error
        );


        res
          .status(400)
          .send(
            error.message
          );

      }

    }
  );


  return router;
};
