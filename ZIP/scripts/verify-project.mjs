import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const root = process.cwd();
const errors = [];
const exists = p => fs.existsSync(path.join(root,p));
const read = p => fs.readFileSync(path.join(root,p),"utf8");
const hash = p => crypto.createHash("sha256").update(fs.readFileSync(path.join(root,p))).digest("hex");
for (const f of ["app.js","index.html","style.css","www/app.js","www/index.html","www/style.css"]) if(!exists(f)) errors.push(`Falta: ${f}`);
if(!errors.length){
  const app=read("app.js"), index=read("index.html");
  try{ new Function(app); }catch(e){ errors.push(`Erro real de sintaxe JavaScript: ${e.message}`); }
  const info=app.match(/window\.APP_INFO\s*=\s*\{[\s\S]*?version:\s*"([^"]+)"[\s\S]*?label:\s*"([^"]+)"/);
  const splash=index.match(/id="appSplashVersionV800"[^>]*>([^<]+)</);
  if(!info) errors.push("Não foi possível ler APP_INFO.version/label.");
  if(!splash) errors.push("Não foi possível ler a versão do splash.");
  if(info&&splash&&!splash[1].includes(info[2])) errors.push(`Versões inconsistentes: app.js=${info[2]}; splash=${splash[1].trim()}`);
  if(/new\s+MutationObserver\s*\(\s*\(\)\s*=>\s*tick\(\)\s*\)\s*\.observe\s*\(\s*document\.documentElement[\s\S]*?childList\s*:\s*true/.test(app)) errors.push("MutationObserver autorrecursivo detetado.");
  if(/function\s+valorItemSeguroV59[\s\S]{0,900}?valorItemV58\?\.\(item\)[\s\S]{0,300}?function\s+valorItemV58[\s\S]{0,100}?valorItemSeguroV59\(item\)/.test(app)) errors.push("Recursão circular valorItemSeguroV59/valorItemV58 detetada.");
  for(const [a,b] of [["app.js","www/app.js"],["index.html","www/index.html"],["style.css","www/style.css"]]) if(hash(a)!==hash(b)) errors.push(`${a} e ${b} não são iguais.`);
  const aa="android/app/src/main/assets/public/app.js"; if(exists(aa)&&hash("app.js")!==hash(aa)) errors.push("app.js Android diferente da raiz.");
}
if(errors.length){ console.error("\nVERIFICAÇÃO FALHOU:"); errors.forEach(e=>console.error("-",e)); process.exit(1); }
console.log("\nVERIFICAÇÃO CONCLUÍDA COM SUCESSO.");
