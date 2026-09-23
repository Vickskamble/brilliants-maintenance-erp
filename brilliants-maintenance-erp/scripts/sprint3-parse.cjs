const ts = require("typescript");
const fs = require("fs");
const path = require("path");

const root = process.argv[2];
const skip = new Set(["node_modules", ".next", ".turbo", "public", "build"]);
const targets = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!skip.has(e.name)) walk(path.join(d, e.name));
    } else if (/\.(tsx?|jsx?|cjs)$/.test(e.name)) {
      targets.push(path.join(d, e.name));
    }
  }
})(path.join(root, "src"));

let pass = 0;
let fail = 0;
const failedFiles = [];
for (const f of targets) {
  const ext = path.extname(f);
  const kind = /\.(jsx|tsx)$/.test(ext) ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  try {
    ts.createSourceFile(
      f,
      fs.readFileSync(f, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      kind
    );
    pass++;
  } catch (e) {
    fail++;
    failedFiles.push(path.relative(root, f));
  }
}
console.log("PASS_COUNT=" + pass);
console.log("FAIL_COUNT=" + fail);
for (const f of failedFiles) console.log("FAILFILE=" + f);
process.exit(fail > 0 ? 1 : 0);
