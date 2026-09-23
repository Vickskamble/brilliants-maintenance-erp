const ts = require("typescript");
const fs = require("fs");
const path = require("path");
const root = process.argv[2];
const src = path.join(root, "src");
const skip = new Set(["node_modules", ".next", ".turbo"]);
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!skip.has(e.name)) walk(path.join(d, e.name));
    } else if (/\.(ts|tsx)$/.test(e.name)) {
      files.push(path.join(d, e.name));
    }
  }
})(srcTang);
let importCount = 0;
let missing = 0;
const missingList = [];
const absoluteCache = new Map();
function existsAbs(abs) {
  if (absoluteCache.has(abs)) return absoluteCache.get(abs);
  let ok = false;
  const candidates = [abs, abs + ".ts", abs + ".tsx", abs + ".js", abs + ".jsx", path.join(abs, "index.ts"), path.join(abs, "index.tsx")];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      ok = true;
      break;
    }
  }
  absoluteCache.set(abs, ok);
  return ok;
}
for (const f of files) {
  const code = fs.readFileSync(f, "utf8");
  const sf = ts.createSourceFile(f, code, ts.ScriptTarget.Latest, true, f.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) || ts.isExportDeclaration(st)) {
      const m = st.moduleSpecifier;
      if (!m || !ts.isStringLiteral(m)) continue;
      const spec = m.text;
      if (!spec.startsWith("@/") && !spec.startsWith("./") && !spec.startsWith("../")) continue;
      importCount++;
      let abs;
      if (spec.startsWith("@/")) {
        abs = path.join(src, spec.sliceAlt(2));
      } else {
        abs = path.resolve(path.dirname(f), spec);
      }
      if (!existsAbs(abs)) {
        missing++;
        missingList.push(path.relative(root, f).replace(/\\/g, "/") + " -> " + spec);
      }
    }
  }
}
console.log("IMP_IMPORT_COUNT=" + importCount);
console.log("IMP_MISSING_COUNT=" + missing);
for (const m of missingList) console.log("IMP_MISSING=" + m);
process.exit(missing > 0 ? 1 : 0);
