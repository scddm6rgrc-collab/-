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

    if (!response.ok) return null;

    const buffer = Buffer.from(
      await response.arrayBuffer()
    );

    return await loadImage(buffer);
  } catch {
    return null;
  }
}

function isArabic(text) {
  return /[\u0600-\u06FF]/.test(
    String(text || "")
  );
}

function fittedFont(
  ctx,
  text,
  maxWidth,
  maxSize = 54,
  minSize = 26,
  weight = "bold"
) {
  let size = maxSize;

  while (size > minSize) {
    ctx.font =
      `${weight} ${size}px sans-serif`;

    if (
      ctx.measureText(text).width <=
      maxWidth
    ) {
      break;
    }

    size -= 2;
  }

  return `${weight} ${size}px sans-serif`;
}

function drawFitText(
  ctx,
  text,
  x,
  y,
  maxWidth,
  options = {}
) {
  const value =
    String(text || "");

  const arabic =
    isArabic(value);

  ctx.font =
    fittedFont(
      ctx,
      value,
      maxWidth,
      options.maxSize || 54,
      options.minSize || 26,
      options.weight || "bold"
    );

  ctx.fillStyle =
    options.color ||
    "#ffffff";

  ctx.textBaseline =
    "alphabetic";

  if (arabic) {
    ctx.direction = "rtl";
    ctx.textAlign = "right";

    ctx.fillText(
      value,
      x + maxWidth,
      y,
      maxWidth
    );
  } else {
    ctx.direction = "ltr";
    ctx.textAlign = "left";

    ctx.fillText(
      value,
      x,
      y,
      maxWidth
    );
  }

  ctx.direction = "ltr";
  ctx.textAlign = "left";
}

