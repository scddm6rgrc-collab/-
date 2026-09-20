const {
  createCanvas,
  loadImage
} = require("@napi-rs/canvas");


function roundedRect(
  ctx,
  x,
  y,
  width,
  height,
  radius
) {
  const r = Math.min(
    radius,
    width / 2,
    height / 2
  );

  ctx.beginPath();

  ctx.moveTo(x + r, y);

  ctx.lineTo(
    x + width - r,
    y
  );

  ctx.quadraticCurveTo(
    x + width,
    y,
    x + width,
    y + r
  );

  ctx.lineTo(
    x + width,
    y + height - r
  );

  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - r,
    y + height
  );

  ctx.lineTo(
    x + r,
    y + height
  );

  ctx.quadraticCurveTo(
    x,
    y + height,
    x,
    y + height - r
  );

  ctx.lineTo(
    x,
    y + r
  );

  ctx.quadraticCurveTo(
    x,
    y,
    x + r,
    y
  );

  ctx.closePath();
}


async function avatar(url) {
  try {
    const response =
      await fetch(url);

    const buffer =
      Buffer.from(
        await response.arrayBuffer()
      );

    return await loadImage(buffer);

  } catch {
    return null;
  }
}


async function createLeaderboardImage(
  guild,
  users,
  levelService
) {
  const width = 1100;

  const rowHeight = 102;
  const gap = 15;

  const top = 90;
  const bottom = 35;

  const height =
    top +
    users.length *
      (rowHeight + gap) +
    bottom;

  const canvas =
    createCanvas(width, height);

  const ctx =
    canvas.getContext("2d");


  // BACKGROUND
  ctx.fillStyle = "#111318";
  ctx.fillRect(
    0,
    0,
    width,
    height
  );


  // TITLE
  ctx.fillStyle = "#ffffff";

  ctx.font =
    "bold 36px sans-serif";

  ctx.fillText(
    `${guild.name} • Leaderboard`,
    55,
    55
  );


  const badgeColors = [
    "#FFD43B",
    "#D9D9D9",
    "#E98A15"
  ];


  for (
    let i = 0;
    i < users.length;
    i++
  ) {
    const user =
      users[i];

    const y =
      top +
      i * (rowHeight + gap);


    // CARD
    roundedRect(
      ctx,
      50,
      y,
      width - 100,
      rowHeight,
      24
    );

    ctx.fillStyle =
      "#36393F";

    ctx.fill();


    // AVATAR
    const avatarImage =
      await avatar(
        user.avatarURL
      );

    const avatarX = 75;
    const avatarY = y + 13;
    const avatarSize = 76;

    ctx.save();

    ctx.beginPath();

    ctx.arc(
      avatarX +
        avatarSize / 2,

      avatarY +
        avatarSize / 2,

      avatarSize / 2,
      0,
      Math.PI * 2
    );

    ctx.clip();

    if (avatarImage) {
      ctx.drawImage(
        avatarImage,
        avatarX,
        avatarY,
        avatarSize,
        avatarSize
      );
    } else {
      ctx.fillStyle =
        "#5865F2";

      ctx.fillRect(
        avatarX,
        avatarY,
        avatarSize,
        avatarSize
      );
    }

    ctx.restore();


    // RANK BADGE
    const badgeX = 175;

    roundedRect(
      ctx,
      badgeX,
      y + 27,
      64,
      50,
      12
    );

    ctx.fillStyle =
      badgeColors[i] ||
      "#232428";

    ctx.fill();

    ctx.fillStyle =
      i === 1
        ? "#202124"
        : "#ffffff";

    ctx.font =
      "bold 24px sans-serif";

    ctx.textAlign =
      "center";

    ctx.fillText(
      `#${i + 1}`,
      badgeX + 32,
      y + 60
    );


    // USERNAME
    ctx.textAlign =
      "left";

    ctx.font =
      "bold 17px sans-serif";

    ctx.fillStyle =
      "#CACDD2";

    ctx.fillText(
      user.displayName.slice(
        0,
        24
      ),
      270,
      y + 29
    );


    const progress =
      levelService.progress(
        user.xp
      );


    // PROGRESS BACKGROUND
    const barX = 270;
    const barY = y + 42;
    const barWidth = 760;
    const barHeight = 43;

    roundedRect(
      ctx,
      barX,
      barY,
      barWidth,
      barHeight,
      22
    );

    ctx.fillStyle =
      "#202225";

    ctx.fill();


    // PROGRESS COLOR
    const fillWidth =
      Math.max(
        barHeight,
        barWidth *
          progress.ratio
      );

    roundedRect(
      ctx,
      barX,
      barY,
      Math.min(
        fillWidth,
        barWidth
      ),
      barHeight,
      22
    );

    if (i === 0) {
      ctx.fillStyle =
        "#31A8DF";
    } else if (
      i === 1 ||
      i === 2
    ) {
      ctx.fillStyle =
        "#F25787";
    } else {
      ctx.fillStyle =
        "#5865F2";
    }

    ctx.fill();


    // LEVEL TEXT
    ctx.fillStyle =
      "#ffffff";

    ctx.font =
      "bold 22px sans-serif";

    ctx.fillText(
      `Level ${progress.level}`,
      barX + 22,
      barY + 29
    );


    // XP
    ctx.textAlign =
      "right";

    ctx.font =
      "16px sans-serif";

    ctx.fillStyle =
      "#ffffff";

    ctx.fillText(
      `${user.xp.toLocaleString()} XP`,
      barX +
        barWidth -
        18,
      barY + 28
    );

    ctx.textAlign =
      "left";
  }


  return await canvas.encode(
    "png"
  );
}


module.exports = {
  createLeaderboardImage
};
