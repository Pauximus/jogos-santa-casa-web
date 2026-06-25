window.APP_VERSION = "v25-pwa-instalavel";

const API = "https://jogos-santa-casa-api.onrender.com";
const BACKEND_API = "https://jogos-santa-casa-backend.onrender.com";
const SUPABASE_URL = "https://whnokdkqobtgyywqmrju.supabase.co";
const SUPABASE_KEY = "sb_publishable_t1ONYEGH_h11uFDENsINJw_RqlNxcpc";
const SUPABASE_HISTORICO = "historico_premios";
const SUPABASE_APOSTAS = "apostas_guardadas";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let logoutEmCurso = false;

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
const dashboardResumo = document.getElementById("dashboardResumo");
const dashTotalApostas = document.getElementById("dashTotalApostas");
const dashTotalPremios = document.getElementById("dashTotalPremios");
const dashTaxaSucesso = document.getElementById("dashTaxaSucesso");
const dashUltimoPremio = document.getElementById("dashUltimoPremio");
const rankingJogos = document.getElementById("rankingJogos");
const rankingNota = document.getElementById("rankingNota");
const notificacaoPremio = document.getElementById("notificacaoPremio");
const notificacaoTitulo = document.getElementById("notificacaoTitulo");
const notificacaoTexto = document.getElementById("notificacaoTexto");
const fecharNotificacao = document.getElementById("fecharNotificacao");

let currentUser = null;
let jogoAtual = "euromilhoes";
let apostas = {};
let historico = [];
let interfaceCriada = false;
let filtroHistorico = "todos";
let textoPesquisaHistorico = "";
let syncEmCurso = false;

for (const key of Object.keys(jogos)) apostas[key] = [];

function atualizarContador() {
  if (!contadorApostas) return;
  const n = apostas[jogoAtual]?.length || 0;
  const premios = historico?.length || 0;
  contadorApostas.textContent = `${n} aposta(s) · 🏆 ${premios} prémio(s)`;
  atualizarEstatisticas();
}

function nomeJogoCurto(nome) {
  const mapa = {
    "Euromilhões": "Euromilhões",
    "Totoloto": "Totoloto",
    "EuroDreams": "EuroDreams",
    "M1lhão": "M1lhão",
    "Lotaria Clássica": "Clássica",
    "Lotaria Popular": "Popular"
  };
  return mapa[nome] || nome || "—";
}

function normalizarDataSorteio(valor) {
  if (!valor) return "";
  const texto = String(valor).trim();

  // Se vier no formato DD/MM/AAAA, mantém simples e legível.
  const pt = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (pt) {
    return `${pt[1].padStart(2, "0")}/${pt[2].padStart(2, "0")}/${pt[3]}`;
  }

  // Se vier em ISO ou Date parseável, converte para PT.
  const d = new Date(texto);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString("pt-PT");
  }

  return texto;
}

function mostrarNotificacaoPremio(eventos) {
  if (!notificacaoPremio || !eventos || !eventos.length) return;

  const primeiro = eventos[0];
  notificacaoTitulo.textContent = eventos.length === 1
    ? "🏆 Novo prémio encontrado!"
    : `🏆 ${eventos.length} novos prémios encontrados!`;

  notificacaoTexto.textContent = `${primeiro.jogo} · ${primeiro.premio} · ${primeiro.aposta}`;
  notificacaoPremio.style.display = "";

  window.clearTimeout(mostrarNotificacaoPremio._timer);
  mostrarNotificacaoPremio._timer = window.setTimeout(() => {
    notificacaoPremio.style.display = "none";
  }, 9000);
}

function premiosPorJogo() {
  const contagem = {};
  historico.forEach(h => {
    if (!h.jogo) return;
    contagem[h.jogo] = (contagem[h.jogo] || 0) + 1;
  });
  return contagem;
}

function atualizarBadgesTabs() {
  const contagem = premiosPorJogo();

  document.querySelectorAll(".tab").forEach(tab => {
    const key = tab.dataset.jogo;
    const cfg = jogos[key];
    if (!cfg) return;

    const total = contagem[cfg.nome] || 0;
    tab.innerHTML = `<span>${cfg.tab}</span>${total ? `<em>🏆${total}</em>` : ""}`;
  });
}

function dataCurta(texto) {
  if (!texto) return "";
  return String(texto).split(",")[0].trim();
}

