const ts=require("typescript");
const fs=require("fs");
const path=require("path");
const root=process.argv[2];
const pick=["src/app/work-orders","src/services/work-orders","src/lib/validation/work-orders.ts","src/lib/constants/index.ts"];
const files=[];
for(const base of pick){
 function walk(d){ for(const e of fs.readdirSync(d,{withFileTypes:true})){ if(e.isDirectory()){ if(!["node_modules",".next"].includes(e.name)) walk(path.join(d,e.name)); } else if(/\.tsx?$/.test(e.name)) files.push(path.join(d,e.name)); } }
 const full=path.join(root,base);
 if(fs.existsSync(full)){ if(fs.statSync(full).isDirectory()) walk(full); else if(/\.tsx?$/.test(base)) files.push(full); }
}
let pass=0,fail=0;
for(const f of files){ try{ ts.createSourceFile(f,fs.readFileSync(f,"utf8"),ts.ScriptTarget.Latest,true,f.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS); pass++; }catch(e){ fail++; console.log("BROKEN="+path.relative(root,f)); } }
console.log("WO_PASS="+pass+" WO_FAIL="+fail);
let dirs=0;
try{ for(const base of pick){ if(fs.existsSync(path.join(root,base))) dirs++; } console.log("WO_SRC_LISTED="+dirs+"/"+pick.length); } catch(e){}
process.exit(fail?1:0);
