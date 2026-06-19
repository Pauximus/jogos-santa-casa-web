const API = "https://jogos-santa-casa-api.onrender.com";

const SUPABASE_URL = "https://whnokdkqobtgyywqmrju.supabase.co";
const SUPABASE_KEY = "sb_publishable_t1ONYEGH_h11uFDENsINJw_RqlNxcpc";
const SUPABASE_TABLE = "historico_premios";

const jogos = {
  euromilhoes: { nome: "Euromilhões", endpoint: "euromilhoes", numeros: 5, extras: 2, maxNum: 50, maxExtra: 12, extraLabel: "⭐", tab: "EUROMILHÕES", tipo: "numeros_extra" },
  totoloto: { nome: "Totoloto", endpoint: "totoloto", numeros: 5, extras: 1, maxNum: 49, maxExtra: 13, extraLabel: "Nº da Sorte", tab: "totoloto", tipo: "numeros_extra" },
  eurodreams: { nome: "EuroDreams", endpoint: "eurodreams", numeros: 6, extras: 1, maxNum: 40, maxExtra: 5, extraLabel: "Nº de Sonho", tab: "EURO★DREAMS", tipo: "numeros_extra" },
  milhao: { nome: "M1lhão", endpoint: "milhao", codigo: true, tab: "M1LHÃO", tipo: "codigo" },
  lotaria_classica: { nome: "Lotaria Clássica", endpoint: "lotaria_classica", lotaria: true, tab: "lotaria clássica", tipo: "lotaria" },
  lotaria_popular: { nome: "Lotaria Popular", endpoint: "lotaria_popular", lotaria: true, tab: "lotaria popular", tipo: "lotaria" }
};

const jogoSelect = document.getElementById("jogo");
const tabs = document.getElementById("tabs");
const camposDiv = document.getElementById("campos");
const listaApostas = document.getElementById("lista-apostas");
const resultado = document.getElementById("resultado");
const historicoDiv = document.getElementById("historico");
const estado = document.getElementById("estado");

let jogoAtual = "euromilhoes";
let apostas = JSON.parse(localStorage.getItem("apostasJSC") || "{}");
let historico = JSON.parse(localStorage.getItem("historicoJSC") || "[]");

for (const key of Object.keys(jogos)) {
  if (!apostas[key]) apostas[key] = [];
}

function guardar() {
  localStorage.setItem("apostasJSC", JSON.stringify(apostas));
}

function guardarHistoricoLocal() {
  localStorage.setItem("historicoJSC", JSON.stringify(historico));
}

function supabaseHeaders(extra = {}) {
  return {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extra
  };
}

async function carregarHistoricoCloud() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?select=*&order=data_registo.desc&limit=200`,
      { headers: supabaseHeaders() }
    );

    if (!res.ok) throw new Error(await res.text());

    const dados = await res.json();

    historico = dados.map(h => ({
      id: String(h.id),
      jogo: h.jogo,
      sorteio: h.sorteio,
      dataSorteio: "",
      aposta: h.aposta,
      resultado: h.acertos,
      premio: h.premio,
      valor: "",
      dataRegisto: h.data_registo ? new Date(h.data_registo).toLocaleString("pt-PT") : ""
    }));

    guardarHistoricoLocal();
    renderHistorico();

  } catch (err) {
    console.warn("Histórico cloud indisponível, a usar localStorage:", err);
    renderHistorico();
  }
}

async function premioExisteNaCloud(ev) {
  const url =
    `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}` +
    `?select=id` +
    `&jogo=eq.${encodeURIComponent(ev.jogo)}` +
    `&aposta=eq.${encodeURIComponent(ev.aposta)}` +
    `&premio=eq.${encodeURIComponent(ev.premio)}` +
    `&sorteio=eq.${encodeURIComponent(ev.sorteio)}` +
    `&limit=1`;

  const res = await fetch(url, { headers: supabaseHeaders() });
  if (!res.ok) return false;

  const dados = await res.json();
  return dados.length > 0;
}

async function guardarPremioCloud(ev) {
  try {
    const existe = await premioExisteNaCloud(ev);
    if (existe) return;

    const payload = {
      jogo: ev.jogo,
      aposta: ev.aposta,
      premio: ev.premio,
      sorteio: ev.sorteio,
      acertos: ev.resultado
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`, {
      method: "POST",
      headers: supabaseHeaders({ "Prefer": "return=minimal" }),
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(await res.text());

  } catch (err) {
    console.warn("Não foi possível guardar na cloud:", err);
  }
}

