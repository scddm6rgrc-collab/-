const express = require("express");
const crypto = require("crypto");
const { canManageGuild } = require("../core/access");

module.exports = function authRouter(client, config) {
  const router = express.Router();

  function createState() {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString("hex");

    const payload = `${timestamp}.${nonce}`;

    const signature = crypto
      .createHmac(
        "sha256",
        config.web.sessionSecret
      )
      .update(payload)
      .digest("base64url");

    return `${payload}.${signature}`;
  }

  function verifyState(state) {
    try {
      if (!state) return false;

      const parts = String(state).split(".");

      if (parts.length !== 3) {
        return false;
      }

      const [timestamp, nonce, signature] = parts;

      const payload =
        `${timestamp}.${nonce}`;

      const expected = crypto
        .createHmac(
          "sha256",
          config.web.sessionSecret
        )
        .update(payload)
        .digest("base64url");

      const a =
        Buffer.from(signature);

      const b =
        Buffer.from(expected);

      if (a.length !== b.length) {
        return false;
      }

      if (
        !crypto.timingSafeEqual(a, b)
      ) {
        return false;
      }

      const age =
        Date.now() - Number(timestamp);

      // صالح لمدة 10 دقائق
      if (
        !Number.isFinite(age) ||
        age < 0 ||
        age > 10 * 60 * 1000
      ) {
        return false;
      }

      return true;

    } catch {
      return false;
    }
  }


  router.get("/discord", (req, res) => {
    const state = createState();

    const params =
      new URLSearchParams({
        client_id:
          config.discord.clientId,

        response_type:
          "code",

        redirect_uri:
          config.discord.redirectUri,

        scope:
          "identify guilds",

        state
      });

    res.redirect(
      `https://discord.com/oauth2/authorize?${params}`
    );
  });


  router.get(
    "/callback",
    async (req, res) => {

      try {

        if (req.query.error) {
          return res
            .status(400)
            .send(
              `Discord OAuth: ${req.query.error}`
            );
        }

        if (
          !req.query.code ||
          !verifyState(req.query.state)
        ) {
          return res
            .status(403)
            .send(
              'OAuth state غير صالح. ارجع إلى <a href="/login">صفحة تسجيل الدخول</a> وحاول من جديد.'
            );
        }


        const tokenResponse =
          await fetch(
            "https://discord.com/api/oauth2/token",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/x-www-form-urlencoded"
              },

              body:
                new URLSearchParams({
                  client_id:
                    config.discord.clientId,

                  client_secret:
                    config.discord.clientSecret,

                  grant_type:
                    "authorization_code",

                  code:
                    req.query.code,

                  redirect_uri:
                    config.discord.redirectUri
                })
            }
          );


        const tokenData =
          await tokenResponse.json();


        if (!tokenData.access_token) {
          console.error(
            "Discord token exchange:",
            tokenData
          );

          return res
            .status(400)
            .send(
              "فشل تسجيل الدخول بالديسكورد. تأكد من Redirect URI."
            );
        }


        const headers = {
          Authorization:
            `Bearer ${tokenData.access_token}`
        };


        const [
          userResponse,
          guildResponse
        ] =
          await Promise.all([
            fetch(
              "https://discord.com/api/users/@me",
              { headers }
            ),

            fetch(
              "https://discord.com/api/users/@me/guilds",
              { headers }
            )
          ]);


        const user =
          await userResponse.json();

        const guilds =
          await guildResponse.json();


        if (!Array.isArray(guilds)) {
          console.error(
            "Discord guild response:",
            guilds
          );

          return res
            .status(400)
            .send(
              "تعذر جلب السيرفرات من Discord."
            );
        }


        const allowedGuilds =
          guilds
            .filter(canManageGuild)
            .filter(
              guild =>
                client.guilds.cache.has(
                  guild.id
                )
            )
            .map(guild => ({
              id:
                guild.id,

              name:
                guild.name,

              icon:
                guild.icon
            }));


        req.session.user = {
          id:
            user.id,

          username:
            user.username,

          globalName:
            user.global_name,

          avatar:
            user.avatar,

          guilds:
            allowedGuilds
        };


        // تأكد أن Session انحفظت قبل redirect
        req.session.save(error => {

          if (error) {
            console.error(
              "Session save:",
              error
            );

            return res
              .status(500)
              .send(
                "تعذر حفظ جلسة تسجيل الدخول."
              );
          }

          res.redirect("/");
        });


      } catch (error) {

        console.error(
          "Discord OAuth:",
          error
        );

        res
          .status(500)
          .send(
            "صار خطأ أثناء تسجيل الدخول"
          );
      }
    }
  );


  router.get(
    "/logout",
    (req, res) => {

      req.session.destroy(
        () =>
          res.redirect(
            "/login"
          )
      );
    }
  );


  return router;
};
