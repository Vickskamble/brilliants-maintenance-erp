const ts = require("typescript");
const fs = require("fs");
const path = require("path");
const root = process.argv[2];
const srcRoot = path.join(root, "src");
const skip = new Set(["node_modules", ".next", ".turbo", "public", "build", ".cache"]);
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!skip.has(e.name)) walk(path.join(d, e.name));
    } else if (/\.(ts|tsx)$/.test(e.name)) {
      files.push(path.join(d, e.name));
    }
  }
})(srcRoot);
let pass = 0;
let fail = 0;
const bad = [];
for (const f of files) {
  const kind = f.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  try {
    ts.createSourceFile(f, fs.readFileSync(f, "utf8"), ts.ScriptTarget.Latest, true, kind);
    pass++;
  } catch (e) {
    fail++;
    bad.push(path.relative(srcRoot, f).replace(/\\/g, "/"));
  }
}
console.log("SWEEP_TOTAL_FILES=" + files.length);
console.log("SWEEP_PASS=" + pass + " SWEEP_FAIL=" + fail);
for (const b of bad) console.log("SWEEP_BAD=" + b);
process.exit(fail > 0 ? 1 : 0);
