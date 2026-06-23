window.APP_VERSION = "v12-estatisticas-historico";

const API = "https://jogos-santa-casa-api.onrender.com";
const SUPABASE_URL = "https://whnokdkqobtgyywqmrju.supabase.co";
const SUPABASE_KEY = "sb_publishable_t1ONYEGH_h11uFDENsINJw_RqlNxcpc";
const SUPABASE_HISTORICO = "historico_premios";
const SUPABASE_APOSTAS = "apostas_guardadas";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const jogos = {
  euromilhoes: { nome: "Euromilhões", endpoint: "euromilhoes", numeros: 5, extras: 2, maxNum: 50, maxExtra: 12, extraLabel: "⭐", tab: "EUROMILHÕES", tipo: "numeros_extra" },
  totoloto: { nome: "Totoloto", endpoint: "totoloto", numeros: 5, extras: 1, maxNum: 49, maxExtra: 13, extraLabel: "Nº da Sorte", tab: "totoloto", tipo: "numeros_extra" },
  eurodreams: { nome: "EuroDreams", endpoint: "eurodreams", numeros: 6, extras: 1, maxNum: 40, maxExtra: 5, extraLabel: "Nº de Sonho", tab: "EURO★DREAMS", tipo: "numeros_extra" },
  milhao: { nome: "M1lhão", endpoint: "milhao", codigo: true, tab: "M1LHÃO", tipo: "codigo" },
  lotaria_classica: { nome: "Lotaria Clássica", endpoint: "lotaria_classica", lotaria: true, tab: "lotaria clássica", tipo: "lotaria" },
  lotaria_popular: { nome: "Lotaria Popular", endpoint: "lotaria_popular", lotaria: true, tab: "lotaria popular", tipo: "lotaria" }
};

const authBox = document.getElementById("authBox");
const userBox = document.getElementById("userBox");
const appBox = document.getElementById("appBox");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authMsg = document.getElementById("authMsg");
const userInfo = document.getElementById("userInfo");
const syncInfo = document.getElementById("syncInfo");
const jogoSelect = document.getElementById("jogo");
const tabs = document.getElementById("tabs");
const camposDiv = document.getElementById("campos");
const listaApostas = document.getElementById("lista-apostas");
const resultado = document.getElementById("resultado");
const historicoDiv = document.getElementById("historico");
const estado = document.getElementById("estado");
const contadorApostas = document.getElementById("contadorApostas");
const statApostas = document.getElementById("statApostas");
const statPremios = document.getElementById("statPremios");
const statUltimoPremio = document.getElementById("statUltimoPremio");
const statJogoMaisPremiado = document.getElementById("statJogoMaisPremiado");
const pesquisaHistorico = document.getElementById("pesquisaHistorico");
const filtrosHistorico = document.getElementById("filtrosHistorico");

let currentUser = null;
let jogoAtual = "euromilhoes";
let apostas = {};
let historico = [];
let interfaceCriada = false;
let filtroHistorico = "todos";
let textoPesquisaHistorico = "";

for (const key of Object.keys(jogos)) apostas[key] = [];

function atualizarContador() {
  if (!contadorApostas) return;
  const n = apostas[jogoAtual]?.length || 0;
  const premios = historico?.length || 0;
  contadorApostas.textContent = `${n} aposta(s) · 🏆 ${premios} prémio(s)`;
  atualizarEstatisticas();
}

function totalApostasGuardadas() {
  return Object.values(apostas).reduce((total, lista) => total + (lista?.length || 0), 0);
}

function jogoMaisPremiado() {
  if (!historico.length) return "—";
  const contagem = {};
  historico.forEach(h => {
    const jogo = h.jogo || "—";
    contagem[jogo] = (contagem[jogo] || 0) + 1;
  });
  return Object.entries(contagem).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
}

function atualizarEstatisticas() {
  if (!statApostas || !statPremios || !statUltimoPremio || !statJogoMaisPremiado) return;

  statApostas.textContent = totalApostasGuardadas();
  statPremios.textContent = historico.length;

  if (historico.length) {
    const ultimo = historico[0];
    statUltimoPremio.textContent = ultimo.jogo ? `${ultimo.jogo}` : "—";
    statJogoMaisPremiado.textContent = jogoMaisPremiado();
  } else {
    statUltimoPremio.textContent = "—";
    statJogoMaisPremiado.textContent = "—";
  }
}