async function createRankCard({
  guild,
  member,
  stats,
  rank,
  progress,
  theme
}) {
  const WIDTH = 1200;
  const HEIGHT = 500;

  const canvas =
    createCanvas(
      WIDTH,
      HEIGHT
    );

  const ctx =
    canvas.getContext("2d");

  const background =
    theme.backgroundImage
      ? await getImage(
          theme.backgroundImage
        )
      : null;

  if (background) {
    ctx.drawImage(
      background,
      0,
      0,
      WIDTH,
      HEIGHT
    );

    ctx.fillStyle =
      "rgba(0,10,25,.40)";

    ctx.fillRect(
      0,
      0,
      WIDTH,
      HEIGHT
    );
  } else {
    const gradient =
      ctx.createLinearGradient(
        0,
        0,
        WIDTH,
        HEIGHT
      );

    gradient.addColorStop(
      0,
      "#071d34"
    );

    gradient.addColorStop(
      1,
      "#052b33"
    );

    ctx.fillStyle =
      gradient;

    ctx.fillRect(
      0,
      0,
      WIDTH,
      HEIGHT
    );
  }

  // البطاقة الداخلية
  round(
    ctx,
    25,
    25,
    1150,
    450,
    30
  );

  ctx.fillStyle =
    "rgba(5,10,25,.35)";

  ctx.fill();


  // =========================
  // AVATAR
  // =========================

  const avatar =
    await getImage(
      member.user.displayAvatarURL({
        extension: "png",
        size: 256
      })
    );

  const ax = 65;
  const ay = 118;
  const avatarSize = 200;

  ctx.beginPath();

  ctx.arc(
    ax + avatarSize / 2,
    ay + avatarSize / 2,
    avatarSize / 2 + 9,
    0,
    Math.PI * 2
  );

  ctx.fillStyle =
    theme.circleColor ||
    "#5865f2";

  ctx.fill();

  ctx.save();

  ctx.beginPath();

  ctx.arc(
    ax + avatarSize / 2,
    ay + avatarSize / 2,
    avatarSize / 2,
    0,
    Math.PI * 2
  );

  ctx.clip();

  if (avatar) {
    ctx.drawImage(
      avatar,
      ax,
      ay,
      avatarSize,
      avatarSize
    );
  } else {
    ctx.fillStyle =
      "#202938";

    ctx.fillRect(
      ax,
      ay,
      avatarSize,
      avatarSize
    );
  }

  ctx.restore();


  // =========================
  // NAME
  // =========================

  const nameX = 325;
  const nameWidth = 515;

  drawFitText(
    ctx,
    member.displayName,
    nameX,
    142,
    nameWidth,
    {
      maxSize: 50,
      minSize: 25,
      color:
        theme.textColor ||
        "#ffffff"
    }
  );


  // اسم السيرفر
  drawFitText(
    ctx,
    guild.name,
    nameX,
    177,
    nameWidth,
    {
      maxSize: 18,
      minSize: 12,
      weight: "normal",
      color:
        "rgba(255,255,255,.60)"
    }
  );


  // =========================
  // RANK / LEVEL BOX
  // =========================

  const topBoxX = 875;
  const topBoxY = 52;
  const topBoxW = 250;
  const topBoxH = 112;

  round(
    ctx,
    topBoxX,
    topBoxY,
    topBoxW,
    topBoxH,
    18
  );

  ctx.fillStyle =
    "rgba(0,0,0,.18)";

  ctx.fill();

  // Separator
  ctx.fillStyle =
    "rgba(255,255,255,.12)";

  ctx.fillRect(
    topBoxX + 125,
    topBoxY + 18,
    1,
    topBoxH - 36
  );

  ctx.textAlign =
    "center";

  ctx.fillStyle =
    "rgba(255,255,255,.68)";

  ctx.font =
    "bold 18px sans-serif";

  ctx.fillText(
    "RANK",
    topBoxX + 62,
    topBoxY + 30
  );

  ctx.fillText(
    "LVL",
    topBoxX + 188,
    topBoxY + 30
  );

  ctx.fillStyle =
    theme.textColor ||
    "#ffffff";

  ctx.font =
    "bold 42px sans-serif";

  ctx.fillText(
    `#${rank || "-"}`,
    topBoxX + 62,
    topBoxY + 84
  );

  ctx.fillText(
    String(progress.level),
    topBoxX + 188,
    topBoxY + 84
  );


  // =========================
  // STATS
  // =========================

  const boxX = 325;
  const boxY = 205;
  const boxW = 800;
  const boxH = 92;

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
    [
      "XP",
      Number(
        stats.xp || 0
      ).toLocaleString()
    ],
    [
      "MSGS",
      Number(
        stats.messages || 0
      ).toLocaleString()
    ],
    [
      "RANK",
      `#${rank || "-"}`
    ],
    [
      "LEVEL",
      String(
        progress.level
      )
    ]
  ];

  const colWidth =
    boxW / info.length;

  info.forEach(
    (item, i) => {
      const x =
        boxX +
        i * colWidth;

      if (i > 0) {
        ctx.fillStyle =
          "rgba(255,255,255,.08)";

        ctx.fillRect(
          x,
          boxY + 18,
          1,
          boxH - 36
        );
      }

      ctx.textAlign =
        "center";

      ctx.fillStyle =
        "rgba(255,255,255,.67)";

      ctx.font =
        "bold 15px sans-serif";

      ctx.fillText(
        item[0],
        x + colWidth / 2,
        boxY + 30
      );

      ctx.fillStyle =
        theme.textColor ||
        "#ffffff";

      ctx.font =
        "bold 25px sans-serif";

      ctx.fillText(
        item[1],
        x + colWidth / 2,
        boxY + 68
      );
    }
  );


  // =========================
  // XP PROGRESS
  // =========================

  const currentXp =
    Math.max(
      0,
      Number(stats.xp || 0) -
      progress.current
    );

  const needed =
    Math.max(
      1,
      progress.next -
      progress.current
    );

  ctx.textAlign =
    "center";

  ctx.fillStyle =
    theme.textColor ||
    "#ffffff";

  ctx.font =
    "bold 25px sans-serif";

  ctx.fillText(
    `${currentXp.toLocaleString()}/${needed.toLocaleString()} XP`,
    boxX + boxW / 2,
    350
  );


  const barX = 325;
  const barY = 375;
  const barW = 800;
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


  const ratio =
    Math.max(
      0,
      Math.min(
        1,
        Number(
          progress.ratio || 0
        )
      )
    );

  if (ratio > 0) {
    const fillWidth =
      Math.max(
        barH,
        barW * ratio
      );

    round(
      ctx,
      barX,
      barY,
      Math.min(
        barW,
        fillWidth
      ),
      barH,
      26
    );

    ctx.fillStyle =
      theme.progressBarColor ||
      "#5865f2";

    ctx.fill();
  }


  // النسبة داخل الشريط
  ctx.textAlign =
    "right";

  ctx.fillStyle =
    theme.barTextColor ||
    "#ffffff";

  ctx.font =
    "bold 25px sans-serif";

  ctx.fillText(
    `${Math.round(
      ratio * 100
    )}%`,
    barX + barW - 20,
    barY + 35
  );

  ctx.textAlign =
    "left";

  return canvas.encode(
    "png"
  );
}

module.exports = {
  createRankCard
};
