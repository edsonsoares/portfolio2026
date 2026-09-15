// Writes typography.css and color.css from their *.config.js files.  Usage: node design-tokens/build.js
const fs = require("fs");
const path = require("path");
const typeConfig = require("./typography.config.js");
const { generateTypographyCSS } = require("./generate-css.js");
const colorConfig = require("./color.config.js");
const { generateColorCSS } = require("./generate-color-css.js");

const typeOutFile = path.join(__dirname, "typography.css");
fs.writeFileSync(typeOutFile, generateTypographyCSS(typeConfig));
console.log(`Wrote ${path.relative(process.cwd(), typeOutFile)}`);

const colorOutFile = path.join(__dirname, "color.css");
fs.writeFileSync(colorOutFile, generateColorCSS(colorConfig));
console.log(`Wrote ${path.relative(process.cwd(), colorOutFile)}`);
