const express = require("express");
const crypto = require("crypto");
const { canManageGuild } = require("../core/access");

module.exports = function authRouter(client, config) {
  const router = express.Router();

  router.get("/discord", (req, res) => {
    const state = crypto.randomBytes(16).toString("hex");
    req.session.oauthState = state;

    const params = new URLSearchParams({
      client_id: config.discord.clientId,
      response_type: "code",
      redirect_uri: config.discord.redirectUri,
      scope: "identify guilds",
      state
    });

    res.redirect(`https://discord.com/oauth2/authorize?${params}`);
  });

  router.get("/callback", async (req, res) => {
    try {
      if (!req.query.code || req.query.state !== req.session.oauthState) {
        return res.status(403).send("OAuth state غير صالح");
      }

      delete req.session.oauthState;

      const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: config.discord.clientId,
          client_secret: config.discord.clientSecret,
          grant_type: "authorization_code",
          code: req.query.code,
          redirect_uri: config.discord.redirectUri
        })
      });

      const tokenData = await tokenResponse.json();
      if (!tokenData.access_token) return res.status(400).send("فشل تسجيل الدخول بالديسكورد");

      const headers = { Authorization: `Bearer ${tokenData.access_token}` };
      const [userResponse, guildResponse] = await Promise.all([
        fetch("https://discord.com/api/users/@me", { headers }),
        fetch("https://discord.com/api/users/@me/guilds", { headers })
      ]);

      const user = await userResponse.json();
      const guilds = await guildResponse.json();

      const allowedGuilds = guilds
        .filter(canManageGuild)
        .filter(g => client.guilds.cache.has(g.id))
        .map(g => ({ id: g.id, name: g.name, icon: g.icon }));

      req.session.user = {
        id: user.id,
        username: user.username,
        globalName: user.global_name,
        avatar: user.avatar,
        guilds: allowedGuilds
      };

      res.redirect("/");
    } catch (error) {
      console.error(error);
      res.status(500).send("صار خطأ أثناء تسجيل الدخول");
    }
  });

  router.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/login"));
  });

  return router;
};
