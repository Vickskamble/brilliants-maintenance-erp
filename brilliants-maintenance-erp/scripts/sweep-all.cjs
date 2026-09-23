const ts = require("typescript");
const fs = require("fs");
const path = require("path");
const root = process.argv[2];
const src = path.join(root, "src");
const skip = new Set(["node_modules", ".next", ".turbo", "public", "build"]);
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!skip.has(e.name)) walk(path.join(d, e.name));
    } else if (/\.(ts|tsx)$/.test(e.name)) {
      files.push(path.join(d, e.name));
    }
  }
})(src);
let pass = 0;
let fail = 0;
const failed = [];
for (const f of files) {
  try {
    ts.createSourceFile(
      f,
      fs.readFileSync(f, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      f.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
    pass++;
  } catch (e) {
    fail++;
    failed.push(path.relative(root, f));
  }
}
console.log("TOTAL_PASS=" + pass + " TOTAL_FAIL=" + fail);
for (const f of failed) console.log("BROKEN_FILE=" + f);
process.exit(fail > 0 ? 1 : 0);