function contagemPremiosPorJogo() {
  const contagem = {};
  historico.forEach(h => {
    const jogo = h.jogo || "—";
    contagem[jogo] = (contagem[jogo] || 0) + 1;
  });
  return contagem;
}

function atualizarDashboard() {
  const totalApostas = totalApostasGuardadas();
  const totalPremios = historico.length;
  const taxa = totalApostas ? Math.round((totalPremios / totalApostas) * 100) : 0;
  const ultimo = historico[0];

  if (dashTotalApostas) dashTotalApostas.textContent = totalApostas;
  if (dashTotalPremios) dashTotalPremios.textContent = totalPremios;
  if (dashTaxaSucesso) dashTaxaSucesso.textContent = `${taxa}%`;
  if (dashUltimoPremio) dashUltimoPremio.textContent = ultimo ? `${nomeJogoCurto(ultimo.jogo)}${ultimo.dataRegisto ? " · " + dataCurta(ultimo.dataRegisto) : ""}` : "—";

  if (dashboardResumo) {
    dashboardResumo.textContent = totalPremios
      ? `🏆 ${totalPremios} prémio(s) encontrados`
      : "Ainda sem prémios encontrados";
  }

  renderRankingJogos();
}

function renderRankingJogos() {
  if (!rankingJogos) return;

  const contagem = contagemPremiosPorJogo();
  const entradas = Object.entries(contagem).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-PT"));
  const max = entradas[0]?.[1] || 0;

  if (!entradas.length) {
    rankingJogos.innerHTML = `<div class="ranking-empty">Ainda não há prémios no histórico.</div>`;
    if (rankingNota) rankingNota.textContent = "Sem dados";
    return;
  }

  if (rankingNota) rankingNota.textContent = `${entradas.length} jogo(s) com prémios`;

  rankingJogos.innerHTML = entradas.map(([jogo, total]) => {
    const percentagem = max ? Math.max(8, Math.round((total / max) * 100)) : 0;
    return `
      <div class="ranking-row">
        <div class="ranking-label">
          <span>${nomeJogoCurto(jogo)}</span>
          <strong>${total}</strong>
        </div>
        <div class="ranking-bar">
          <div style="width:${percentagem}%"></div>
        </div>
      </div>
    `;
  }).join("");
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
  return Object.entries(contagem).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-PT"))[0]?.[0] || "—";
}

