const ts = require("typescript");
const fs = require("fs");
const path = require("path");
const root = process.argv[2];
const skip = new Set(["node_modules", ".next", ".turbo", "public"]);
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!skip.has(e.name)) walk(path.join(d, e.name));
    } else if (/\.(ts|tsx)$/.test(e.name)) {
      files.push(path.join(d, e.name));
    }
  }
})(path.join(root, "src"));
let pass = 0;
let fail = 0;
for (const f of files) {
  try {
    ts.createSourceFile(
      f,
      fs.readFileSync(f, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );
    pass++;
  } catch {
    fail++;
    console.log("FAIL " + path.relative(root, f));
  }
}
console.log("PASS_COUNT=" + pass + " FAIL_COUNT=" + fail);
process.exit(fail > 0 ? 1 : 0);