function init() {
  jogoSelect.innerHTML = "";
  tabs.innerHTML = "";

  for (const [key, cfg] of Object.entries(jogos)) {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = cfg.nome;
    jogoSelect.appendChild(opt);

    const tab = document.createElement("button");
    tab.className = "tab " + key;
    tab.textContent = cfg.tab;
    tab.dataset.jogo = key;
    tab.onclick = () => mudarJogo(key);
    tabs.appendChild(tab);
  }

  carregarHistoricoCloud();
  mudarJogo(jogoAtual);
}

function mudarJogo(key) {
  jogoAtual = key;
  jogoSelect.value = key;

  document.querySelectorAll(".tab").forEach(t => {
    t.classList.toggle("active", t.dataset.jogo === key);
  });

  renderCampos();
  renderLista();
  verificar();
}

function renderCampos() {
  const cfg = jogos[jogoAtual];
  camposDiv.innerHTML = "";

  if (cfg.codigo) {
    camposDiv.innerHTML = '<label>Código:</label><input id="codigo" class="large" placeholder="ABC 12345">';
    return;
  }

  if (cfg.lotaria) {
    camposDiv.innerHTML = '<label>Número:</label><input id="numeroLotaria" class="large" placeholder="Número">';
    return;
  }

  for (let i = 1; i <= cfg.numeros; i++) {
    camposDiv.insertAdjacentHTML("beforeend", `<label>Nº${i}:</label><input class="num" inputmode="numeric">`);
  }

  camposDiv.insertAdjacentHTML("beforeend", "<strong> + </strong>");

  for (let i = 1; i <= cfg.extras; i++) {
    const label = cfg.extraLabel === "⭐" ? `⭐ ${i}` : cfg.extraLabel;
    camposDiv.insertAdjacentHTML("beforeend", `<label>${label}:</label><input class="extra" inputmode="numeric">`);
  }
}

function normalizarAposta() {
  const cfg = jogos[jogoAtual];

  if (cfg.codigo) {
    return document.getElementById("codigo").value.trim().toUpperCase().replace(/\s+/g, "");
  }

  if (cfg.lotaria) {
    return document.getElementById("numeroLotaria").value.replace(/\D/g, "").padStart(5, "0");
  }

  const nums = [...document.querySelectorAll(".num")].map(i => i.value.trim());
  const extras = [...document.querySelectorAll(".extra")].map(i => i.value.trim());

  if (nums.some(v => !v) || extras.some(v => !v)) {
    alert("Preenche todos os campos.");
    return "";
  }

  const numsNum = nums.map(Number);
  const extrasNum = extras.map(Number);

  if (new Set(numsNum).size !== numsNum.length) {
    alert("Tens números repetidos.");
    return "";
  }

  if (new Set(extrasNum).size !== extrasNum.length) {
    alert("Tens extras repetidos.");
    return "";
  }

  if (numsNum.some(n => n < 1 || n > cfg.maxNum)) {
    alert(`Os números devem estar entre 1 e ${cfg.maxNum}.`);
    return "";
  }

  if (extrasNum.some(n => n < 1 || n > cfg.maxExtra)) {
    alert(`Os extras devem estar entre 1 e ${cfg.maxExtra}.`);
    return "";
  }

  return numsNum.sort((a,b) => a-b).join(" ") + " + " + extrasNum.sort((a,b) => a-b).join(" ");
}

function parseAposta(aposta) {
  const [numsTxt, extrasTxt] = aposta.split("+");
  return {
    nums: numsTxt.trim().split(/\s+/).map(Number),
    extras: extrasTxt ? extrasTxt.trim().split(/\s+/).map(Number) : []
  };
}

function renderLista() {
  listaApostas.innerHTML = "";

  apostas[jogoAtual].forEach((aposta, index) => {
    const li = document.createElement("li");
    li.textContent = `${index + 1}) ${aposta}`;

    const btn = document.createElement("button");
    btn.className = "delete";
    btn.textContent = "Apagar";

    btn.onclick = () => {
      apostas[jogoAtual].splice(index, 1);
      guardar();
      renderLista();
      verificar();
    };

    li.appendChild(btn);
    listaApostas.appendChild(li);
  });
}

function adicionarAposta() {
  const aposta = normalizarAposta();
  if (!aposta) return;

  if (apostas[jogoAtual].includes(aposta)) {
    alert("Essa aposta já existe.");
    return;
  }

  apostas[jogoAtual].push(aposta);
  guardar();
  renderCampos();
  renderLista();
  verificar();
}

