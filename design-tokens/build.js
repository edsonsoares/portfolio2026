// Writes typography.css from typography.config.js.  Usage: node design-tokens/build.js
const fs = require("fs");
const path = require("path");
const config = require("./typography.config.js");
const { generateTypographyCSS } = require("./generate-css.js");

const outFile = path.join(__dirname, "typography.css");
fs.writeFileSync(outFile, generateTypographyCSS(config));
console.log(`Wrote ${path.relative(process.cwd(), outFile)}`);
