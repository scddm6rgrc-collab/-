const {
  createCanvas,
  loadImage
} = require("@napi-rs/canvas");

function round(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

async function getImage(url) {
  try {
    const response = await fetch(url);
    const buffer = Buffer.from(
      await response.arrayBuffer()
    );

    return await loadImage(buffer);
  } catch {
    return null;
  }
}

async function createRankCard({
  guild,
  member,
  stats,
  rank,
  progress,
  theme
}) {
  const canvas = createCanvas(1200, 500);
  const ctx = canvas.getContext("2d");

  const background =
    theme.backgroundImage
      ? await getImage(theme.backgroundImage)
      : null;

  if (background) {
    ctx.drawImage(background, 0, 0, 1200, 500);
  } else {
    const gradient =
      ctx.createLinearGradient(0, 0, 1200, 500);

    gradient.addColorStop(0, "#071d34");
    gradient.addColorStop(1, "#052b33");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 500);
  }

  ctx.fillStyle = "rgba(5,10,25,.35)";
  round(ctx, 25, 25, 1150, 450, 30);
  ctx.fill();

  const avatar =
    await getImage(
      member.user.displayAvatarURL({
        extension: "png",
        size: 256
      })
    );

  const ax = 70;
  const ay = 110;
  const size = 210;

  ctx.beginPath();
  ctx.arc(
    ax + size / 2,
    ay + size / 2,
    size / 2 + 9,
    0,
    Math.PI * 2
  );

  ctx.fillStyle =
    theme.circleColor || "#5865f2";

  ctx.fill();

  ctx.save();

  ctx.beginPath();
  ctx.arc(
    ax + size / 2,
    ay + size / 2,
    size / 2,
    0,
    Math.PI * 2
  );

  ctx.clip();

  if (avatar) {
    ctx.drawImage(
      avatar,
      ax,
      ay,
      size,
      size
    );
  }

  ctx.restore();

  ctx.fillStyle =
    theme.textColor || "#ffffff";

  ctx.font =
    "bold 54px sans-serif";

  ctx.fillText(
    member.displayName.slice(0, 25),
    350,
    145
  );

  ctx.fillStyle =
    "rgba(255,255,255,.65)";

  ctx.font =
    "bold 19px sans-serif";

  ctx.fillText(
    guild.name,
    352,
    180
  );

  ctx.fillStyle =
    theme.textColor || "#ffffff";

  ctx.font =
    "bold 22px sans-serif";

  ctx.fillText("RANK", 950, 75);
  ctx.fillText("LVL", 1080, 75);

  ctx.font =
    "bold 52px sans-serif";

  ctx.fillText(
    `#${rank || "-"}`,
    945,
    130
  );

  ctx.fillText(
    `${progress.level}`,
    1080,
    130
  );

  const boxX = 350;
  const boxY = 205;
  const boxW = 765;
  const boxH = 90;

  round(
    ctx,
    boxX,
    boxY,
    boxW,
    boxH,
    18
  );

  ctx.fillStyle =
    "rgba(255,255,255,.10)";

  ctx.fill();

  const info = [
    ["XP", Number(stats.xp || 0).toLocaleString()],
    ["MSGS", Number(stats.messages || 0).toLocaleString()],
    ["RANK", `#${rank || "-"}`],
    ["LEVEL", String(progress.level)]
  ];

  ctx.textAlign = "center";

  info.forEach((item, i) => {
    const w = boxW / 4;
    const x = boxX + i * w + w / 2;

    ctx.fillStyle =
      theme.textColor || "#ffffff";

    ctx.font =
      "bold 18px sans-serif";

    ctx.fillText(
      item[0],
      x,
      boxY + 30
    );

    ctx.font =
      "bold 27px sans-serif";

    ctx.fillText(
      item[1],
      x,
      boxY + 67
    );
  });

  ctx.textAlign = "left";

  const currentXp =
    Number(stats.xp || 0) -
    progress.current;

  const needed =
    progress.next -
    progress.current;

  ctx.fillStyle =
    theme.barTextColor || "#ffffff";

  ctx.font =
    "bold 27px sans-serif";

  ctx.fillText(
    `${currentXp}/${needed} XP`,
    650,
    350
  );

  const barX = 350;
  const barY = 375;
  const barW = 765;
  const barH = 52;

  round(
    ctx,
    barX,
    barY,
    barW,
    barH,
    26
  );

  ctx.fillStyle =
    "rgba(255,255,255,.14)";

  ctx.fill();

  const fillWidth =
    Math.max(
      52,
      barW * progress.ratio
    );

  round(
    ctx,
    barX,
    barY,
    Math.min(barW, fillWidth),
    barH,
    26
  );

  ctx.fillStyle =
    theme.progressBarColor ||
    "#5865f2";

  ctx.fill();

  ctx.textAlign = "right";

  ctx.fillStyle =
    theme.barTextColor || "#ffffff";

  ctx.font =
    "bold 27px sans-serif";

  ctx.fillText(
    `${Math.round(progress.ratio * 100)}%`,
    1090,
    410
  );

  return canvas.encode("png");
}

module.exports = {
  createRankCard
};