function filtrarHistorico() {
  let lista = [...historico];

  if (filtroHistorico !== "todos") {
    lista = lista.filter(h => (h.jogo || "").toLowerCase() === filtroHistorico.toLowerCase());
  }

  const q = textoPesquisaHistorico.trim().toLowerCase();
  if (q) {
    lista = lista.filter(h => [
      h.jogo,
      h.aposta,
      h.premio,
      h.sorteio,
      h.resultado,
      h.dataRegisto
    ].join(" ").toLowerCase().includes(q));
  }

  return lista;
}

function storageKey(nome) {
  return currentUser ? `${nome}_${currentUser.id}` : nome;
}

function mostrarAuthMensagem(texto, tipo = "warn") {
  authMsg.className = `result-card ${tipo}`;
  authMsg.textContent = texto;
  authMsg.style.display = "block";
}

function esconderAuthMensagem() {
  authMsg.style.display = "none";
}

function carregarLocal() {
  apostas = JSON.parse(localStorage.getItem(storageKey("apostasJSC")) || "{}");
  historico = JSON.parse(localStorage.getItem(storageKey("historicoJSC")) || "[]");
  for (const key of Object.keys(jogos)) {
    if (!apostas[key]) apostas[key] = [];
  }
}

function guardar() {
  localStorage.setItem(storageKey("apostasJSC"), JSON.stringify(apostas));
}

function guardarHistoricoLocal() {
  localStorage.setItem(storageKey("historicoJSC"), JSON.stringify(historico));
}

async function login() {
  esconderAuthMensagem();
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!email || !password) {
    mostrarAuthMensagem("Preenche email e password.");
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    mostrarAuthMensagem("Erro ao entrar: " + error.message, "bad");
    return;
  }

  currentUser = data.user;
  await arrancarApp();
}

async function criarConta() {
  esconderAuthMensagem();
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!email || !password) {
    mostrarAuthMensagem("Preenche email e password.");
    return;
  }

  if (password.length < 6) {
    mostrarAuthMensagem("A password deve ter pelo menos 6 caracteres.");
    return;
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: "https://pauximus.github.io/jogos-santa-casa-web/" }
  });

  if (error) {
    mostrarAuthMensagem("Erro ao criar conta: " + error.message, "bad");
    return;
  }

  if (data.user && !data.session) {
    mostrarAuthMensagem("Conta criada. Confirma o email antes de entrar.", "warn");
    return;
  }

  currentUser = data.user;
  await arrancarApp();
}

async function recuperarPassword() {
  esconderAuthMensagem();
  const email = authEmail.value.trim();

  if (!email) {
    mostrarAuthMensagem("Escreve o email para recuperar a password.");
    return;
  }

  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: "https://pauximus.github.io/jogos-santa-casa-web/"
  });

  if (error) {
    mostrarAuthMensagem("Erro ao enviar recuperação: " + error.message, "bad");
    return;
  }

  mostrarAuthMensagem("Email de recuperação enviado. Verifica a caixa de entrada.", "warn");
}

async function logout() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  apostas = {};
  historico = [];
  interfaceCriada = false;

  authBox.style.display = "";
  userBox.style.display = "none";
  appBox.style.display = "none";
  authPassword.value = "";
  estado.textContent = "Sessão terminada.";
}

function mostrarAppAutenticada() {
  authBox.style.display = "none";
  userBox.style.display = "";
  appBox.style.display = "";

  userInfo.textContent = `Olá, ${currentUser.email}`;
  syncInfo.textContent = "Sincronização automática ativa.";

  if (!interfaceCriada) {
    criarInterface();
    interfaceCriada = true;
  }

  renderCampos();
  renderLista();
  renderHistorico();
  verificar();
}

async function arrancarApp() {
  if (!currentUser) return;

  carregarLocal();
  mostrarAppAutenticada();

  sincronizarTudo()
    .then(() => {
      renderLista();
      renderHistorico();
      verificar();
      syncInfo.textContent = `Última sincronização: ${new Date().toLocaleString("pt-PT")}`;
    })
    .catch(err => {
      console.warn("Erro na sincronização inicial:", err);
      estado.textContent = "Erro ao sincronizar. A usar dados locais.";
    });
}

