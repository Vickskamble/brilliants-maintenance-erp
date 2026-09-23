const ts=require("typescript");
const fs=require("fs");
const path=require("path");
const root=process.argv[2];
const skip=new Set(["node_modules",".next",".turbo","public"]);
const files=[];
(function walk(d){ for(const e of fs.readdirSync(d,{withFileTypes:true})){ if(e.isDirectory()){ if(!skip.has(e.name)) walk(path.join(d,e.name)); } else if(/\.(ts|tsx)$/.test(e.name)){ files.push(path.join(d,e.name)); } } })(path.join(root,"src"));
let pass=0,fail=0; const bad=[];
for(const f of files){ try{ ts.createSourceFile(f,fs.readFileSync(f,"utf8"),ts.ScriptTarget.Latest,true,f.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS); pass++; }catch(e){ fail++; bad.push(path.relative(root,f).replace(/\\/g,"/")); } }
console.log("BD_TOTAL_PASS="+pass+" BD_TOTAL_FAIL="+fail);
for(const b of bad) console.log("BD_BAD="+b);
const bd=files.filter(f=>/breakdowns/.test(f));
console.log("BD_FILES="+bd.length);
process.exit(fail>0?1:0);
