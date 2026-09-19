// Writes typography.css, color.css, spacing.css and radius.css from their
// *.config.js files.  Usage: node design-tokens/build.js
const fs = require("fs");
const path = require("path");
const typeConfig = require("./typography.config.js");
const { generateTypographyCSS } = require("./generate-css.js");
const colorConfig = require("./color.config.js");
const { generateColorCSS, resolvePalette } = require("./generate-color-css.js");
const spacingConfig = require("./spacing.config.js");
const { generateSpacingCSS } = require("./generate-spacing-css.js");
const radiusConfig = require("./radius.config.js");
const { generateRadiusCSS } = require("./generate-radius-css.js");

const typeOutFile = path.join(__dirname, "typography.css");
fs.writeFileSync(typeOutFile, generateTypographyCSS(typeConfig));
console.log(`Wrote ${path.relative(process.cwd(), typeOutFile)}`);

const colorOutFile = path.join(__dirname, "color.css");
fs.writeFileSync(colorOutFile, generateColorCSS(colorConfig));
console.log(`Wrote ${path.relative(process.cwd(), colorOutFile)}`);

const spacingOutFile = path.join(__dirname, "spacing.css");
fs.writeFileSync(spacingOutFile, generateSpacingCSS(spacingConfig));
console.log(`Wrote ${path.relative(process.cwd(), spacingOutFile)}`);

const radiusOutFile = path.join(__dirname, "radius.css");
fs.writeFileSync(radiusOutFile, generateRadiusCSS(radiusConfig));
console.log(`Wrote ${path.relative(process.cwd(), radiusOutFile)}`);

const palette = resolvePalette(colorConfig);
for (const [brand, byMode] of Object.entries(palette.accentTextInfo)) {
  for (const [mode, info] of Object.entries(byMode)) {
    if (!info.ok) {
      console.warn(
        `WARNING: accent-text for ${brand}/${mode} could not reach 7:1 against bg; ` +
        `falling back to step ${info.step} (${info.hex}, ${info.contrast.toFixed(2)}:1).`
      );
    }
  }
}

for (const [brand, byMode] of Object.entries(palette.accentFillInfo)) {
  for (const [mode, info] of Object.entries(byMode)) {
    if (!info.ok) {
      const bgPart = mode === "dark" ? `${info.bgContrast.toFixed(2)}:1 vs bg, ` : "";
      console.warn(
        `WARNING: accent fill for ${brand}/${mode} could not find a step with a legible ` +
        `label${mode === "dark" ? " and >= 3:1 vs bg" : ""}; falling back to step ${info.step} ` +
        `(${info.hex}, ${bgPart}${info.textContrast.toFixed(2)}:1 text).`
      );
    }
  }
}