async function sincronizarTudo() {
  await carregarApostasCloud(false);
  await carregarHistoricoCloud(false);
  syncInfo.textContent = `Última sincronização: ${new Date().toLocaleString("pt-PT")}`;
}

async function carregarApostasCloud(chamarVerificar = true) {
  if (!currentUser) return;

  try {
    estado.textContent = "A sincronizar apostas...";

    const { data, error } = await supabaseClient
      .from(SUPABASE_APOSTAS)
      .select("*")
      .eq("user_id", currentUser.id)
      .order("data_registo", { ascending: true })
      .limit(1000);

    if (error) throw error;

    const novasApostas = {};
    for (const key of Object.keys(jogos)) novasApostas[key] = [];

    (data || []).forEach(row => {
      if (novasApostas[row.jogo] && row.aposta && !novasApostas[row.jogo].includes(row.aposta)) {
        novasApostas[row.jogo].push(row.aposta);
      }
    });

    for (const key of Object.keys(jogos)) {
      const local = apostas[key] || [];
      apostas[key] = [...new Set([...novasApostas[key], ...local])];
    }

    guardar();
    renderLista();
    if (chamarVerificar) verificar();

  } catch (err) {
    console.warn("Apostas cloud indisponíveis:", err);
    estado.textContent = "Não foi possível sincronizar apostas.";
    renderLista();
  }
}

async function apostaExisteNaCloud(jogo, aposta) {
  if (!currentUser) return false;

  const { data, error } = await supabaseClient
    .from(SUPABASE_APOSTAS)
    .select("id")
    .eq("user_id", currentUser.id)
    .eq("jogo", jogo)
    .eq("aposta", aposta)
    .limit(1);

  if (error) {
    console.warn(error);
    return false;
  }

  return (data || []).length > 0;
}

async function guardarApostaCloud(jogo, aposta) {
  if (!currentUser) {
    alert("Tens de iniciar sessão para guardar apostas na cloud.");
    return;
  }

  try {
    const existe = await apostaExisteNaCloud(jogo, aposta);
    if (existe) return;

    const { error } = await supabaseClient
      .from(SUPABASE_APOSTAS)
      .insert({ jogo, aposta, user_id: currentUser.id });

    if (error) throw error;

  } catch (err) {
    console.warn("Não foi possível guardar aposta na cloud:", err);
    alert("Não foi possível guardar a aposta na cloud: " + err.message);
  }
}

async function apagarApostaCloud(jogo, aposta) {
  if (!currentUser) return;

  try {
    const { error } = await supabaseClient
      .from(SUPABASE_APOSTAS)
      .delete()
      .eq("user_id", currentUser.id)
      .eq("jogo", jogo)
      .eq("aposta", aposta);

    if (error) throw error;

  } catch (err) {
    console.warn("Não foi possível apagar aposta na cloud:", err);
  }
}

function normalizarRegistoCloud(h) {
  return {
    idLocal: `cloud-${h.id}`,
    jogo: h.jogo || "",
    sorteio: h.sorteio || "último sorteio",
    dataSorteio: h.data_sorteio || "",
    aposta: h.aposta || "",
    resultado: h.acertos || "",
    premio: h.premio || "",
    dataRegisto: h.data_registo ? new Date(h.data_registo).toLocaleString("pt-PT") : ""
  };
}

async function carregarHistoricoCloud() {
  if (!currentUser) return;

  try {
    const { data, error } = await supabaseClient
      .from(SUPABASE_HISTORICO)
      .select("*")
      .eq("user_id", currentUser.id)
      .order("data_registo", { ascending: false })
      .limit(200);

    if (error) throw error;

    historico = (data || []).map(normalizarRegistoCloud);
    guardarHistoricoLocal();
    renderHistorico();

  } catch (err) {
    console.warn("Histórico cloud indisponível:", err);
    estado.textContent = "Não foi possível sincronizar histórico.";
    renderHistorico();
  }
}

async function premioExisteNaCloud(ev) {
  if (!currentUser) return false;

  const { data, error } = await supabaseClient
    .from(SUPABASE_HISTORICO)
    .select("id")
    .eq("user_id", currentUser.id)
    .eq("jogo", ev.jogo)
    .eq("aposta", ev.aposta)
    .eq("premio", ev.premio)
    .eq("sorteio", ev.sorteio)
    .limit(1);

  if (error) {
    console.warn(error);
    return false;
  }

  return (data || []).length > 0;
}

