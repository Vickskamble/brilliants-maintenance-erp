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
const failed = [];
for (const f of files) {
  const isTsx = f.endsWith(".tsx");
  try {
    ts.createSourceFile(
      f,
      fs.readFileSync(f, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
    pass++;
  } catch (e) {
    fail++;
    failed.push(path.relative(root, f).replace(/\\/g, "/"));
  }
}
console.log("PASS=" + pass + " FAIL=" + fail);
for (const f of failed) console.log("BROKEN=" + f);
const sp = files.filter((f) => /[\/\\]spare-parts[\/\\]/.test(f));
for (const f of sp.slice().sort()) console.log("SP=" + path.relative(root, f).replace(/\\/g, "/"));
process.exit(fail > 0 ? 1 : 0);
