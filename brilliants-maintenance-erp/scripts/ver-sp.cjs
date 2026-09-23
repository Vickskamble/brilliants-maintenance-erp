const ts = require("typescript");
const fs = require("fs");
const path = require("path");
const root = process.argv[2];
const targets = [];
const base = path.join(root, "src", "app", "spare-parts");
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) walk(path.join(d, e.name));
    else if (e.name.endsWith(".tsx")) targets.push(path.join(d, e.name));
  }
})(base);
let pass = 0;
let fail = 0;
for (const f of targets) {
  try {
    ts.createSourceFile(f, fs.readFileSync(f, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    pass++;
  } catch (e) {
    fail++;
    console.log("BROKEN=" + path.relative(root, f));
  }
}
console.log("SP_PAGES_PASS=" + pass + " SP_PAGES_FAIL=" + fail);
process.exit(fail > 0 ? 1 : 0);
