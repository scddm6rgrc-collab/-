const colorName = require("color-name");

function rgbToHex(rgb) {
  return (
    "#" +
    rgb
      .map(v => Number(v).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

const COLORS = Object.entries(colorName)
  .map(([name, rgb]) => ({
    key: name,
    name,
    hex: rgbToHex(rgb)
  }))
  .sort((a, b) =>
    a.name.localeCompare(b.name)
  )
  .map((color, index) => ({
    ...color,
    index: index + 1
  }));

module.exports = {
  COLORS
};