function atualizarEstatisticas() {
  if (statApostas) statApostas.textContent = totalApostasGuardadas();
  if (statPremios) statPremios.textContent = historico.length;

  if (historico.length) {
    const ultimo = historico[0];
    if (statUltimoPremio) statUltimoPremio.textContent = ultimo.jogo ? `${ultimo.jogo}` : "—";
    if (statJogoMaisPremiado) statJogoMaisPremiado.textContent = jogoMaisPremiado();
  } else {
    if (statUltimoPremio) statUltimoPremio.textContent = "—";
    if (statJogoMaisPremiado) statJogoMaisPremiado.textContent = "—";
  }

  atualizarDashboard();
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


function agoraPt() {
  return new Date().toLocaleString("pt-PT");
}

function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function terminarEstadoPronto() {
  const cfg = jogos[jogoAtual];
  estado.textContent = `${cfg.nome}: ${apostas[jogoAtual]?.length || 0} aposta(s)`;
}

function comTimeout(promise, ms, descricao = "operação") {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${descricao} demorou demasiado tempo`)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function fetchComTimeout(url, opcoes = {}, ms = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  try {
    return await fetch(url, { ...opcoes, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
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
  logoutEmCurso = true;
  estado.textContent = "A terminar sessão...";

  const limparSessaoLocal = () => {
    try {
      // Limpa todos os dados locais da app e todos os tokens do Supabase.
      // As apostas/histórico continuam seguros na cloud, por utilizador.
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn("Não foi possível limpar storage local:", e);
    }
  };

  try {
    limparSessaoLocal();

    // Tenta terminar a sessão também no Supabase, mas não deixa a interface presa.
    await Promise.race([
      supabaseClient.auth.signOut({ scope: "global" }),
      new Promise(resolve => setTimeout(resolve, 3000))
    ]);
  } catch (err) {
    console.warn("Sign out remoto falhou/demorou; sessão local limpa na mesma:", err);
  } finally {
    currentUser = null;
    apostas = {};
    historico = [];
    for (const key of Object.keys(jogos)) apostas[key] = [];
    interfaceCriada = false;

    limparSessaoLocal();

    authBox.style.display = "";
    userBox.style.display = "none";
    appBox.style.display = "none";
    authEmail.value = "";
    authPassword.value = "";
    userInfo.textContent = "";
    syncInfo.textContent = "";
    estado.textContent = "Sessão terminada.";

    // Recarrega com cache-buster para impedir que o service worker/browser mantenha a sessão antiga.
    setTimeout(() => {
      const base = window.location.origin + window.location.pathname;
      window.location.replace(`${base}?logout=${Date.now()}`);
    }, 300);
  }
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
  atualizarDashboard();
  terminarEstadoPronto();
}

async function arrancarApp() {
  if (!currentUser) return;

  carregarLocal();
  mostrarAppAutenticada();

  // V24: a interface arranca imediatamente. Backend, apostas e histórico
  // sincronizam em segundo plano para nunca prender o ecrã.
  renderLista();
  renderHistorico();
  atualizarDashboard();
  terminarEstadoPronto();
  syncInfo.textContent = "Sincronização automática ativa.";

  setTimeout(() => {
    sincronizarTudo({ verificarDepois: true, background: true });
  }, 100);
}

async function sincronizarTudo(opcoes = {}) {
  if (!currentUser) return false;

  const verificarDepois = opcoes.verificarDepois === true;
  const background = opcoes.background === true;

  if (!background) estado.textContent = "A sincronizar...";
  syncInfo.textContent = "Sincronização em segundo plano...";

  try {
    // V24: nada bloqueia a interface. Backend, apostas e histórico correm em paralelo.
    const tarefas = await Promise.allSettled([
      atualizarResultadosBackend(),
      carregarApostasCloud(false),
      carregarHistoricoCloud(false)
    ]);

    tarefas.forEach((r, i) => {
      if (r.status === "rejected") console.warn("Sincronização parcial falhou:", i, r.reason);
    });

    renderLista();
    renderHistorico();
    atualizarDashboard();
    atualizarContador();
    atualizarBadgesTabs();

    if (verificarDepois) {
      if (!background) estado.textContent = "A verificar prémios...";
      await verificar().catch(err => console.warn("Verificação de prémios incompleta:", err));
    }

    syncInfo.textContent = `Última sincronização: ${agoraPt()}`;
    if (!background) estado.textContent = "Sincronização concluída.";
    return true;

  } catch (err) {
    console.warn("Sincronização incompleta:", err);
    syncInfo.textContent = `Última sincronização parcial: ${agoraPt()}`;
    return false;

  } finally {
    renderLista();
    renderHistorico();
    atualizarDashboard();
    atualizarContador();
    atualizarBadgesTabs();
    if (background) terminarEstadoPronto();
  }
}

async function carregarApostasCloud(chamarVerificar = true) {
  if (!currentUser) return;

  try {
    estado.textContent = "A sincronizar apostas...";

    const query = supabaseClient
      .from(SUPABASE_APOSTAS)
      .select("*")
      .eq("user_id", currentUser.id)
      .order("data_registo", { ascending: true })
      .limit(1000);

    const { data, error } = await query;

    if (error) throw error;

    const novasApostas = {};
    for (const key of Object.keys(jogos)) novasApostas[key] = [];

    (data || []).forEach(row => {
      if (novasApostas[row.jogo] && row.aposta && !novasApostas[row.jogo].includes(row.aposta)) {
        novasApostas[row.jogo].push(row.aposta);
      }
    });

    // Cloud é a fonte principal. LocalStorage fica só como cache.
    apostas = novasApostas;

    guardar();
    renderLista();
    atualizarDashboard();

    if (chamarVerificar) await verificar();
    return true;

  } catch (err) {
    console.warn("Apostas cloud indisponíveis:", err);
    estado.textContent = "Sincronização de apostas lenta. A usar dados locais.";
    renderLista();
    return false;
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
    dataSorteio: normalizarDataSorteio(h.data_sorteio || ""),
    aposta: h.aposta || "",
    resultado: h.acertos || "",
    premio: h.premio || "",
    dataRegisto: h.data_registo ? new Date(h.data_registo).toLocaleString("pt-PT") : ""
  };
}

async function carregarHistoricoCloud(chamarRender = true) {
  if (!currentUser) return;

  try {
    const query = supabaseClient
      .from(SUPABASE_HISTORICO)
      .select("*")
      .eq("user_id", currentUser.id)
      .order("data_registo", { ascending: false })
      .limit(200);

    const { data, error } = await query;

    if (error) throw error;

    historico = (data || []).map(normalizarRegistoCloud);
    guardarHistoricoLocal();

    if (chamarRender) renderHistorico();
    return true;

  } catch (err) {
    console.warn("Histórico cloud indisponível:", err);
    estado.textContent = "Sincronização de histórico lenta. A usar dados locais.";
    if (chamarRender) renderHistorico();
    return false;
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
        data_sorteio: normalizarDataSorteio(ev.dataSorteio) || null,
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
    tab.innerHTML = `<span>${cfg.tab}</span>`;
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

async function atualizarResultadosBackend() {
  try {
    estado.textContent = "A atualizar resultados oficiais...";
    const res = await fetchComTimeout(`${BACKEND_API}/atualizar`, { cache: "no-store" }, 70000);
    const data = await res.json().catch(() => ({}));
    if (data && data.ok === false) {
      console.info("Atualização backend incompleta; a usar últimos resultados guardados.", data.atualizado_em || "");
    } else {
      console.info("Atualização backend concluída.", data?.atualizado_em || "");
    }
    return data;
  } catch (err) {
    console.warn("Atualização automática do backend falhou:", err);
    return null;
  }
}

function parseJsonPossivel(valor, fallback = null) {
  if (valor == null || valor === "") return fallback;
  if (typeof valor === "object") return valor;
  try { return JSON.parse(valor); } catch { return fallback; }
}

async function obterResultadosOficiaisBackend() {
  const res = await fetch(`${BACKEND_API}/resultados`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Backend /resultados HTTP ${res.status}`);
  const data = await res.json();
  if (data.erro) throw new Error(data.erro);
  return data.resultados || data || [];
}