function converterParaArray(valor) {
  if (Array.isArray(valor)) return valor.map(Number);
  if (typeof valor === "string") return valor.trim().split(/\s+/).map(Number);
  return [];
}

function categoriaTemPremio(jogo, n, e) {
  const map = {
    euromilhoes: new Set(["5+2","5+1","5+0","4+2","4+1","3+2","4+0","2+2","3+1","3+0","1+2","2+1","2+0"]),
    totoloto: new Set(["5+1","5+0","4+1","4+0","3+1","3+0","2+1"]),
    eurodreams: new Set(["6+1","6+0","5+1","5+0","4+1","4+0","3+1","2+1"])
  };

  return map[jogo]?.has(`${n}+${e}`) || false;
}

async function obterResultadoAtual() {
  const cfg = jogos[jogoAtual];
  const res = await fetch(`${API}/${cfg.endpoint}`);
  const data = await res.json();
  if (data.erro) throw new Error(data.erro);
  return data;
}

async function verificar() {
  const cfg = jogos[jogoAtual];
  estado.textContent = "A obter resultados...";

  try {
    const data = await obterResultadoAtual();
    let eventos = [];

    if (cfg.tipo === "numeros_extra") {
      eventos = renderResultadoNumerosExtra(data);
    } else if (cfg.tipo === "codigo") {
      eventos = renderResultadoCodigo(data);
    } else if (cfg.tipo === "lotaria") {
      eventos = renderResultadoLotaria(data);
    }

    await guardarEventosHistorico(data, eventos);
    estado.textContent = `${cfg.nome}: ${apostas[jogoAtual].length} aposta(s)`;

  } catch (err) {
    resultado.innerHTML = `<div class="result-card bad">Erro ao obter resultados: ${err.message}</div>`;
    estado.textContent = "Erro.";
  }
}

function renderCabecalhoResultado(data, conteudo) {
  return `
    <div class="result-title">${data.jogo.toUpperCase()}</div>
    <div class="result-meta">
      <div>Sorteio: ${data.sorteio || "último sorteio"}</div>
      <div>Data: ${data.data || ""}</div>
      ${conteudo}
    </div>
  `;
}

function renderResultadoNumerosExtra(data) {
  const numeros = converterParaArray(data.numeros);
  const extras = converterParaArray(data.extras);
  const eventos = [];

  let html = renderCabecalhoResultado(
    data,
    `<div>Resultado: [${numeros.join(", ")}] + [${extras.join(", ")}]</div>`
  );

  if (!apostas[jogoAtual].length) {
    html += `<div class="result-card warn">Sem apostas guardadas.</div>`;
  }

  apostas[jogoAtual].forEach((aposta, index) => {
    const { nums, extras: apostaExtras } = parseAposta(aposta);
    const acertosNums = nums.filter(n => numeros.includes(n)).length;
    const acertosExtras = apostaExtras.filter(e => extras.includes(e)).length;
    const categoria = `${acertosNums}+${acertosExtras}`;
    const premioInfo = data.premios ? data.premios[categoria] : null;
    const premiado = !!premioInfo || categoriaTemPremio(jogoAtual, acertosNums, acertosExtras);
    const comAcertos = acertosNums || acertosExtras;

    let titulo = "🔴 SEM PRÉMIO";
    let classe = "bad";
    let premio = "";
    let valor = "";

    if (premiado) {
      premio = premioInfo?.premio || "Prémio";
      valor = premioInfo?.valor || "valor a consultar";
      titulo = `🏆 PREMIADO — ${premio} — ${valor}`;
      classe = "ok";
    } else if (comAcertos) {
      titulo = "🟡 COM ACERTOS — sem prémio";
      classe = "warn";
    }

    if (premiado) {
      eventos.push({
        jogo: data.jogo,
        aposta,
        resultado: `${acertosNums} número(s) + ${acertosExtras} ${data.extra_nome || "extra"}(s)`,
        sorteio: data.sorteio || "último sorteio",
        premio: `${premio} — ${valor}`
      });
    }

    html += `
      <div class="result-card ${classe}">
        <strong>${titulo}</strong><br>
        Aposta ${index + 1}: ${aposta}<br>
        Acertos: ${acertosNums} número(s) + ${acertosExtras} ${data.extra_nome || "extra"}(s)
      </div>
    `;
  });

  resultado.innerHTML = html;
  return eventos;
}