async function guardarPremioCloud(ev) {
  if (!currentUser) return;

  try {
    const existe = await premioExisteNaCloud(ev);
    if (existe) return;

    const { error } = await supabaseClient
      .from(SUPABASE_HISTORICO)
      .insert({
        jogo: ev.jogo,
        aposta: ev.aposta,
        premio: ev.premio,
        sorteio: ev.sorteio,
        acertos: ev.resultado,
        data_sorteio: ev.dataSorteio || null,
        user_id: currentUser.id
      });

    if (error) throw error;

  } catch (err) {
    console.warn("Não foi possível guardar prémio na cloud:", err);
  }
}

function criarInterface() {
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

  mudarJogo(jogoAtual);
}

function mudarJogo(key) {
  jogoAtual = key;
  jogoSelect.value = key;
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.jogo === key));
  renderCampos();
  renderLista();
  verificar();
}

function renderCampos() {
  const cfg = jogos[jogoAtual];
  camposDiv.innerHTML = "";

  if (cfg.codigo) {
    camposDiv.innerHTML = '<label>Código:</label><input id="codigo" class="large" placeholder="ABC12345">';
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
  atualizarContador();

  if (!apostas[jogoAtual] || !apostas[jogoAtual].length) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="small">Ainda não há apostas guardadas neste jogo.</span>`;
    listaApostas.appendChild(li);
    return;
  }

  apostas[jogoAtual].forEach((aposta, index) => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = `${index + 1}) ${aposta}`;

    const btn = document.createElement("button");
    btn.className = "delete";
    btn.textContent = "Apagar";
    btn.onclick = async () => {
      apostas[jogoAtual].splice(index, 1);
      guardar();
      await apagarApostaCloud(jogoAtual, aposta);
      renderLista();
      verificar();
    };

    li.appendChild(span);
    li.appendChild(btn);
    listaApostas.appendChild(li);
  });
}

async function adicionarAposta() {
  const aposta = normalizarAposta();
  if (!aposta) return;

  if (apostas[jogoAtual].includes(aposta)) {
    alert("Essa aposta já existe.");
    return;
  }

  apostas[jogoAtual].push(aposta);
  guardar();
  await guardarApostaCloud(jogoAtual, aposta);
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
  if (!currentUser) return;

  const cfg = jogos[jogoAtual];
  estado.textContent = "A obter resultados...";

  try {
    const data = await obterResultadoAtual();
    let eventos = [];

    if (cfg.tipo === "numeros_extra") eventos = renderResultadoNumerosExtra(data);
    else if (cfg.tipo === "codigo") eventos = renderResultadoCodigo(data);
    else if (cfg.tipo === "lotaria") eventos = renderResultadoLotaria(data);

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

  let html = renderCabecalhoResultado(data, `<div>Resultado: [${numeros.join(", ")}] + [${extras.join(", ")}]</div>`);

  if (!apostas[jogoAtual].length) html += `<div class="result-card warn">Sem apostas guardadas.</div>`;

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
        dataSorteio: data.data || "",
        premio: `${premio} — ${valor}`
      });
    }

    html += `
      <div class="result-card ${classe}">
        <strong>${titulo}</strong><br>
        Aposta ${index + 1}: ${aposta}<br>
        Acertos: ${acertosNums} número(s) + ${acertosExtras} ${data.extra_nome || "extra"}(s)
      </div>`;
  });

  resultado.innerHTML = html;
  return eventos;
}

function renderResultadoCodigo(data) {
  const codigoResultado = (data.codigo || "").replace(/\s+/g, "").toUpperCase();
  const eventos = [];

  let html = renderCabecalhoResultado(data, `<div>Resultado: ${codigoResultado || "não encontrado"}</div>`);

  if (!apostas[jogoAtual].length) html += `<div class="result-card warn">Sem códigos guardados.</div>`;

  apostas[jogoAtual].forEach((aposta, index) => {
    const codigo = aposta.replace(/\s+/g, "").toUpperCase();
    const premiado = codigo && codigo === codigoResultado;

    if (premiado) {
      eventos.push({
        jogo: data.jogo,
        aposta,
        resultado: codigoResultado,
        sorteio: data.sorteio || "último sorteio",
        dataSorteio: data.data || "",
        premio: "M1lhão — valor a consultar"
      });
    }

    html += `
      <div class="result-card ${premiado ? "ok" : "bad"}">
        <strong>${premiado ? "🏆 PREMIADO" : "🔴 SEM PRÉMIO"}</strong><br>
        Código ${index + 1}: ${aposta}
      </div>`;
  });

  resultado.innerHTML = html;
  return eventos;
}

function renderResultadoLotaria(data) {
  const premios = data.premios || [];
  const numerosPremiados = premios.map(p => String(p.numero).padStart(5, "0"));
  const eventos = [];

  let listaPremios = premios.map(p => `${p.premio}: ${p.numero}`).join("<br>");
  let html = renderCabecalhoResultado(data, `<div>${listaPremios || "Prémios não encontrados"}</div>`);

  if (!apostas[jogoAtual].length) html += `<div class="result-card warn">Sem números guardados.</div>`;

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
        dataSorteio: data.data || "",
        premio
      });
    }

    html += `
      <div class="result-card ${premiado ? "ok" : "bad"}">
        <strong>${premiado ? `🏆 PREMIADO — ${premio}` : "🔴 SEM PRÉMIO"}</strong><br>
        Número ${index + 1}: ${numero}
      </div>`;
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
        dataSorteio: ev.dataSorteio || "",
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
  atualizarEstatisticas();
  atualizarContador();

  const lista = filtrarHistorico();

  if (!historico.length) {
    historicoDiv.innerHTML = `<div class="result-card warn">Ainda não há prémios guardados no histórico.</div>`;
    return;
  }

  if (!lista.length) {
    historicoDiv.innerHTML = `<div class="result-card warn">Nenhum registo encontrado com os filtros atuais.</div>`;
    return;
  }

  historicoDiv.innerHTML = lista.map(h => `
    <div class="history-item">
      <div class="history-item-head">
        <strong>🏆 ${h.jogo} — ${h.premio}</strong>
        <span class="history-badge">${h.dataRegisto || ""}</span>
      </div>
      <div>Sorteio: ${h.sorteio}${h.dataSorteio ? " — " + h.dataSorteio : ""}</div>
      <div>Aposta: ${h.aposta}</div>
      <div>Acertos/resultado: ${h.resultado}</div>
    </div>`).join("");
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

document.getElementById("loginBtn").addEventListener("click", login);
document.getElementById("signupBtn").addEventListener("click", criarConta);
document.getElementById("resetPasswordBtn").addEventListener("click", recuperarPassword);
document.getElementById("logoutBtn").addEventListener("click", logout);
document.getElementById("syncNowBtn").addEventListener("click", sincronizarTudo);

authPassword.addEventListener("keydown", e => {
  if (e.key === "Enter") login();
});

jogoSelect.addEventListener("change", () => mudarJogo(jogoSelect.value));
document.getElementById("adicionar").addEventListener("click", adicionarAposta);
document.getElementById("exportarHistorico").addEventListener("click", exportarHistorico);
document.getElementById("limparHistorico").addEventListener("click", limparHistorico);

if (pesquisaHistorico) {
  pesquisaHistorico.addEventListener("input", () => {
    textoPesquisaHistorico = pesquisaHistorico.value;
    renderHistorico();
  });
}

if (filtrosHistorico) {
  filtrosHistorico.addEventListener("click", e => {
    const btn = e.target.closest("button[data-filter]");
    if (!btn) return;

    filtroHistorico = btn.dataset.filter;
    filtrosHistorico.querySelectorAll(".filter").forEach(b => b.classList.toggle("active", b === btn));
    renderHistorico();
  });
}

supabaseClient.auth.onAuthStateChange(async (event, session) => {
  currentUser = session?.user || null;
  if (currentUser && event !== "INITIAL_SESSION") {
    await arrancarApp();
  }
});

(async function boot() {
  console.log("APP_VERSION", window.APP_VERSION);

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) console.warn(error);

  currentUser = data?.session?.user || null;

  if (currentUser) {
    await arrancarApp();
  } else {
    authBox.style.display = "";
    userBox.style.display = "none";
    appBox.style.display = "none";
    estado.textContent = "Inicia sessão para continuar.";
  }
})();