function linhaResultadoParaFormatoApp(row, cfg) {
  const premios = parseJsonPossivel(row.premios, cfg.lotaria ? [] : {});
  const dataSorteio = normalizarDataSorteio(row.data_sorteio || row.data || "");

  return {
    jogo: cfg.nome,
    sorteio: row.sorteio || "último sorteio",
    data: dataSorteio,
    numeros: converterParaArray(row.numeros),
    extras: converterParaArray(row.extras),
    codigo: row.codigo || "",
    premios: premios || (cfg.lotaria ? [] : {}),
    extra_nome: cfg.extraLabel === "⭐" ? "estrela" : cfg.extraLabel || "extra"
  };
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

  try {
    const resultados = await obterResultadosOficiaisBackend();
    const row = resultados.find(r => r.jogo === jogoAtual);

    const temDados = row && (
      row.numeros || row.extras || row.codigo || row.premios || row.data_sorteio
    );

    if (temDados) {
      return linhaResultadoParaFormatoApp(row, cfg);
    }
  } catch (err) {
    console.warn("Resultados oficiais via backend indisponíveis. A tentar API direta:", err);
  }

  const res = await fetch(`${API}/${cfg.endpoint}`, { cache: "no-store" });
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

  const novosEventos = [];

  for (const ev of eventos) {
    const idLocal = `${ev.jogo}|${ev.sorteio}|${ev.aposta}|${ev.premio}|${ev.resultado}`;
    const existeLocal = historico.some(h => h.idLocal === idLocal);

    if (!existeLocal) {
      const registo = {
        idLocal,
        jogo: ev.jogo,
        sorteio: ev.sorteio,
        dataSorteio: normalizarDataSorteio(ev.dataSorteio) || "",
        aposta: ev.aposta,
        resultado: ev.resultado,
        premio: ev.premio,
        dataRegisto: new Date().toLocaleString("pt-PT")
      };

      historico.unshift(registo);
      novosEventos.push(registo);
      await guardarPremioCloud(ev);
    }
  }

  historico = historico.slice(0, 200);
  guardarHistoricoLocal();

  if (novosEventos.length) {
    mostrarNotificacaoPremio(novosEventos);
  }

  await carregarHistoricoCloud();
}

