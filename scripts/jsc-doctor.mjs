import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptFile = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptFile);

function findProjectRoot(startDir) {
  let current = path.resolve(startDir);
  for (let i = 0; i < 8; i++) {
    if (
      fs.existsSync(path.join(current, "app.js")) &&
      fs.existsSync(path.join(current, "package.json")) &&
      fs.existsSync(path.join(current, "www"))
    ) return current;

    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

const rootArgIndex = process.argv.indexOf("--root");
const explicitRoot =
  rootArgIndex >= 0 && process.argv[rootArgIndex + 1]
    ? path.resolve(process.argv[rootArgIndex + 1])
    : null;

const root =
  explicitRoot ||
  findProjectRoot(process.cwd()) ||
  findProjectRoot(scriptDir);

if (!root) {
  console.error("ERRO: não foi possível localizar a raiz do projeto.");
  process.exit(2);
}

process.chdir(root);

const fixMode = process.argv.includes("--fix");
const errors = [];
const warnings = [];
const ok = [];
const scorePenalties = [];

const abs = (p) => path.join(root, p);
const exists = (p) => fs.existsSync(abs(p));
const read = (p) => fs.readFileSync(abs(p), "utf8");
const sha = (p) =>
  crypto.createHash("sha256").update(fs.readFileSync(abs(p))).digest("hex");

const pass = (m) => ok.push(m);
const warn = (m) => warnings.push(m);
const fail = (m, penalty = 15) => {
  errors.push(m);
  scorePenalties.push(penalty);
};

function ensureDir(file) {
  fs.mkdirSync(path.dirname(abs(file)), { recursive: true });
}

function copyFile(source, destination) {
  if (!exists(source)) return false;
  ensureDir(destination);
  fs.copyFileSync(abs(source), abs(destination));
  return true;
}

function runCapCopy() {
  const result = spawnSync(
    process.env.ComSpec || "cmd.exe",
    ["/d", "/s", "/c", "npx cap copy android"],
    { cwd: root, stdio: "inherit", windowsHide: false }
  );

  if (result.error) {
    fail(`Falhou npx cap copy android: ${result.error.message}`);
    return false;
  }
  if (result.status !== 0) {
    fail(`npx cap copy android terminou com código ${result.status}.`);
    return false;
  }

  pass("Capacitor copiou os assets Android");
  return true;
}

function synchronize() {
  console.log(`Projeto detetado em: ${root}`);
  console.log("A sincronizar raiz -> www -> Android...\n");

  const pairs = [
    ["app.js", "www/app.js"],
    ["index.html", "www/index.html"],
    ["style.css", "www/style.css"],
    ["service-worker.js", "www/service-worker.js"],
    ["manifest.json", "www/manifest.json"],
    ["manifest.webmanifest", "www/manifest.webmanifest"],
  ];

  for (const [source, destination] of pairs) {
    if (copyFile(source, destination)) {
      console.log(`Copiado: ${source} -> ${destination}`);
    }
  }

  return runCapCopy();
}

if (fixMode) synchronize();

const required = [
  "app.js",
  "index.html",
  "style.css",
  "package.json",
  "www/app.js",
  "www/index.html",
  "www/style.css",
  "service-worker.js",
  "manifest.json",
];

for (const file of required) {
  exists(file) ? pass(`Existe: ${file}`) : fail(`Falta: ${file}`, 8);
}

let app = "";
let appInfo = null;

if (exists("app.js")) {
  app = read("app.js");

  try {
    new Function(app);
    pass("JavaScript válido como script clássico de browser");
  } catch (error) {
    fail(`Erro real de sintaxe JavaScript: ${error.message}`, 30);
  }

  appInfo = app.match(
    /window\.APP_INFO\s*=\s*\{[\s\S]*?version:\s*["']([^"']+)["'][\s\S]*?label:\s*["']([^"']+)["']/
  );

  if (appInfo) pass(`APP_INFO detetado: ${appInfo[2]}`);
  else warn("APP_INFO não encontrado no formato esperado");

  const appInfoCount = (app.match(/window\.APP_INFO\s*=/g) || []).length;
  const appVersionCount = (app.match(/window\.APP_VERSION\s*=/g) || []).length;

  appInfoCount <= 1
    ? pass("APP_INFO não está duplicado")
    : warn(`APP_INFO definido ${appInfoCount} vezes`);

  appVersionCount <= 1
    ? pass("APP_VERSION não está duplicado")
    : warn(`APP_VERSION definido ${appVersionCount} vezes`);

  const observerLoop =
    /new\s+MutationObserver\s*\(\s*\(\)\s*=>\s*tick\(\)\s*\)\s*\.observe\s*\(\s*document\.documentElement[\s\S]*?childList\s*:\s*true/;

  observerLoop.test(app)
    ? fail("MutationObserver autorrecursivo detetado", 25)
    : pass("Sem MutationObserver autorrecursivo conhecido");

  const recursionLoop =
    /function\s+valorItemSeguroV59[\s\S]{0,900}?valorItemV58\?\.\(item\)[\s\S]{0,300}?function\s+valorItemV58[\s\S]{0,120}?valorItemSeguroV59\(item\)/;

  recursionLoop.test(app)
    ? warn("Padrão legado de chamadas valorItemSeguroV59/valorItemV58 detetado")
    : pass("Sem recursão circular conhecida no bloco de prémios");

  const functionRegex =
    /(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;

  const functionLines = new Map();
  const lines = app.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const match of line.matchAll(functionRegex)) {
      const name = match[1];
      const arr = functionLines.get(name) || [];
      arr.push(i + 1);
      functionLines.set(name, arr);
    }
  }

  const duplicates = [...functionLines.entries()]
    .filter(([, list]) => list.length > 1)
    .sort((a, b) => a[0].localeCompare(b[0]));

  if (duplicates.length) {
    for (const [name, list] of duplicates.slice(0, 20)) {
      warn(`Função repetida: ${name}() nas linhas ${list.join(", ")}`);
    }
    if (duplicates.length > 20) {
      warn(`Existem mais ${duplicates.length - 20} funções repetidas não listadas`);
    }
  } else {
    pass("Sem declarações de função repetidas");
  }

  const totalIntervals = (app.match(/setInterval\s*\(/g) || []).length;
  const totalObservers = (app.match(/new\s+MutationObserver\s*\(/g) || []).length;
  warn(`Diagnóstico: ${totalIntervals} setInterval(s), ${totalObservers} MutationObserver(s)`);

  const versions = [...app.matchAll(/V(\d+(?:\.\d+)?)/g)].map((m) => m[1]);
  const uniqueVersions = [...new Set(versions)];
  if (uniqueVersions.length > 1) {
    warn(`Referências históricas: ${uniqueVersions.slice(0, 15).join(", ")}`);
  }
}

if (exists("index.html")) {
  const index = read("index.html");
  const splash = index.match(/id="appSplashVersionV800"[^>]*>([^<]+)</);

  if (!splash) warn("Versão do splash não encontrada");
  else if (appInfo && !splash[1].includes(appInfo[2]))
    fail(`Versão divergente: APP_INFO=${appInfo[2]} | splash=${splash[1].trim()}`, 15);
  else pass("Versão do splash consistente");

  const appScriptCount = (index.match(/<script[^>]+src=["']app\.js(?:\?[^"']*)?["']/g) || []).length;
  appScriptCount === 1
    ? pass("app.js é carregado uma única vez no index.html")
    : fail(`app.js é carregado ${appScriptCount} vezes no index.html`, 20);
}

for (const [source, destination] of [
  ["app.js", "www/app.js"],
  ["index.html", "www/index.html"],
  ["style.css", "www/style.css"],
  ["service-worker.js", "www/service-worker.js"],
  ["manifest.json", "www/manifest.json"],
]) {
  if (!exists(source) || !exists(destination)) continue;
  sha(source) === sha(destination)
    ? pass(`${source} = ${destination}`)
    : fail(`${source} diferente de ${destination}`, 10);
}

for (const [source, destination] of [
  ["app.js", "android/app/src/main/assets/public/app.js"],
  ["index.html", "android/app/src/main/assets/public/index.html"],
  ["style.css", "android/app/src/main/assets/public/style.css"],
  ["service-worker.js", "android/app/src/main/assets/public/service-worker.js"],
  ["manifest.json", "android/app/src/main/assets/public/manifest.json"],
]) {
  if (!exists(destination)) {
    warn(`Ainda não existe: ${destination}`);
    continue;
  }
  sha(source) === sha(destination)
    ? pass(`${destination} sincronizado`)
    : fail(`${destination} não está sincronizado com ${source}`, 10);
}

if (exists("package.json")) {
  try {
    const pkg = JSON.parse(read("package.json"));
    pass(`package.json válido (${pkg.name || "sem nome"})`);
  } catch (error) {
    fail(`package.json inválido: ${error.message}`, 20);
  }
}

if (exists("manifest.json")) {
  try {
    const manifest = JSON.parse(read("manifest.json"));
    if (!manifest.name) warn("manifest.json sem name");
    else pass("manifest.json válido");
  } catch (error) {
    fail(`manifest.json inválido: ${error.message}`, 15);
  }
}

if (exists("service-worker.js")) {
  const sw = read("service-worker.js");
  sw.includes("addEventListener")
    ? pass("service-worker.js contém listeners")
    : warn("service-worker.js parece demasiado simples");
}

const gitResult = spawnSync("git", ["status", "--porcelain"], {
  cwd: root,
  encoding: "utf8",
  shell: false,
});

if (gitResult.error) {
  warn(`Git indisponível: ${gitResult.error.message}`);
} else if (gitResult.status !== 0) {
  warn("Não foi possível consultar o estado do Git");
} else if ((gitResult.stdout || "").trim()) {
  warn("Git tem ficheiros alterados ou não controlados");
} else {
  pass("Git limpo");
}

const score = Math.max(0, 100 - scorePenalties.reduce((a, b) => a + b, 0));

console.log("\n================================");
console.log("       JSC DOCTOR V4 FINAL");
console.log("================================");
console.log(`Raiz: ${root}\n`);

for (const item of ok) console.log(`[OK] ${item}`);
for (const item of warnings) console.log(`[AVISO] ${item}`);
for (const item of errors) console.log(`[ERRO] ${item}`);

console.log("\n--------------------------------");
console.log(`Sucessos: ${ok.length}`);
console.log(`Avisos:   ${warnings.length}`);
console.log(`Erros:    ${errors.length}`);
console.log(`Pontuação: ${score}/100`);
console.log("--------------------------------");

if (errors.length) {
  console.log("\nPROJETO COM PROBLEMAS.");
  process.exit(1);
}

console.log("\nPROJETO SAUDÁVEL.");
