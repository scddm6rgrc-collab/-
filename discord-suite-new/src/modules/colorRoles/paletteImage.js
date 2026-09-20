const {
  createCanvas
} = require("@napi-rs/canvas");

async function createPaletteImage(colors) {
  const columns = 4;

  const rows =
    Math.ceil(
      colors.length / columns
    );

  const columnWidth = 300;
  const rowHeight = 42;

  const width =
    columnWidth * columns;

  const height =
    85 + rows * rowHeight;

  const canvas =
    createCanvas(width, height);

  const ctx =
    canvas.getContext("2d");

  ctx.fillStyle = "#111318";

  ctx.fillRect(
    0,
    0,
    width,
    height
  );

  ctx.fillStyle = "#FFFFFF";

  ctx.font =
    "bold 28px sans-serif";

  ctx.fillText(
    "COLOR ROLES",
    28,
    42
  );

  ctx.fillStyle = "#9CA3AF";

  ctx.font =
    "17px sans-serif";

  ctx.fillText(
    "Choose your name color",
    28,
    68
  );

  colors.forEach(
    (color, index) => {

      const column =
        Math.floor(
          index / rows
        );

      const row =
        index % rows;

      const x =
        column *
          columnWidth +
        20;

      const y =
        90 +
        row * rowHeight;

      ctx.fillStyle =
        color.hex;

      ctx.beginPath();

      ctx.roundRect(
        x,
        y,
        45,
        27,
        5
      );

      ctx.fill();

      ctx.fillStyle =
        "#FFFFFF";

      ctx.font =
        "bold 14px sans-serif";

      const number =
        String(
          color.index
        ).padStart(
          3,
          "0"
        );

      ctx.fillText(
        `${number}  ${color.name}`,
        x + 58,
        y + 13
      );

      ctx.fillStyle =
        "#9CA3AF";

      ctx.font =
        "12px monospace";

      ctx.fillText(
        color.hex,
        x + 58,
        y + 27
      );
    }
  );

  return canvas.encode(
    "png"
  );
}

module.exports = {
  createPaletteImage
};