function renderHistorico() {
  atualizarEstatisticas();
  atualizarContador();
  atualizarBadgesTabs();

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

async function limparHistorico() {
  const mensagem = currentUser
    ? "Queres mesmo apagar TODO o teu histórico de prémios?\n\nIsto vai apagar o histórico local e também o histórico guardado na cloud desta conta. As apostas guardadas não serão apagadas."
    : "Queres mesmo limpar o histórico local?";

  if (!confirm(mensagem)) return;

  const btn = document.getElementById("limparHistorico");
  const textoOriginal = btn ? btn.textContent : "";

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "A limpar...";
    }

    estado.textContent = currentUser
      ? "A limpar histórico local e cloud..."
      : "A limpar histórico local...";

    if (currentUser) {
      const query = supabaseClient
        .from(SUPABASE_HISTORICO)
        .delete()
        .eq("user_id", currentUser.id);

      const { error } = await comTimeout(query, 25000, "limpeza do histórico cloud");
      if (error) throw error;
    }

    historico = [];
    guardarHistoricoLocal();
    renderHistorico();
    atualizarDashboard();
    atualizarContador();

    estado.textContent = currentUser
      ? "Histórico local e cloud limpo."
      : "Histórico local limpo.";

    syncInfo.textContent = `Última sincronização: ${agoraPt()}`;

  } catch (err) {
    console.warn("Não foi possível limpar o histórico na cloud:", err);
    estado.textContent = "Erro ao limpar histórico.";
    alert("Não foi possível limpar o histórico na cloud: " + (err.message || err));

  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = textoOriginal || "Limpar histórico cloud";
    }
  }
}

document.getElementById("loginBtn").addEventListener("click", login);
document.getElementById("signupBtn").addEventListener("click", criarConta);
document.getElementById("resetPasswordBtn").addEventListener("click", recuperarPassword);
document.getElementById("logoutBtn").addEventListener("click", logout);
document.getElementById("syncNowBtn").addEventListener("click", async () => {
  if (syncEmCurso) {
    estado.textContent = "Sincronização já em curso em segundo plano.";
    return;
  }

  const btn = document.getElementById("syncNowBtn");
  const textoOriginal = btn.textContent || "Sincronizar agora";
  syncEmCurso = true;
  btn.disabled = true;
  btn.textContent = "A sincronizar...";
  estado.textContent = "Sincronização iniciada em segundo plano...";
  syncInfo.textContent = "Sincronização em segundo plano...";

  // Liberta a interface rapidamente. A sincronização continua por trás.
  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = textoOriginal;
    if (syncEmCurso) estado.textContent = "Sincronização em segundo plano...";
  }, 1200);

  sincronizarTudo({ verificarDepois: true, background: true })
    .then(() => {
      estado.textContent = "Sincronização concluída.";
      return esperar(1800);
    })
    .catch(err => {
      console.warn("Erro ao sincronizar agora:", err);
      estado.textContent = "Sincronização incompleta. A usar dados disponíveis.";
      return esperar(2500);
    })
    .finally(() => {
      syncEmCurso = false;
      btn.disabled = false;
      btn.textContent = textoOriginal;
      terminarEstadoPronto();
    });
});

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

if (fecharNotificacao) {
  fecharNotificacao.addEventListener("click", () => {
    notificacaoPremio.style.display = "none";
  });
}

// PWA install
let deferredInstallPrompt = null;
const installPwaBtn = document.getElementById("installPwaBtn");

function isPwaInstalada() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function atualizarBotaoInstalar() {
  if (!installPwaBtn) return;
  installPwaBtn.style.display = deferredInstallPrompt && !isPwaInstalada() ? "" : "none";
}

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  atualizarBotaoInstalar();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  atualizarBotaoInstalar();
  estado.textContent = "App instalada com sucesso.";
});

if (installPwaBtn) {
  installPwaBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      estado.textContent = "No telemóvel usa o menu do browser e escolhe Adicionar ao ecrã principal.";
      return;
    }

    deferredInstallPrompt.prompt();
    try { await deferredInstallPrompt.userChoice; } catch (e) {}
    deferredInstallPrompt = null;
    atualizarBotaoInstalar();
  });
}

supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (logoutEmCurso) return;
  currentUser = session?.user || null;
  if (currentUser && event !== "INITIAL_SESSION") {
    await arrancarApp();
  }
});

(async function boot() {
  console.log("APP_VERSION", window.APP_VERSION);

  if (new URLSearchParams(window.location.search).has("logout")) {
    try { localStorage.clear(); sessionStorage.clear(); } catch(e) {}
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js?v=25").catch(err => console.warn("Service worker indisponível:", err));
  }

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
