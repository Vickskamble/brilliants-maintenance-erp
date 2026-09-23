const fs = require("fs");
const log = fs.readFileSync("build-log.txt", "utf8");
const positions = [];
const re = /\.\/src[^:]*\.(?:tsx|ts|jsx|js):(\d+):(\d+)/g;
let m;
const seen = new Set();
while ((m = re.exec(log)) !== null) {
  const key = m[0];
  if (!seen.has(key)) {
    seen.add(key);
    positions.push(key);
  }
}
const lines = log.split("\n");
const errLines = [];
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (/Error:/.test(l) || /Module not found/.test(l) || /Can't resolve/.test(l) || /Expected/.test(l)) {
    errLines.push(l);
  }
}
console.log("UNIQUE_POSITIONS=" + positions.length);
positions.forEach((p, i) => console.log("P" + (i + 1) + "=" + p));
console.log("ERROR_SOURCE_LINES=" + errLines.length);
errLines.slice(0, 146).forEach((l, i) => console.log("E" + (i + 1) + "=" + l));