function renderResultadoCodigo(data) {
  const codigoResultado = (data.codigo || "").replace(/\s+/g, "").toUpperCase();
  const eventos = [];

  let html = renderCabecalhoResultado(
    data,
    `<div>Resultado: ${codigoResultado || "não encontrado"}</div>`
  );

  if (!apostas[jogoAtual].length) {
    html += `<div class="result-card warn">Sem códigos guardados.</div>`;
  }

  apostas[jogoAtual].forEach((aposta, index) => {
    const codigo = aposta.replace(/\s+/g, "").toUpperCase();
    const premiado = codigo && codigo === codigoResultado;

    if (premiado) {
      eventos.push({
        jogo: data.jogo,
        aposta,
        resultado: codigoResultado,
        sorteio: data.sorteio || "último sorteio",
        premio: "M1lhão — valor a consultar"
      });
    }

    html += `
      <div class="result-card ${premiado ? "ok" : "bad"}">
        <strong>${premiado ? "🏆 PREMIADO" : "🔴 SEM PRÉMIO"}</strong><br>
        Código ${index + 1}: ${aposta}
      </div>
    `;
  });

  resultado.innerHTML = html;
  return eventos;
}

function renderResultadoLotaria(data) {
  const premios = data.premios || [];
  const numerosPremiados = premios.map(p => String(p.numero).padStart(5, "0"));
  const eventos = [];

  let listaPremios = premios.map(p => `${p.premio}: ${p.numero}`).join("<br>");

  let html = renderCabecalhoResultado(
    data,
    `<div>${listaPremios || "Prémios não encontrados"}</div>`
  );

  if (!apostas[jogoAtual].length) {
    html += `<div class="result-card warn">Sem números guardados.</div>`;
  }

  apostas[jogoAtual].forEach((aposta, index) => {
    const numero = String(aposta).padStart(5, "0");
    const pos = numerosPremiados.indexOf(numero);
    const premiado = pos >= 0;
    const premio = premiado ? premios[pos].premio : "";

    if (premiado) {
      eventos.push({
        jogo: data.jogo,
        aposta: numero,
        resultado: numero,
        sorteio: data.sorteio || "último sorteio",
        premio
      });
    }

    html += `
      <div class="result-card ${premiado ? "ok" : "bad"}">
        <strong>${premiado ? `🏆 PREMIADO — ${premio}` : "🔴 SEM PRÉMIO"}</strong><br>
        Número ${index + 1}: ${numero}
      </div>
    `;
  });

  resultado.innerHTML = html;
  return eventos;
}

async function guardarEventosHistorico(data, eventos) {
  if (!eventos.length) {
    renderHistorico();
    return;
  }

  for (const ev of eventos) {
    const idLocal = `${ev.jogo}|${ev.sorteio}|${ev.aposta}|${ev.premio}|${ev.resultado}`;
    const existeLocal = historico.some(h => h.idLocal === idLocal);

    if (!existeLocal) {
      historico.unshift({
        idLocal,
        jogo: ev.jogo,
        sorteio: ev.sorteio,
        aposta: ev.aposta,
        resultado: ev.resultado,
        premio: ev.premio,
        dataRegisto: new Date().toLocaleString("pt-PT")
      });

      await guardarPremioCloud(ev);
    }
  }

  historico = historico.slice(0, 200);
  guardarHistoricoLocal();
  await carregarHistoricoCloud();
}

function renderHistorico() {
  if (!historico.length) {
    historicoDiv.innerHTML = `<div class="result-card warn">Ainda não há prémios guardados no histórico.</div>`;
    return;
  }

  historicoDiv.innerHTML = historico.map(h => `
    <div class="history-item">
      <strong>🏆 ${h.jogo} — ${h.premio}</strong><br>
      Sorteio: ${h.sorteio}<br>
      Aposta: ${h.aposta}<br>
      Acertos/resultado: ${h.resultado}<br>
      <span class="small">Guardado em: ${h.dataRegisto || ""}</span>
    </div>
  `).join("");
}

function exportarHistorico() {
  const blob = new Blob([JSON.stringify(historico, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "historico_premios_jogos_santa_casa.json";
  a.click();
  URL.revokeObjectURL(url);
}

function limparHistorico() {
  if (!confirm("Queres mesmo limpar o histórico local? A cloud não será apagada.")) return;
  historico = [];
  guardarHistoricoLocal();
  renderHistorico();
}

jogoSelect.addEventListener("change", () => mudarJogo(jogoSelect.value));
document.getElementById("adicionar").addEventListener("click", adicionarAposta);
document.getElementById("exportarHistorico").addEventListener("click", exportarHistorico);
document.getElementById("limparHistorico").addEventListener("click", limparHistorico);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}

init();