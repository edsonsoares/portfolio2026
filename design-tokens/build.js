// Writes typography.css, color.css, spacing.css, radius.css, layout.css and motion.css from their
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
const caseStudyMarkup = require("./templates/case-study.markup.js");
const motionConfig = require("./motion.config.js");
const { generateMotionCSS } = require("./generate-motion-css.js");
const layoutConfig = require("./layout.config.js");
const { generateLayoutCSS } = require("./generate-layout-css.js");

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

const layoutOutFile = path.join(__dirname, "layout.css");
fs.writeFileSync(layoutOutFile, generateLayoutCSS(layoutConfig));
console.log(`Wrote ${path.relative(process.cwd(), layoutOutFile)}`);

const motionOutFile = path.join(__dirname, "motion.css");
fs.writeFileSync(motionOutFile, generateMotionCSS(motionConfig));
console.log(`Wrote ${path.relative(process.cwd(), motionOutFile)}`);

// Standalone case study template, generated from the same markup the playground scene uses.
const caseStudyFile = path.join(__dirname, "templates", "case-study.html");
fs.writeFileSync(caseStudyFile, `<!doctype html>
<!-- Generated from templates/case-study.markup.js by build.js — edit the markup there, not here. -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Case study template</title>
<link rel="stylesheet" href="../typography.css">
<link rel="stylesheet" href="../color.css">
<link rel="stylesheet" href="../spacing.css">
<link rel="stylesheet" href="../radius.css">
<link rel="stylesheet" href="../layout.css">
<link rel="stylesheet" href="../motion.css">
<link rel="stylesheet" href="case-study.css">
<style>body { margin: 0; }</style>
</head>
<!-- data-brand: portfolio | feelscience · data-mode: light | dark -->
<body data-brand="portfolio" data-mode="light">${caseStudyMarkup}<script src="../motion.js"></script></body>
</html>
`);
console.log(`Wrote ${path.relative(process.cwd(), caseStudyFile)}`);

const palette = resolvePalette(colorConfig);
// Accent subjects: every brand accent (on its own brand's neutrals), plus every client
// accent on each brand it can sit on. Rules an accent can't satisfy are reported, never
// silently relaxed.
const subjects = [];
for (const brand of Object.keys(palette.accentTextInfo)) {
  subjects.push({ label: `${brand}`, brand, text: palette.accentTextInfo[brand], fill: palette.accentFillInfo[brand] });
}
for (const [name, info] of Object.entries(palette.clientAccents)) {
  for (const brand of Object.keys(info.textInfo)) {
    subjects.push({ label: `client accent "${name}" on ${brand}`, brand, text: info.textInfo[brand], fill: info.fillInfo[brand] });
  }
}
for (const { label, text, fill } of subjects) {
  for (const [mode, info] of Object.entries(text)) {
    if (!info.ok) {
      console.warn(
        `WARNING: accent-text for ${label}/${mode} could not reach ${info.target}:1 against bg; ` +
        `falling back to step ${info.step} (${info.hex}, ${info.contrast.toFixed(2)}:1).`
      );
    }
  }
  for (const [mode, info] of Object.entries(fill)) {
    if (!info.ok) {
      const bgPart = mode === "dark" ? `${info.bgContrast.toFixed(2)}:1 vs bg, ` : "";
      console.warn(
        `WARNING: accent fill for ${label}/${mode} could not find a step with a legible ` +
        `label${mode === "dark" ? " and >= 3:1 vs bg" : ""}; falling back to step ${info.step} ` +
        `(${info.hex}, ${bgPart}${info.textContrast.toFixed(2)}:1 text).`
      );
    }
  }
}
