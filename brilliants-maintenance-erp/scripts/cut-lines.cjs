const fs = require("fs");
const target = process.argv[2];
const from = parseInt(process.argv[3], 10);
const to = parseInt(process.argv[4], 10);
const lines = fs.readFileSync(target, "utf8").split(/\r?\n/);
const before = lines.length;
const out = lines.filter((_, i) => i < from || i > to);
fs.writeFileSync(target, out.join("\n"), "utf8");
console.log("CUT_BEFORE=" + before + " CUT_AFTER=" + out.length + " CUT_REMOVED=" + (before - out.length));
