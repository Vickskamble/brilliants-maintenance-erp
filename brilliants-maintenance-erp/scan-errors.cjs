const fs = require("fs");
const log = fs.readFileSync("build-log.txt", "utf8");
const lines = log.split("\n");
const seen = new Map();
const errLines = [];
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (/Error:|\.tsx:|\.ts:|\.jsx:|\.mjs:/i.test(l)) {
    if (/^\s*(?:Error|\.\/|\d+)/.test(l) || /Error/i.test(l) || /\.(tsx|ts|jsx)/.test(l)) {
      errLines.push(l);
    }
  }
}
let count = 0;
for (const l of errLines) {
  const m = l.match(/(?:\.\/|\.\.\/)?([^\s:]+\.(?:tsx|ts|jsx))[:\s](\d+)(?::(\d+))?/);
  if (m) {
    const key = m[1] + ":" + m[2] + (m[3] ? ":" + m[3] : "");
    count++;
    if (!seen.has(key) && count <= 500) {
      seen.set(key, true);
    }
  }
}
console.log("ERROR_LINE_COUNT=" + count);
console.log("UNIQUE_COUNT=" + seen.size);
let n = 0;
for (const k of seen.keys()) {
  n++;
  console.log("P" + n + "=" + k);
}
