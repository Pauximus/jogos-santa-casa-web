window.APP_VERSION = "v43.2-debug-valores-premios";

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
let aliasUtilizador = localStorage.getItem('jsc_alias_utilizador') || '';
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

async function mostrarAppAutenticada() {
  authBox.style.display = "none";
  userBox.style.display = "";
  appBox.style.display = "";

  userInfo.textContent = `Olá, ${currentUser.email}`;
  carregarAliasCloud();
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
      
    } else {
      console.info("Atualização backend concluída.", data?.atualizado_em || "");
    }
    return data;
  } catch (err) {
    
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
    console.info("Backend indisponível; a usar fallback/cache.");
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





function obterNomeRelatorio() {
  const nome = (aliasUtilizador || localStorage.getItem("jsc_alias_utilizador") || "").trim();
  return nome || "Utilizador";
}

function atualizarCampoAlias() {
  const input = document.getElementById("aliasUtilizador");
  if (input) input.value = aliasUtilizador || "";
}

async function carregarAliasCloud() {
  atualizarCampoAlias();

  if (!supabaseClient || !currentUser) return;

  try {
    const { data, error } = await supabaseClient
      .from("perfis_utilizador")
      .select("nome_relatorio")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (!error && data?.nome_relatorio) {
      aliasUtilizador = data.nome_relatorio;
      localStorage.setItem("jsc_alias_utilizador", aliasUtilizador);
      atualizarCampoAlias();
    }
  } catch (err) {
    // A app continua a funcionar: o nome fica guardado localmente.
    console.info("Nome/alcunha: a usar valor local.");
  }
}






function mostrarFeedbackAlias(msg) {
  const el = document.getElementById("aliasFeedback");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("visivel");
  clearTimeout(window.__aliasFeedbackTimer);
  window.__aliasFeedbackTimer = setTimeout(() => {
    el.textContent = "";
    el.classList.remove("visivel");
  }, 2500);
}

function normalizarJogoV33(nome) {
  const raw = String(nome || "").toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_ -]/g, "");
  if (!raw) return "";
  if (raw.includes("eurom")) return "euromilhoes";
  if (raw.includes("toto")) return "totoloto";
  if (raw.includes("dream")) return "eurodreams";
  if (raw.includes("milhao") || raw.includes("m1lhao")) return "milhao";
  if (raw.includes("class")) return "lotaria_classica";
  if (raw.includes("popular")) return "lotaria_popular";
  return raw.replace(/\s+/g, "_");
}

function formatarJogoV33(nome) {
  const key = normalizarJogoV33(nome);
  const map = { euromilhoes: "Euromilhões", totoloto: "Totoloto", eurodreams: "EuroDreams", milhao: "M1lhão", lotaria_classica: "Lotaria Clássica", lotaria_popular: "Lotaria Popular" };
  return map[key] || nome || "—";
}

function parseJsonV33(valor, fallback) { try { return valor ? JSON.parse(valor) : fallback; } catch { return fallback; } }

function recolherApostasV33() {
  const out=[]; const seen=new Set();
  function add(lista){ if(!Array.isArray(lista)) return; lista.forEach(item=>{ if(!item) return; const key=JSON.stringify(item); if(seen.has(key)) return; seen.add(key); out.push(item); }); }
  try { if (Array.isArray(apostas)) add(apostas); } catch {}
  if (Array.isArray(window.apostas)) add(window.apostas);
  if (Array.isArray(window.apostasGuardadas)) add(window.apostasGuardadas);
  for (let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i); if(!k || !k.toLowerCase().includes("aposta")) continue;
    const p=parseJsonV33(localStorage.getItem(k), null);
    if(Array.isArray(p)) add(p); else if(p && typeof p==="object") Object.values(p).forEach(v=>Array.isArray(v)&&add(v));
  }
  return out;
}

function recolherHistoricoV33() {
  const all=[]; const seen=new Set();
  function add(lista){ if(!Array.isArray(lista)) return; lista.forEach(item=>{ if(!item) return; const key=JSON.stringify(item); if(seen.has(key)) return; seen.add(key); all.push(item); }); }
  try { if (Array.isArray(historico)) add(historico); } catch {}
  if (Array.isArray(window.historico)) add(window.historico);
  ["historico","jsc_historico","historico_premios","premios_historico","historicoPremios"].forEach(k=>{ const p=parseJsonV33(localStorage.getItem(k), null); if(Array.isArray(p)) add(p); });
  return all;
}

function obterCampoJogoPremioV33(item) { return item?.jogo || item?.tipo || item?.game || item?.nomeJogo || item?.lottery || item?.endpoint || item?.titulo || item?.descricao || ""; }
function jogoDaApostaV33(aposta) { const direto=aposta?.jogo||aposta?.tipo||aposta?.game||aposta?.nomeJogo||aposta?.lottery||aposta?.endpoint; if(direto) return normalizarJogoV33(direto); try { return normalizarJogoV33(jogoAtual || document.querySelector("select")?.value || ""); } catch { return ""; } }
function contarApostasPorJogoV33(){ const c={}; recolherApostasV33().forEach(a=>{ const jogo=jogoDaApostaV33(a); if(!jogo) return; c[jogo]=(c[jogo]||0)+1; }); return c; }
function contarPremiosPorJogoV33(){ const c={}; recolherHistoricoV33().forEach(h=>{ const jogo=normalizarJogoV33(obterCampoJogoPremioV33(h)); if(!jogo) return; c[jogo]=(c[jogo]||0)+1; }); if(!Object.keys(c).length && typeof contagemPremiosPorJogo==="function"){ try{return contagemPremiosPorJogo()||{};}catch{} } return c; }
function maiorEntradaV33(obj){ const e=Object.entries(obj||{}); if(!e.length) return null; return e.sort((a,b)=>b[1]-a[1] || String(a[0]).localeCompare(String(b[0]),"pt-PT"))[0]; }
function valorPremioV33(item){ const t=String(item?.valor||item?.premio||item?.descricao||item?.titulo||""); const m=t.match(/(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|\d+(?:,\d{2})?)/g); if(!m) return 0; return Math.max(...m.map(x=>Number(x.replace(/\s/g,"").replace(/\./g,"").replace(",","."))||0)); }
function maiorPremioV33(){ const h=recolherHistoricoV33(); if(!h.length) return null; return [...h].sort((a,b)=>valorPremioV33(b)-valorPremioV33(a))[0]; }
function gerarSequenciaV33(totalApostas,historicoLista){ const totalPremios=historicoLista.length; const tamanho=Math.min(Math.max(totalApostas,totalPremios),10); if(!tamanho) return []; return Array.from({length:tamanho},(_,i)=>i>=tamanho-totalPremios); }
function maiorSeqV33(seq,valor){ let melhor=0, atual=0; seq.forEach(v=>{ if(v===valor){ atual++; melhor=Math.max(melhor,atual); } else atual=0; }); return melhor; }
function atualizarSequenciaVisualV33(totalApostas,historicoLista){ const el=document.getElementById("statSequenciaVisual"); const resumo=document.getElementById("statMaiorSequencia"); if(!el) return; const seq=gerarSequenciaV33(totalApostas,historicoLista); const maiorPremios=maiorSeqV33(seq,true); const maiorSem=maiorSeqV33(seq,false); if(resumo) resumo.textContent = maiorPremios ? `${maiorPremios} prémio(s) seguidos` : `${maiorSem} sem prémio`; if(!seq.length){ el.innerHTML='<span class="sequencia-vazia">Sem dados suficientes</span>'; return; } el.innerHTML=seq.map((ganhou,idx)=>`<span class="seq-chip ${ganhou?"win":"lose"}" title="${idx+1}: ${ganhou?"Prémio":"Sem prémio"}">${ganhou?"🏆":"❌"}</span>`).join(""); }
function atualizarConquistasV33(totalApostas,totalPremios,maiorPremios){ const grid=document.getElementById("conquistasGrid"); const resumo=document.getElementById("statConquistasResumo"); if(!grid) return; const conquistas=[{ok:totalPremios>=1,icon:"🥇",title:"Primeiro prémio",desc:"Encontraste o primeiro prémio."},{ok:totalApostas>=10,icon:"🎯",title:"10 apostas",desc:"Registaste 10 apostas."},{ok:totalApostas>=50,icon:"📈",title:"50 apostas",desc:"Utilização consistente."},{ok:totalPremios>=5,icon:"💰",title:"5 prémios",desc:"Cinco prémios registados."},{ok:maiorPremios>=2,icon:"🔥",title:"Sequência",desc:"Dois prémios seguidos."},{ok:totalPremios>=10,icon:"🏆",title:"10 prémios",desc:"Histórico forte."}]; const desbloqueadas=conquistas.filter(c=>c.ok).length; if(resumo) resumo.textContent=`${desbloqueadas}/${conquistas.length}`; grid.innerHTML=conquistas.map(c=>`<div class="conquista ${c.ok?"ok":"locked"}"><b>${c.icon}</b><div><strong>${c.title}</strong><span>${c.ok?"Desbloqueada":c.desc}</span></div></div>`).join(""); }
function atualizarEstatisticasAvancadas(){ const historicoLista=recolherHistoricoV33(); const porApostas=contarApostasPorJogoV33(); const porPremios=contarPremiosPorJogoV33(); const totalApostas=Object.values(porApostas).reduce((s,n)=>s+n,0); const totalPremios=Object.values(porPremios).reduce((s,n)=>s+n,0); const maisApostado=maiorEntradaV33(porApostas); const maisPremiado=maiorEntradaV33(porPremios); const maior=maiorPremioV33(); const seq=gerarSequenciaV33(totalApostas,historicoLista); const maiorPremios=maiorSeqV33(seq,true); const setTxt=(id,txt)=>{ const el=document.getElementById(id); if(el) el.textContent=txt; }; setTxt("statJogoMaisApostado", maisApostado?`${formatarJogoV33(maisApostado[0])} (${maisApostado[1]})`:"—"); setTxt("statJogoMaisPremiado", maisPremiado?`${formatarJogoV33(maisPremiado[0])} (${maisPremiado[1]})`:"—"); if(maior){ const valor=valorPremioV33(maior); setTxt("statMelhorPremio", `${formatarJogoV33(obterCampoJogoPremioV33(maior))}${valor?" — "+valor.toLocaleString("pt-PT",{style:"currency",currency:"EUR"}):""}`); } else setTxt("statMelhorPremio","—"); setTxt("statUltimaSync", `${Math.max(0,totalApostas-totalPremios)} aposta(s)`); atualizarSequenciaVisualV33(totalApostas,historicoLista); atualizarConquistasV33(totalApostas,totalPremios,maiorPremios); const ranking=document.getElementById("statRankingJogos"); const resumo=document.getElementById("statResumoRanking"); const entradas=Object.entries(porPremios).sort((a,b)=>b[1]-a[1]); if(resumo) resumo.textContent=totalPremios?`${totalPremios} prémio(s) em ${entradas.length} jogo(s)`:"Sem dados"; if(!ranking) return; if(!entradas.length){ ranking.innerHTML='<div class="mini-ranking-empty">Ainda não há prémios suficientes para estatísticas.</div>'; return; } const max=Math.max(...entradas.map(([,n])=>n),1); ranking.innerHTML=entradas.map(([jogo,total],idx)=>{ const pct=Math.max(8,Math.round((total/max)*100)); return `<div class="mini-ranking-row"><div class="mini-ranking-label"><span>${idx+1}.º ${formatarJogoV33(jogo)}</span><strong>${total}</strong></div><div class="mini-ranking-bar"><i style="width:${pct}%"></i></div></div>`; }).join(""); }
async function pedirPermissaoNotificacoes(){ if(!("Notification" in window)){ alert("Este browser não suporta notificações."); return; } const perm=await Notification.requestPermission(); localStorage.setItem("jsc_notificacoes", perm==="granted"?"1":"0"); const btn=document.getElementById("ativarNotificacoesBtn"); if(btn) btn.textContent=perm==="granted"?"🔔 Ativas":"🔔 Notificações"; if(perm==="granted") new Notification("Notificações ativas",{body:"Vais poder receber alertas quando a app encontrar prémios.",icon:"icon-192.png"}); }
function notificarPremiosSeNecessarioV33(){ if(!("Notification" in window)||Notification.permission!=="granted") return; if(localStorage.getItem("jsc_notificacoes")!=="1") return; const historicoLista=recolherHistoricoV33(); const totalPremios=historicoLista.length; const ultimoAvisado=Number(localStorage.getItem("jsc_premios_notificados")||"0"); if(totalPremios>ultimoAvisado){ const ultimo=historicoLista[0]||historicoLista[historicoLista.length-1]||{}; new Notification("Prémio encontrado!",{body:`${formatarJogoV33(obterCampoJogoPremioV33(ultimo))}: ${ultimo.premio||"prémio registado"}`,icon:"icon-192.png"}); localStorage.setItem("jsc_premios_notificados",String(totalPremios)); } }
function iniciarNotificacoesV33(){ const btn=document.getElementById("ativarNotificacoesBtn"); if(!btn) return; if("Notification" in window && Notification.permission==="granted" && localStorage.getItem("jsc_notificacoes")==="1") btn.textContent="🔔 Ativas"; btn.addEventListener("click",()=>pedirPermissaoNotificacoes()); }

async function guardarAliasUtilizador() {
  const input = document.getElementById("aliasUtilizador");
  const novoNome = (input?.value || "").trim().slice(0, 40);

  aliasUtilizador = novoNome;
  if (novoNome) {
    localStorage.setItem("jsc_alias_utilizador", novoNome);
  } else {
    localStorage.removeItem("jsc_alias_utilizador");
  }

  atualizarCampoAlias();

  if (supabaseClient && currentUser) {
    try {
      const { error } = await supabaseClient
        .from("perfis_utilizador")
        .upsert({
          user_id: currentUser.id,
          nome_relatorio: novoNome || null,
          atualizado_em: new Date().toISOString()
        }, { onConflict: "user_id" });

      if (!error) {
        estado.textContent = "Nome do relatório guardado.";
        mostrarFeedbackAlias("Nome guardado com sucesso.");
        return;
      }
    } catch (err) {
      // Sem problema: fica local.
    }
  }

  estado.textContent = "Nome guardado neste dispositivo.";
  mostrarFeedbackAlias("Nome guardado com sucesso.");
}

function historicoParaRelatorioOrdenado() {
  return [...historico].sort((a, b) => {
    const da = a.dataRegisto ? new Date(a.dataRegisto).getTime() : 0;
    const db = b.dataRegisto ? new Date(b.dataRegisto).getTime() : 0;
    return db - da;
  });
}

function nomeFicheiroPdfHistorico() {
  const hoje = new Date().toISOString().slice(0, 10);
  return `historico_premios_jogos_santa_casa_${hoje}.pdf`;
}

function gerarTextoPartilhaHistorico() {
  const totalApostas = totalApostasGuardadas();
  const totalPremios = historico.length;
  const taxa = totalApostas ? Math.round((totalPremios / totalApostas) * 100) : 0;

  const linhas = [
    "🍀 Verificador Jogos Santa Casa",
    "",
    `Utilizador: ${obterNomeRelatorio()}`,
    `Data: ${new Date().toLocaleString("pt-PT")}`,
    "",
    `Apostas guardadas: ${totalApostas}`,
    `Prémios encontrados: ${totalPremios}`,
    `Taxa de sucesso: ${taxa}%`,
    "",
    "Histórico de prémios:"
  ];

  if (!historico.length) {
    linhas.push("Sem prémios registados.");
  } else {
    historicoParaRelatorioOrdenado().slice(0, 20).forEach((h, i) => {
      linhas.push("");
      linhas.push(`${i + 1}. ${h.jogo || "—"} — ${h.premio || "—"}`);
      linhas.push(`Sorteio: ${h.sorteio || "—"}${h.dataSorteio ? " — " + h.dataSorteio : ""}`);
      linhas.push(`Aposta: ${h.aposta || "—"}`);
      linhas.push(`Resultado: ${h.resultado || "—"}`);
    });
  }

  linhas.push("");
  linhas.push("https://pauximus.github.io/jogos-santa-casa-web/");
  return linhas.join("\n");
}

function obterClasseJsPdf() {
  if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
  if (window.jsPDF) return window.jsPDF;
  return null;
}

function gerarPdfHistoricoBlobOuDoc() {
  const JsPDF = obterClasseJsPdf();
  if (!JsPDF) {
    alert("O gerador de PDF ainda não carregou. Tenta novamente dentro de alguns segundos.");
    return null;
  }

  if (!historico.length) {
    alert("Não existem prémios no histórico para exportar.");
    return null;
  }

  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = 16;

  function footer() {
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text("Gerado por Verificador Jogos Santa Casa", margin, pageH - 8);
    doc.setTextColor(0);
  }

  function pageBreakIfNeeded(extra) {
    if (y + extra > pageH - 16) {
      doc.addPage();
      y = 16;
      footer();
    }
  }

  const totalApostas = totalApostasGuardadas();
  const totalPremios = historico.length;
  const taxa = totalApostas ? Math.round((totalPremios / totalApostas) * 100) : 0;
  const ultimo = historico[0];

  doc.setFillColor(232, 247, 238);
  doc.roundedRect(margin, y, contentW, 32, 4, 4, "F");
  doc.setTextColor(23, 99, 58);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Relatório de Prémios", margin + 5, y + 11);
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(`Utilizador: ${obterNomeRelatorio()}`, margin + 5, y + 20);
  doc.text(`Data: ${new Date().toLocaleString("pt-PT")}`, margin + 5, y + 26);
  y += 42;

  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Resumo", margin, y);
  y += 8;

  const cards = [
    ["Apostas", totalApostas],
    ["Prémios", totalPremios],
    ["Taxa", `${taxa}%`],
    ["Último", ultimo?.jogo || "—"]
  ];

  const cardW = (contentW - 9) / 4;
  cards.forEach((c, i) => {
    const x = margin + i * (cardW + 3);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, cardW, 22, 3, 3, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(c[0], x + 3, y + 7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(String(c[1]).slice(0, 18), x + 3, y + 16);
  });
  y += 32;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Histórico de prémios", margin, y);
  y += 8;

  historicoParaRelatorioOrdenado().forEach((h, i) => {
    pageBreakIfNeeded(44);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(223, 229, 236);
    doc.roundedRect(margin, y, contentW, 39, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(23, 99, 58);
    doc.text(`${i + 1}. ${h.jogo || "—"} — ${h.premio || "—"}`, margin + 4, y + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(45);
    doc.text(`Sorteio: ${h.sorteio || "—"}${h.dataSorteio ? " — " + h.dataSorteio : ""}`, margin + 4, y + 15);
    doc.text(`Aposta: ${h.aposta || "—"}`, margin + 4, y + 22);
    doc.text(`Acertos/resultado: ${h.resultado || "—"}`, margin + 4, y + 29);
    doc.text(`Guardado em: ${h.dataRegisto || "—"}`, margin + 4, y + 36);

    y += 45;
  });

  footer();
  return { doc, nome: nomeFicheiroPdfHistorico() };
}

function exportarPdfHistorico() {
  const pdf = gerarPdfHistoricoBlobOuDoc();
  if (!pdf) return;
  pdf.doc.save(pdf.nome);
  estado.textContent = "PDF exportado.";
}

async function partilharHistorico() {
  if (!historico.length) {
    alert("Não existem prémios no histórico para partilhar.");
    return;
  }

  const texto = gerarTextoPartilhaHistorico();

  try {
    const pdf = gerarPdfHistoricoBlobOuDoc();

    if (pdf && navigator.canShare) {
      const blob = pdf.doc.output("blob");
      const file = new File([blob], pdf.nome, { type: "application/pdf" });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Histórico de prémios",
          text: "Segue o meu histórico de prémios.",
          files: [file]
        });
        estado.textContent = "Histórico partilhado.";
        return;
      }
    }

    if (navigator.share) {
      await navigator.share({
        title: "Histórico de prémios",
        text: texto
      });
      estado.textContent = "Histórico partilhado.";
      return;
    }
  } catch (err) {
    console.warn("Partilha cancelada ou indisponível:", err);
    return;
  }

  const pdfFallback = gerarPdfHistoricoBlobOuDoc();
  if (pdfFallback) {
    pdfFallback.doc.save(pdfFallback.nome);
    alert("A partilha direta não está disponível neste dispositivo. O PDF foi transferido para poderes enviar por WhatsApp, email ou outra app.");
  }
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
const btnGuardarAlias = document.getElementById("guardarAliasBtn");
if (btnGuardarAlias) {
  btnGuardarAlias.addEventListener("click", () => guardarAliasUtilizador());
}
const inputAliasUtilizador = document.getElementById("aliasUtilizador");
if (inputAliasUtilizador) {
  inputAliasUtilizador.addEventListener("keydown", (e) => {
    if (e.key === "Enter") guardarAliasUtilizador();
  });
}

const btnExportarPdfHistorico = document.getElementById("exportarPdfHistorico");
if (btnExportarPdfHistorico) {
  btnExportarPdfHistorico.addEventListener("click", exportarPdfHistorico);
}

const btnPartilharHistorico = document.getElementById("partilharHistorico");
if (btnPartilharHistorico) {
  btnPartilharHistorico.addEventListener("click", () => partilharHistorico());
}

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

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent || "");
}

function atualizarBotaoInstalar() {
  if (!installPwaBtn) return;
  installPwaBtn.style.display = !isPwaInstalada() ? "" : "none";
  installPwaBtn.textContent = "Instalar app";
}

function mostrarAjudaInstalacao() {
  const msg = isIOS()
    ? "No iPhone/iPad: toca em Partilhar e depois em Adicionar ao ecrã principal."
    : "No Windows/Edge: usa um perfil normal (não Convidado/InPrivate) e abre ... > Aplicações > Instalar este site como aplicação. No Android/Chrome: menu do browser > Instalar app.";
  estado.textContent = msg;
  alert(msg);
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
  atualizarBotaoInstalar();
  installPwaBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      mostrarAjudaInstalacao();
      return;
    }

    deferredInstallPrompt.prompt();
    try {
      const escolha = await deferredInstallPrompt.userChoice;
      estado.textContent = escolha?.outcome === "accepted" ? "Instalação iniciada." : "Instalação cancelada.";
    } catch (e) {
      estado.textContent = "Não foi possível iniciar a instalação automaticamente.";
    }
    deferredInstallPrompt = null;
    atualizarBotaoInstalar();
  });
}

window.addEventListener("online", () => {
  estado.textContent = "Ligação restabelecida. A sincronizar em background...";
  sincronizarTudo({ silencioso: true });
});

window.addEventListener("offline", () => {
  estado.textContent = "Modo offline: a usar dados guardados neste dispositivo.";
});

let novaVersaoDisponivel = false;
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (novaVersaoDisponivel) return;
    novaVersaoDisponivel = true;
    estado.textContent = "Nova versão instalada. A atualizar...";
    setTimeout(() => location.reload(), 800);
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
    navigator.serviceWorker.register("service-worker.js?v=26")
      .then(reg => {
        reg.addEventListener("updatefound", () => {
          const novoWorker = reg.installing;
          if (!novoWorker) return;
          novoWorker.addEventListener("statechange", () => {
            if (novoWorker.state === "installed" && navigator.serviceWorker.controller) {
              estado.textContent = "Nova versão disponível. A aplicar atualização...";
              novoWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      })
      .catch(err => console.warn("Service worker indisponível:", err));
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









setTimeout(() => { try { iniciarNotificacoesV34(); atualizarEstatisticasAvancadas(); notificarPremiosSeNecessarioV34(); } catch(e) {} }, 500);
window.__statsV33Interval = setInterval(() => { try { atualizarEstatisticasAvancadas(); notificarPremiosSeNecessarioV34(); } catch(e) {} }, 2000);
document.addEventListener("click", () => { setTimeout(() => { try { atualizarEstatisticasAvancadas(); } catch(e) {} }, 150); });


// V34 - Notificações PWA
const VAPID_PUBLIC_KEY = ""; // Futuro: chave pública VAPID para push real via servidor.

function atualizarEstadoNotificacoesV34(msg = "") {
  const btn = document.getElementById("ativarNotificacoesBtn");
  const estadoEl = document.getElementById("notificacoesEstado");
  const suportado = "Notification" in window && "serviceWorker" in navigator;
  const perm = suportado ? Notification.permission : "unsupported";
  const ativo = localStorage.getItem("jsc_notificacoes") === "1" && perm === "granted";

  if (btn) {
    if (!suportado) {
      btn.textContent = "🔕 Sem suporte";
      btn.disabled = true;
    } else if (ativo) {
      btn.textContent = "🔔 Ativas";
      btn.classList.add("ativo");
      btn.disabled = false;
    } else if (perm === "denied") {
      btn.textContent = "🔕 Bloqueadas";
      btn.classList.remove("ativo");
      btn.disabled = false;
    } else {
      btn.textContent = "🔔 Notificações";
      btn.classList.remove("ativo");
      btn.disabled = false;
    }
  }

  if (estadoEl && msg) {
    estadoEl.textContent = msg;
    estadoEl.classList.add("visivel");
    clearTimeout(window.__notificacoesEstadoTimer);
    window.__notificacoesEstadoTimer = setTimeout(() => {
      estadoEl.textContent = "";
      estadoEl.classList.remove("visivel");
    }, 4500);
  }
}

function urlBase64ParaUint8ArrayV34(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function obterServiceWorkerProntoV34() {
  if (!("serviceWorker" in navigator)) return null;
  try { return await navigator.serviceWorker.ready; }
  catch {
    try { return await navigator.serviceWorker.register("./service-worker.js"); }
    catch { return null; }
  }
}

async function guardarSubscricaoPushV34(subscription) {
  if (!subscription) return;
  localStorage.setItem("jsc_push_subscription", JSON.stringify(subscription));
  try {
    if (typeof supabaseClient !== "undefined" && supabaseClient && currentUser) {
      await supabaseClient.from("push_subscriptions").upsert({
        user_id: currentUser.id,
        subscription,
        user_agent: navigator.userAgent,
        atualizado_em: new Date().toISOString()
      }, { onConflict: "user_id" });
    }
  } catch {}
}

async function subscreverPushSePossivelV34(reg) {
  if (!reg || !("PushManager" in window)) return null;
  try {
    let sub = await reg.pushManager.getSubscription();
    if (!sub && VAPID_PUBLIC_KEY) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ParaUint8ArrayV34(VAPID_PUBLIC_KEY)
      });
    }
    if (sub) await guardarSubscricaoPushV34(sub);
    return sub;
  } catch { return null; }
}

async function mostrarNotificacaoLocalV34(titulo, opcoes = {}) {
  if (!("Notification" in window) || Notification.permission !== "granted") return false;
  const reg = await obterServiceWorkerProntoV34();
  const options = {
    body: opcoes.body || "",
    icon: opcoes.icon || "./icon-192.png",
    badge: opcoes.badge || "./icon-192.png",
    tag: opcoes.tag || "jsc-notificacao",
    renotify: true,
    data: { url: "./", ...(opcoes.data || {}) }
  };
  try {
    if (reg && reg.showNotification) await reg.showNotification(titulo, options);
    else new Notification(titulo, options);
    return true;
  } catch { return false; }
}

async function pedirPermissaoNotificacoesV34() {
  if (!("Notification" in window)) { alert("Este browser não suporta notificações."); return; }
  if (!window.isSecureContext) { alert("As notificações precisam de HTTPS."); return; }
  const perm = await Notification.requestPermission();
  if (perm !== "granted") {
    localStorage.setItem("jsc_notificacoes", "0");
    atualizarEstadoNotificacoesV34(perm === "denied" ? "Notificações bloqueadas. Ativa-as nas definições do browser." : "Notificações não ativadas.");
    return;
  }
  localStorage.setItem("jsc_notificacoes", "1");
  const reg = await obterServiceWorkerProntoV34();
  await subscreverPushSePossivelV34(reg);
  atualizarEstadoNotificacoesV34("Notificações ativas neste dispositivo.");
  await mostrarNotificacaoLocalV34("Notificações ativas 🍀", {
    body: "Vais receber alertas quando a app encontrar prémios.",
    tag: "jsc-notificacoes-ativas"
  });
}

function notificarPremiosSeNecessarioV34() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (localStorage.getItem("jsc_notificacoes") !== "1") return;
  let historicoLista = [];
  try {
    if (typeof recolherHistoricoV33 === "function") historicoLista = recolherHistoricoV33();
    else if (typeof recolherHistoricoV32 === "function") historicoLista = recolherHistoricoV32();
  } catch {}
  const totalPremios = historicoLista.length;
  const ultimoAvisado = Number(localStorage.getItem("jsc_premios_notificados") || "0");
  if (totalPremios > ultimoAvisado) {
    const ultimo = historicoLista[0] || historicoLista[historicoLista.length - 1] || {};
    const jogo = (typeof obterCampoJogoPremioV33 === "function" ? obterCampoJogoPremioV33(ultimo) : (ultimo.jogo || ultimo.titulo || ""));
    const jogoTxt = (typeof formatarJogoV33 === "function" ? formatarJogoV33(jogo) : (jogo || "Jogo"));
    mostrarNotificacaoLocalV34("🎉 Prémio encontrado!", {
      body: `${jogoTxt}: ${ultimo.premio || "prémio registado"}`,
      tag: `jsc-premio-${totalPremios}`
    });
    localStorage.setItem("jsc_premios_notificados", String(totalPremios));
  }
}

function iniciarNotificacoesV34() {
  const btn = document.getElementById("ativarNotificacoesBtn");
  atualizarEstadoNotificacoesV34();
  if (btn && !btn.__notificacoesV34) {
    btn.__notificacoesV34 = true;
    btn.addEventListener("click", () => pedirPermissaoNotificacoesV34());
  }
}



// V35 - Cartão de notificações com clique real
function atualizarCartaoNotificacoesV35(msg = "") {
  const suporta = "Notification" in window && "serviceWorker" in navigator;
  const permissao = suporta ? Notification.permission : "unsupported";
  const ativo = localStorage.getItem("jsc_notificacoes") === "1" && permissao === "granted";
  const ultima = localStorage.getItem("jsc_ultima_notificacao") || "";

  const badge = document.getElementById("notifEstadoBadge");
  const permEl = document.getElementById("notifPermissao");
  const ultimaEl = document.getElementById("notifUltima");
  const msgEl = document.getElementById("notifMensagem");
  const btnHeader = document.getElementById("ativarNotificacoesBtn");

  if (permEl) permEl.textContent = permissao;
  if (ultimaEl) ultimaEl.textContent = ultima ? new Date(ultima).toLocaleString("pt-PT") : "—";

  if (badge) {
    if (!suporta) badge.textContent = "🔕 Sem suporte";
    else if (ativo) badge.textContent = "🟢 Ativas";
    else if (permissao === "denied") badge.textContent = "🔴 Bloqueadas";
    else badge.textContent = "🟡 Não autorizadas";
  }

  if (btnHeader) {
    btnHeader.textContent = ativo ? "🔔 Ativas" : "🔔 Notificações";
    btnHeader.classList.toggle("ativo", ativo);
  }

  if (msgEl && msg) {
    msgEl.textContent = msg;
    msgEl.classList.add("visivel");
    clearTimeout(window.__notifMsgTimer);
    window.__notifMsgTimer = setTimeout(() => {
      msgEl.textContent = "";
      msgEl.classList.remove("visivel");
    }, 5000);
  }
}

async function obterServiceWorkerV35() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    try {
      return await navigator.serviceWorker.register("./service-worker.js");
    } catch {
      return null;
    }
  }
}

async function enviarNotificacaoTesteV35() {
  if (!("Notification" in window)) {
    alert("Este browser não suporta notificações.");
    return;
  }

  if (Notification.permission !== "granted") {
    atualizarCartaoNotificacoesV35("Primeiro carrega em Ativar notificações.");
    return;
  }

  const reg = await obterServiceWorkerV35();
  const options = {
    body: "As notificações estão configuradas com sucesso.",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    tag: "jsc-teste",
    data: { url: "./" }
  };

  try {
    if (reg && reg.showNotification) await reg.showNotification("🍀 Jogos Santa Casa", options);
    else new Notification("🍀 Jogos Santa Casa", options);

    localStorage.setItem("jsc_ultima_notificacao", new Date().toISOString());
    atualizarCartaoNotificacoesV35("Notificação de teste enviada.");
  } catch {
    atualizarCartaoNotificacoesV35("Não foi possível enviar a notificação.");
  }
}

async function ativarNotificacoesV35() {
  if (!("Notification" in window)) {
    alert("Este browser não suporta notificações.");
    return;
  }

  if (!window.isSecureContext) {
    alert("As notificações precisam de HTTPS.");
    return;
  }

  const permissao = await Notification.requestPermission();

  if (permissao === "granted") {
    localStorage.setItem("jsc_notificacoes", "1");
    await obterServiceWorkerV35();
    atualizarCartaoNotificacoesV35("Notificações ativadas neste dispositivo.");
    await enviarNotificacaoTesteV35();
  } else {
    localStorage.setItem("jsc_notificacoes", "0");
    atualizarCartaoNotificacoesV35(
      permissao === "denied"
        ? "Notificações bloqueadas. Ativa-as nas definições do browser."
        : "Notificações não ativadas."
    );
  }
}

function iniciarCartaoNotificacoesV35() {
  const ativar = document.getElementById("notifAtivarBtn");
  const teste = document.getElementById("notifTesteBtn");
  const header = document.getElementById("ativarNotificacoesBtn");

  if (ativar && !ativar.__v35) {
    ativar.__v35 = true;
    ativar.addEventListener("click", ativarNotificacoesV35);
  }

  if (teste && !teste.__v35) {
    teste.__v35 = true;
    teste.addEventListener("click", enviarNotificacaoTesteV35);
  }

  if (header && !header.__v35) {
    header.__v35 = true;
    header.addEventListener("click", ativarNotificacoesV35);
  }

  atualizarCartaoNotificacoesV35();
}


setTimeout(() => {
  try { iniciarCartaoNotificacoesV35(); } catch(e) {}
}, 700);


// V36 - Banner inteligente de notificações
function deveMostrarBannerNotificacoesV36() {
  const suporta = "Notification" in window && "serviceWorker" in navigator;
  if (!suporta) return false;
  if (Notification.permission === "granted") return false;
  if (Notification.permission === "denied") return false;

  const adiadoAte = Number(localStorage.getItem("jsc_notif_banner_adiado_ate") || "0");
  if (adiadoAte && Date.now() < adiadoAte) return false;

  return true;
}

function atualizarBannerNotificacoesV36() {
  const banner = document.getElementById("notifBanner");
  if (!banner) return;

  const mostrar = deveMostrarBannerNotificacoesV36();
  banner.hidden = !mostrar;
  banner.classList.toggle("visivel", mostrar);
}

function adiarBannerNotificacoesV36() {
  // Esconde durante 7 dias.
  localStorage.setItem("jsc_notif_banner_adiado_ate", String(Date.now() + 7 * 24 * 60 * 60 * 1000));
  atualizarBannerNotificacoesV36();
}

async function ativarNotificacoesPeloBannerV36() {
  if (typeof ativarNotificacoesV35 === "function") {
    await ativarNotificacoesV37();
  } else if (typeof pedirPermissaoNotificacoes === "function") {
    await ativarNotificacoesV37();
  }

  if ("Notification" in window && Notification.permission === "granted") {
    localStorage.removeItem("jsc_notif_banner_adiado_ate");
  }

  atualizarBannerNotificacoesV36();

  if (typeof atualizarCartaoNotificacoesV35 === "function") {
    atualizarCartaoNotificacoesV35();
  }
}

function iniciarBannerNotificacoesV36() {
  const ativar = document.getElementById("notifBannerAtivarBtn");
  const maisTarde = document.getElementById("notifBannerMaisTardeBtn");

  if (ativar && !ativar.__v36) {
    ativar.__v36 = true;
    ativar.addEventListener("click", ativarNotificacoesPeloBannerV36);
  }

  if (maisTarde && !maisTarde.__v36) {
    maisTarde.__v36 = true;
    maisTarde.addEventListener("click", adiarBannerNotificacoesV36);
  }

  atualizarBannerNotificacoesV36();
}


setTimeout(() => {
  try { iniciarBannerNotificacoesV36(); } catch(e) {}
}, 900);
document.addEventListener("visibilitychange", () => {
  try { atualizarBannerNotificacoesV36(); } catch(e) {}
});


// V37 - Notificações limpas + tipos: prémios, novos resultados e sorteios
const JSC_NOTIF_TYPES_V37 = {
  premios: true,
  resultados: true,
  sorteios: true
};

function notifSuportadasV37() {
  return "Notification" in window && "serviceWorker" in navigator && window.isSecureContext;
}

function estadoNotificacoesV37() {
  if (!notifSuportadasV37()) return "unsupported";
  if (Notification.permission === "granted" && localStorage.getItem("jsc_notificacoes") === "1") return "granted";
  return Notification.permission;
}

function textoEstadoNotificacoesV37() {
  const estado = estadoNotificacoesV37();
  if (estado === "granted") return "🟢 Notificações ativas";
  if (estado === "denied") return "🔴 Notificações bloqueadas";
  if (estado === "unsupported") return "🔕 Sem suporte";
  return "🟡 Notificações desativadas";
}

function atualizarMiniNotificacoesV37(msg = "") {
  const mini = document.getElementById("notifStatusMini");
  const headerBtn = document.getElementById("ativarNotificacoesBtn");
  const estado = estadoNotificacoesV37();

  const texto = estado === "granted" ? "🟢 Notificações ativas" :
    estado === "denied" ? "🔴 Notificações bloqueadas" :
    estado === "unsupported" ? "🔕 Sem notificações" :
    "🟡 Notificações desativadas";

  if (mini) {
    mini.textContent = texto;
    mini.classList.toggle("ativo", estado === "granted");
    mini.classList.toggle("bloqueado", estado === "denied" || estado === "unsupported");
  }

  if (headerBtn) {
    headerBtn.textContent = estado === "granted" ? "🔔 Ativas" : "🔔 Notificações";
    headerBtn.classList.toggle("ativo", estado === "granted");
  }

  atualizarModalNotificacoesV37(msg);
}

function atualizarModalNotificacoesV37(msg = "") {
  const estadoEl = document.getElementById("notifModalEstado");
  const permEl = document.getElementById("notifModalPermissao");
  const ultimaEl = document.getElementById("notifModalUltima");
  const msgEl = document.getElementById("notifModalMsg");
  const ultima = localStorage.getItem("jsc_ultima_notificacao") || "";

  if (estadoEl) estadoEl.textContent = textoEstadoNotificacoesV37();
  if (permEl) permEl.textContent = notifSuportadasV37() ? Notification.permission : "unsupported";
  if (ultimaEl) ultimaEl.textContent = ultima ? new Date(ultima).toLocaleString("pt-PT") : "—";

  if (msgEl && msg) {
    msgEl.textContent = msg;
    msgEl.classList.add("visivel");
    clearTimeout(window.__notifModalMsgTimer);
    window.__notifModalMsgTimer = setTimeout(() => {
      msgEl.textContent = "";
      msgEl.classList.remove("visivel");
    }, 4500);
  }
}

function abrirModalNotificacoesV37() {
  const modal = document.getElementById("notifModal");
  if (!modal) return;
  modal.hidden = false;
  atualizarModalNotificacoesV37();
}

function fecharModalNotificacoesV37() {
  const modal = document.getElementById("notifModal");
  if (modal) modal.hidden = true;
}

async function obterServiceWorkerV37() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    try { return await navigator.serviceWorker.register("./service-worker.js"); }
    catch { return null; }
  }
}

async function enviarNotificacaoV37(titulo, body, tag = "jsc-notificacao") {
  if (!notifSuportadasV37() || Notification.permission !== "granted") return false;

  const reg = await obterServiceWorkerV37();
  const options = {
    body,
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    tag,
    renotify: true,
    data: { url: "./" }
  };

  try {
    if (reg && reg.showNotification) await reg.showNotification(titulo, options);
    else new Notification(titulo, options);
    localStorage.setItem("jsc_ultima_notificacao", new Date().toISOString());
    atualizarMiniNotificacoesV37();
    return true;
  } catch {
    return false;
  }
}

async function enviarNotificacaoTesteV37() {
  if (estadoNotificacoesV37() !== "granted") {
    atualizarMiniNotificacoesV37("Primeiro ativa as notificações.");
    return;
  }
  const ok = await enviarNotificacaoV37("🍀 Jogos Santa Casa", "Teste enviado com sucesso. As notificações estão prontas.", "jsc-teste");
  atualizarMiniNotificacoesV37(ok ? "Notificação de teste enviada." : "Não foi possível enviar a notificação.");
}

async function ativarNotificacoesV37() {
  if (!notifSuportadasV37()) {
    atualizarMiniNotificacoesV37("As notificações precisam de HTTPS e de browser compatível.");
    return;
  }

  const permissao = await Notification.requestPermission();

  if (permissao === "granted") {
    localStorage.setItem("jsc_notificacoes", "1");
    localStorage.removeItem("jsc_notif_banner_adiado_ate");
    await obterServiceWorkerV37();
    atualizarBannerNotificacoesV36?.();
    atualizarMiniNotificacoesV37("Notificações ativadas neste dispositivo.");
    await enviarNotificacaoV37("Notificações ativas 🍀", "Vais receber alertas de prémios, novos resultados e sorteios.", "jsc-ativas");
  } else {
    localStorage.setItem("jsc_notificacoes", "0");
    atualizarMiniNotificacoesV37(permissao === "denied"
      ? "Notificações bloqueadas. Ativa-as nas definições do browser."
      : "Notificações não ativadas.");
  }
}

// Compatibilidade com versões anteriores / banner
async function ativarNotificacoesV35(){ return ativarNotificacoesV37(); }
async function pedirPermissaoNotificacoes(){ return ativarNotificacoesV37(); }
async function enviarNotificacaoTesteV35(){ return enviarNotificacaoTesteV37(); }

function obterHistoricoParaNotifV37() {
  try { if (typeof recolherHistoricoV33 === "function") return recolherHistoricoV33() || []; } catch {}
  try { if (typeof recolherHistoricoV32 === "function") return recolherHistoricoV32() || []; } catch {}
  try { if (Array.isArray(historico)) return historico; } catch {}
  try {
    const p = JSON.parse(localStorage.getItem("historico") || localStorage.getItem("jsc_historico") || "[]");
    return Array.isArray(p) ? p : [];
  } catch { return []; }
}

function jogoPremioNotifV37(item) {
  try {
    const campo = typeof obterCampoJogoPremioV33 === "function" ? obterCampoJogoPremioV33(item) : (item?.jogo || item?.titulo || item?.descricao || "");
    return typeof formatarJogoV33 === "function" ? formatarJogoV33(campo) : (campo || "Jogo");
  } catch {
    return item?.jogo || "Jogo";
  }
}

function assinaturaResultadosV37() {
  const partes = [];
  try {
    const jogos = ["euromilhoes", "totoloto", "eurodreams", "milhao", "lotaria_classica", "lotaria_popular"];
    jogos.forEach(j => {
      const r = (typeof resultadosOficiais !== "undefined" && resultadosOficiais) ? resultadosOficiais[j] : null;
      if (r) partes.push(`${j}:${r.sorteio || ""}:${r.data || r.data_sorteio || ""}:${r.numeros || ""}:${r.extras || ""}:${r.codigo || ""}`);
    });
  } catch {}
  return partes.join("|");
}

async function verificarNotificacoesPremiosV37() {
  if (estadoNotificacoesV37() !== "granted" || !JSC_NOTIF_TYPES_V37.premios) return;
  const hist = obterHistoricoParaNotifV37();
  const total = hist.length;
  const avisado = Number(localStorage.getItem("jsc_premios_notificados") || "0");
  if (total > avisado) {
    const ultimo = hist[0] || hist[hist.length - 1] || {};
    await enviarNotificacaoV37("🎉 Prémio encontrado!", `${jogoPremioNotifV37(ultimo)}: ${ultimo.premio || "prémio registado"}`, `jsc-premio-${total}`);
    localStorage.setItem("jsc_premios_notificados", String(total));
  }
}

async function verificarNotificacoesResultadosV37() {
  if (estadoNotificacoesV37() !== "granted" || !JSC_NOTIF_TYPES_V37.resultados) return;
  const assinatura = assinaturaResultadosV37();
  if (!assinatura) return;

  const anterior = localStorage.getItem("jsc_assinatura_resultados") || "";
  if (anterior && anterior !== assinatura) {
    await enviarNotificacaoV37("📢 Novos resultados disponíveis", "Já existem resultados atualizados para verificar as tuas apostas.", "jsc-novos-resultados");
  }
  localStorage.setItem("jsc_assinatura_resultados", assinatura);
}

function jogosComSorteioHojeV37() {
  const d = new Date();
  const dia = d.getDay(); // 0 dom, 1 seg, 2 ter, 3 qua, 4 qui, 5 sex, 6 sab
  const jogos = [];
  if (dia === 2 || dia === 5) jogos.push("Euromilhões");
  if (dia === 3 || dia === 6) jogos.push("Totoloto");
  if ([1,2,3,4,5,6].includes(dia)) jogos.push("M1lhão");
  return jogos;
}

async function verificarNotificacoesSorteiosV37() {
  if (estadoNotificacoesV37() !== "granted" || !JSC_NOTIF_TYPES_V37.sorteios) return;

  const hoje = new Date().toISOString().slice(0,10);
  const key = `jsc_sorteio_avisado_${hoje}`;
  if (localStorage.getItem(key) === "1") return;

  const jogos = jogosComSorteioHojeV37();
  if (!jogos.length) return;

  // Só avisa a partir das 10h para não chatear de madrugada.
  if (new Date().getHours() < 10) return;

  await enviarNotificacaoV37("🎲 Hoje há sorteio", `${jogos.join(", ")}. Boa sorte! 🍀`, "jsc-sorteio-hoje");
  localStorage.setItem(key, "1");
}

async function executarNotificacoesAutomaticasV37() {
  await verificarNotificacoesPremiosV37();
  await verificarNotificacoesResultadosV37();
  await verificarNotificacoesSorteiosV37();
}

function iniciarNotificacoesCleanV37() {
  const mini = document.getElementById("notifStatusMini");
  const fechar = document.getElementById("notifModalFechar");
  const fecharBg = document.getElementById("notifModalFecharBg");
  const ativar = document.getElementById("notifModalAtivar");
  const teste = document.getElementById("notifModalTeste");
  const header = document.getElementById("ativarNotificacoesBtn");

  if (mini && !mini.__v37) { mini.__v37 = true; mini.addEventListener("click", abrirModalNotificacoesV37); }
  if (fechar && !fechar.__v37) { fechar.__v37 = true; fechar.addEventListener("click", fecharModalNotificacoesV37); }
  if (fecharBg && !fecharBg.__v37) { fecharBg.__v37 = true; fecharBg.addEventListener("click", fecharModalNotificacoesV37); }
  if (ativar && !ativar.__v37) { ativar.__v37 = true; ativar.addEventListener("click", ativarNotificacoesV37); }
  if (teste && !teste.__v37) { teste.__v37 = true; teste.addEventListener("click", enviarNotificacaoTesteV37); }
  if (header && !header.__v37) { header.__v37 = true; header.addEventListener("click", ativarNotificacoesV37); }

  atualizarMiniNotificacoesV37();
  executarNotificacoesAutomaticasV37();
}


setTimeout(() => {
  try { iniciarNotificacoesCleanV37(); } catch(e) {}
}, 900);
setInterval(() => {
  try { executarNotificacoesAutomaticasV37(); } catch(e) {}
}, 60000);


// V38 Auto Update
const VERSAO_ATUAL="v38-auto-update";
async function verificarNovaVersao(){
 try{
   const r=await fetch('manifest.json?ts='+Date.now(),{cache:'no-store'});
   const m=await r.json();
   const nova=m.version||VERSAO_ATUAL;
   if(nova!==VERSAO_ATUAL){
      if(confirm(`Existe uma nova versão (${nova}). Atualizar agora?`)){
         if('serviceWorker' in navigator){
           const regs=await navigator.serviceWorker.getRegistrations();
           for(const reg of regs){try{await reg.update();}catch(e){}}
         }
         location.reload(true);
      }
   }
 }catch(e){}
}
setInterval(verificarNovaVersao,300000);
setTimeout(verificarNovaVersao,5000);


// V39 - Estatísticas inteligentes
function normalizarJogoV39(nome) {
  const raw = String(nome || "").toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_ -]/g, "");
  if (!raw) return "";
  if (raw.includes("eurom")) return "euromilhoes";
  if (raw.includes("toto")) return "totoloto";
  if (raw.includes("dream")) return "eurodreams";
  if (raw.includes("milhao") || raw.includes("m1lhao")) return "milhao";
  if (raw.includes("class")) return "lotaria_classica";
  if (raw.includes("popular")) return "lotaria_popular";
  return raw.replace(/\s+/g, "_");
}

function formatarJogoV39(nome) {
  const key = normalizarJogoV39(nome);
  const map = {
    euromilhoes: "Euromilhões",
    totoloto: "Totoloto",
    eurodreams: "EuroDreams",
    milhao: "M1lhão",
    lotaria_classica: "Lotaria Clássica",
    lotaria_popular: "Lotaria Popular"
  };
  return map[key] || nome || "—";
}

function parseJsonV39(valor, fallback) {
  try { return valor ? JSON.parse(valor) : fallback; } catch { return fallback; }
}

function recolherApostasV39() {
  const out = [];
  const seen = new Set();
  function add(lista) {
    if (!Array.isArray(lista)) return;
    lista.forEach(item => {
      if (!item) return;
      const key = JSON.stringify(item);
      if (seen.has(key)) return;
      seen.add(key);
      out.push(item);
    });
  }

  try { if (Array.isArray(apostas)) add(apostas); } catch {}
  if (Array.isArray(window.apostas)) add(window.apostas);
  if (Array.isArray(window.apostasGuardadas)) add(window.apostasGuardadas);

  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.toLowerCase().includes("aposta")) continue;
    const p = parseJsonV39(localStorage.getItem(k), null);
    if (Array.isArray(p)) add(p);
    else if (p && typeof p === "object") Object.values(p).forEach(v => Array.isArray(v) && add(v));
  }
  return out;
}

function recolherHistoricoV39() {
  const out = [];
  const seen = new Set();
  function add(lista) {
    if (!Array.isArray(lista)) return;
    lista.forEach(item => {
      if (!item) return;
      const key = JSON.stringify(item);
      if (seen.has(key)) return;
      seen.add(key);
      out.push(item);
    });
  }

  try { if (Array.isArray(historico)) add(historico); } catch {}
  if (Array.isArray(window.historico)) add(window.historico);

  ["historico", "jsc_historico", "historico_premios", "premios_historico", "historicoPremios"].forEach(k => {
    const p = parseJsonV39(localStorage.getItem(k), null);
    if (Array.isArray(p)) add(p);
  });

  return out;
}

function jogoDaApostaV39(aposta) {
  const direto = aposta?.jogo || aposta?.tipo || aposta?.game || aposta?.nomeJogo || aposta?.lottery || aposta?.endpoint;
  if (direto) return normalizarJogoV39(direto);
  try { return normalizarJogoV39(jogoAtual || document.querySelector("select")?.value || ""); }
  catch { return ""; }
}

function jogoDoPremioV39(item) {
  const campo = item?.jogo || item?.tipo || item?.game || item?.nomeJogo || item?.lottery || item?.endpoint || item?.titulo || item?.descricao || "";
  return normalizarJogoV39(campo);
}

function contarPorJogoV39(lista, getter) {
  const c = {};
  lista.forEach(item => {
    const jogo = getter(item);
    if (!jogo) return;
    c[jogo] = (c[jogo] || 0) + 1;
  });
  return c;
}

function maiorEntradaV39(obj) {
  const e = Object.entries(obj || {});
  if (!e.length) return null;
  return e.sort((a,b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "pt-PT"))[0];
}

function calcularSequenciasV39(totalApostas, totalPremios) {
  const tamanho = Math.min(Math.max(totalApostas, totalPremios), 10);
  const seq = Array.from({length:tamanho}, (_, i) => i >= tamanho - totalPremios);
  let semAtual = 0;
  for (let i = seq.length - 1; i >= 0; i--) {
    if (seq[i]) break;
    semAtual++;
  }
  let premAtual = 0;
  for (let i = seq.length - 1; i >= 0; i--) {
    if (!seq[i]) break;
    premAtual++;
  }
  return { seq, semAtual, premAtual };
}

function setTxtV39(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}

function criarInsightV39(tipo, texto) {
  const icons = {
    bom: "✅",
    aviso: "⚠️",
    info: "ℹ️",
    fogo: "🔥",
    alvo: "🎯"
  };
  return `<div class="intel-insight ${tipo}"><b>${icons[tipo] || "ℹ️"}</b><span>${texto}</span></div>`;
}

function atualizarEstatisticasInteligentesV39() {
  const apostasLista = recolherApostasV39();
  const historicoLista = recolherHistoricoV39();

  const porApostas = contarPorJogoV39(apostasLista, jogoDaApostaV39);
  const porPremios = contarPorJogoV39(historicoLista, jogoDoPremioV39);

  const totalApostas = Object.values(porApostas).reduce((s,n)=>s+n,0);
  const totalPremios = Object.values(porPremios).reduce((s,n)=>s+n,0);

  const maisApostado = maiorEntradaV39(porApostas);
  const maisPremiado = maiorEntradaV39(porPremios);
  const sequencias = calcularSequenciasV39(totalApostas, totalPremios);

  const taxa = totalApostas ? Math.round((totalPremios / totalApostas) * 100) : 0;
  const media = totalPremios ? Math.round(totalApostas / totalPremios) : 0;

  setTxtV39("intelMediaPremios", totalPremios ? `1 a cada ${media} aposta(s)` : "Sem prémios ainda");
  setTxtV39("intelMelhorJogo", maisPremiado ? `${formatarJogoV39(maisPremiado[0])} (${maisPremiado[1]})` : "—");
  setTxtV39("intelJogoDominante", maisApostado ? `${formatarJogoV39(maisApostado[0])} (${maisApostado[1]})` : "—");

  let momento = "Neutro";
  if (sequencias.premAtual >= 2) momento = "🔥 Boa fase";
  else if (sequencias.semAtual >= 5) momento = "🧊 Fase fria";
  else if (totalPremios > 0) momento = "🍀 Com prémios";
  setTxtV39("intelMomento", momento);

  const badge = document.getElementById("intelResumoBadge");
  if (badge) {
    badge.textContent = taxa ? `${taxa}% sucesso` : "A iniciar histórico";
    badge.className = taxa >= 20 ? "bom" : taxa > 0 ? "ok" : "";
  }

  const insights = [];
  if (!totalApostas) {
    insights.push(criarInsightV39("info", "Ainda não há apostas suficientes para criar uma análise inteligente."));
  } else {
    insights.push(criarInsightV39("alvo", `Tens ${totalApostas} aposta(s) registada(s) e ${totalPremios} prémio(s) no histórico.`));

    if (maisApostado) {
      const pctDominante = Math.round((maisApostado[1] / totalApostas) * 100);
      insights.push(criarInsightV39("info", `${formatarJogoV39(maisApostado[0])} representa ${pctDominante}% das tuas apostas.`));
    }

    if (maisPremiado) {
      insights.push(criarInsightV39("bom", `O teu jogo mais premiado é ${formatarJogoV39(maisPremiado[0])}.`));
    }

    if (sequencias.semAtual >= 5) {
      insights.push(criarInsightV39("aviso", `Estás há cerca de ${sequencias.semAtual} aposta(s) sem prémio na sequência recente.`));
    } else if (sequencias.premAtual > 0) {
      insights.push(criarInsightV39("fogo", `A sequência recente terminou com ${sequencias.premAtual} prémio(s).`));
    }

    if (taxa >= 20) {
      insights.push(criarInsightV39("fogo", "A tua taxa de prémios está forte para o histórico atual."));
    } else if (taxa > 0) {
      insights.push(criarInsightV39("info", "Já existe histórico positivo, mas ainda é cedo para tirar grandes conclusões."));
    }
  }

  const insightEl = document.getElementById("intelInsights");
  if (insightEl) insightEl.innerHTML = insights.join("");

  const dist = document.getElementById("intelDistribuicaoJogos");
  const resumo = document.getElementById("intelDistribuicaoResumo");
  const entradas = Object.entries(porApostas).sort((a,b)=>b[1]-a[1]);

  if (resumo) resumo.textContent = totalApostas ? `${entradas.length} jogo(s)` : "Sem dados";
  if (dist) {
    if (!entradas.length) {
      dist.innerHTML = '<div class="mini-ranking-empty">Sem apostas suficientes.</div>';
    } else {
      const max = Math.max(...entradas.map(([,n])=>n), 1);
      dist.innerHTML = entradas.map(([jogo,total]) => {
        const pct = Math.round((total / totalApostas) * 100);
        const width = Math.max(8, Math.round((total / max) * 100));
        return `<div class="intel-dist-row">
          <div><span>${formatarJogoV39(jogo)}</span><strong>${total} · ${pct}%</strong></div>
          <i><em style="width:${width}%"></em></i>
        </div>`;
      }).join("");
    }
  }
}


setTimeout(() => {
  try { atualizarEstatisticasInteligentesV39(); } catch(e) {}
}, 1000);
setInterval(() => {
  try { atualizarEstatisticasInteligentesV39(); } catch(e) {}
}, 3000);
document.addEventListener("click", () => {
  setTimeout(() => { try { atualizarEstatisticasInteligentesV39(); } catch(e) {} }, 200);
});


// V40 - Dashboard Premium / Centro de Sorte
function normalizarJogoV40(nome) {
  const raw = String(nome || "").toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_ -]/g, "");
  if (!raw) return "";
  if (raw.includes("eurom")) return "euromilhoes";
  if (raw.includes("toto")) return "totoloto";
  if (raw.includes("dream")) return "eurodreams";
  if (raw.includes("milhao") || raw.includes("m1lhao")) return "milhao";
  if (raw.includes("class")) return "lotaria_classica";
  if (raw.includes("popular")) return "lotaria_popular";
  return raw.replace(/\s+/g, "_");
}

function formatarJogoV40(nome) {
  const key = normalizarJogoV40(nome);
  const map = {
    euromilhoes: "Euromilhões",
    totoloto: "Totoloto",
    eurodreams: "EuroDreams",
    milhao: "M1lhão",
    lotaria_classica: "Lotaria Clássica",
    lotaria_popular: "Lotaria Popular"
  };
  return map[key] || nome || "—";
}

function parseJsonV40(valor, fallback) {
  try { return valor ? JSON.parse(valor) : fallback; } catch { return fallback; }
}

function recolherApostasV40() {
  if (typeof recolherApostasV39 === "function") {
    try { return recolherApostasV39(); } catch {}
  }
  const out = [];
  const seen = new Set();
  function add(lista) {
    if (!Array.isArray(lista)) return;
    lista.forEach(item => {
      if (!item) return;
      const key = JSON.stringify(item);
      if (seen.has(key)) return;
      seen.add(key);
      out.push(item);
    });
  }
  try { if (Array.isArray(apostas)) add(apostas); } catch {}
  if (Array.isArray(window.apostas)) add(window.apostas);
  if (Array.isArray(window.apostasGuardadas)) add(window.apostasGuardadas);
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.toLowerCase().includes("aposta")) continue;
    const p = parseJsonV40(localStorage.getItem(k), null);
    if (Array.isArray(p)) add(p);
    else if (p && typeof p === "object") Object.values(p).forEach(v => Array.isArray(v) && add(v));
  }
  return out;
}

function recolherHistoricoV40() {
  if (typeof recolherHistoricoV39 === "function") {
    try { return recolherHistoricoV39(); } catch {}
  }
  const out = [];
  const seen = new Set();
  function add(lista) {
    if (!Array.isArray(lista)) return;
    lista.forEach(item => {
      if (!item) return;
      const key = JSON.stringify(item);
      if (seen.has(key)) return;
      seen.add(key);
      out.push(item);
    });
  }
  try { if (Array.isArray(historico)) add(historico); } catch {}
  if (Array.isArray(window.historico)) add(window.historico);
  ["historico", "jsc_historico", "historico_premios", "premios_historico", "historicoPremios"].forEach(k => {
    const p = parseJsonV40(localStorage.getItem(k), null);
    if (Array.isArray(p)) add(p);
  });
  return out;
}

function jogoDaApostaV40(aposta) {
  if (typeof jogoDaApostaV39 === "function") {
    try { return jogoDaApostaV39(aposta); } catch {}
  }
  const direto = aposta?.jogo || aposta?.tipo || aposta?.game || aposta?.nomeJogo || aposta?.lottery || aposta?.endpoint;
  if (direto) return normalizarJogoV40(direto);
  try { return normalizarJogoV40(jogoAtual || document.querySelector("select")?.value || ""); }
  catch { return ""; }
}

function contarPorJogoV40(lista, getter) {
  const c = {};
  lista.forEach(item => {
    const jogo = getter(item);
    if (!jogo) return;
    c[jogo] = (c[jogo] || 0) + 1;
  });
  return c;
}

function sequenciaPremiumV40(totalApostas, totalPremios) {
  const tamanho = Math.min(Math.max(totalApostas, totalPremios), 10);
  return Array.from({ length: tamanho }, (_, i) => i >= tamanho - totalPremios);
}

function maiorSeqV40(seq, valor) {
  let best = 0, atual = 0;
  seq.forEach(v => {
    if (v === valor) { atual++; best = Math.max(best, atual); }
    else atual = 0;
  });
  return best;
}

function atualizarDashboardPremiumV40() {
  const apostas = recolherApostasV40();
  const historico = recolherHistoricoV40();
  const porJogo = contarPorJogoV40(apostas, jogoDaApostaV40);

  const totalApostas = Object.values(porJogo).reduce((s,n)=>s+n,0);
  const totalPremios = historico.length || Number(document.querySelector('[data-total-premios]')?.textContent || 0);
  const taxa = totalApostas ? Math.round((totalPremios / totalApostas) * 100) : 0;
  const seq = sequenciaPremiumV40(totalApostas, totalPremios);
  const seqPremios = maiorSeqV40(seq, true);
  const seqSem = maiorSeqV40(seq, false);

  const score = Math.max(0, Math.min(100, Math.round((taxa * 3) + (seqPremios * 8) - Math.min(seqSem * 2, 20) + Math.min(totalApostas, 20))));
  const nivel = score >= 80 ? "💎 Diamante" : score >= 55 ? "🥇 Ouro" : score >= 30 ? "🥈 Prata" : score >= 10 ? "🥉 Bronze" : "🍀 Iniciante";
  const fase = seqPremios >= 2 ? "🔥 Quente" : seqSem >= 5 ? "🧊 Fria" : totalPremios ? "🍀 Positiva" : "A iniciar";

  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  set("premiumNivel", nivel);
  set("premiumScoreValor", String(score));
  set("premiumApostas", String(totalApostas || 0));
  set("premiumPremios", String(totalPremios || 0));
  set("premiumTaxa", `${taxa}%`);
  set("premiumFase", fase);

  const ring = document.getElementById("premiumRing");
  if (ring) ring.style.setProperty("--score", score);

  const texto = document.getElementById("premiumScoreTexto");
  if (texto) {
    texto.textContent = score >= 60 ? "Bom histórico para os dados atuais." :
      score >= 30 ? "Histórico em evolução." :
      totalApostas ? "Ainda estás a construir histórico." :
      "Adiciona apostas para gerar o índice.";
  }

  const seqEl = document.getElementById("premiumSequencia");
  if (seqEl) {
    seqEl.innerHTML = seq.length
      ? seq.map(v => `<span class="${v ? "win" : "lose"}">${v ? "🏆" : "×"}</span>`).join("")
      : '<small>Sem dados</small>';
  }

  const topEl = document.getElementById("premiumTopJogos");
  if (topEl) {
    const entradas = Object.entries(porJogo).sort((a,b)=>b[1]-a[1]).slice(0,3);
    if (!entradas.length) {
      topEl.innerHTML = '<small>Sem dados</small>';
    } else {
      const max = Math.max(...entradas.map(([,n])=>n), 1);
      topEl.innerHTML = entradas.map(([j,n]) => {
        const pct = Math.round((n/max)*100);
        return `<div class="premium-top-row">
          <div><span>${formatarJogoV40(j)}</span><b>${n}</b></div>
          <i><em style="width:${pct}%"></em></i>
        </div>`;
      }).join("");
    }
  }
}


setTimeout(() => {
  try { atualizarDashboardPremiumV40(); } catch(e) {}
}, 1100);
setInterval(() => {
  try { atualizarDashboardPremiumV40(); } catch(e) {}
}, 3000);
document.addEventListener("click", () => {
  setTimeout(() => { try { atualizarDashboardPremiumV40(); } catch(e) {} }, 250);
});


// V41 - Notificações premium com valor de prémio, logo, badge e ações
const JSC_ICON_V41 = "./icon-192.png";
const JSC_BADGE_V41 = "./icon-192.png";

function estadoNotifV41() {
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !window.isSecureContext) return "unsupported";
  if (Notification.permission === "granted" && localStorage.getItem("jsc_notificacoes") === "1") return "granted";
  return Notification.permission;
}

async function swReadyV41() {
  if (!("serviceWorker" in navigator)) return null;
  try { return await navigator.serviceWorker.ready; }
  catch {
    try { return await navigator.serviceWorker.register("./service-worker.js"); }
    catch { return null; }
  }
}

function gerarTagUnicaV41(prefixo) {
  return `${prefixo}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function vibracaoV41(tipo) {
  if (tipo === "premio") return [280, 90, 280, 90, 420];
  if (tipo === "sorteio") return [150, 80, 150];
  if (tipo === "resultados") return [120, 70, 120, 70, 120];
  if (tipo === "update") return [100];
  return [120];
}

function urlDestinoNotifV41(tipo) {
  if (tipo === "premio") return "./#secHistorico";
  if (tipo === "resultados") return "./#secResultados";
  return "./";
}

async function mostrarNotificacaoPremiumV41(tipo, titulo, body, extra = {}) {
  if (estadoNotifV41() !== "granted") return false;
  const reg = await swReadyV41();
  const options = {
    body,
    icon: extra.icon || JSC_ICON_V41,
    badge: extra.badge || JSC_BADGE_V41,
    tag: extra.tag || gerarTagUnicaV41(`jsc-${tipo}`),
    renotify: false,
    vibrate: extra.vibrate || vibracaoV41(tipo),
    requireInteraction: tipo === "premio",
    data: { url: extra.url || urlDestinoNotifV41(tipo), tipo, criadoEm: new Date().toISOString(), ...(extra.data || {}) },
    actions: extra.actions || [{ action: "abrir", title: "Abrir app" }]
  };

  if (tipo === "premio") {
    options.actions = [{ action: "ver_premio", title: "Ver prémio" }, { action: "abrir", title: "Abrir app" }];
  } else if (tipo === "resultados") {
    options.actions = [{ action: "ver_resultados", title: "Ver resultados" }, { action: "abrir", title: "Abrir app" }];
  }

  try {
    if (reg && reg.showNotification) await reg.showNotification(titulo, options);
    else new Notification(titulo, options);
    localStorage.setItem("jsc_ultima_notificacao", new Date().toISOString());
    if (typeof atualizarMiniNotificacoesV37 === "function") atualizarMiniNotificacoesV37();
    return true;
  } catch {
    return false;
  }
}

function obterHistoricoPremiosV41() {
  try { if (typeof recolherHistoricoV39 === "function") return recolherHistoricoV39() || []; } catch {}
  try { if (typeof recolherHistoricoV40 === "function") return recolherHistoricoV40() || []; } catch {}
  try { if (typeof recolherHistoricoV33 === "function") return recolherHistoricoV33() || []; } catch {}
  try { if (Array.isArray(historico)) return historico; } catch {}
  try { return JSON.parse(localStorage.getItem("historico") || localStorage.getItem("jsc_historico") || "[]") || []; }
  catch { return []; }
}

function campoTextoV41(item, nomes) {
  for (const n of nomes) {
    if (item && item[n] !== undefined && item[n] !== null && String(item[n]).trim() !== "") return String(item[n]).trim();
  }
  return "";
}

function jogoPremioV41(item) {
  const raw = campoTextoV41(item, ["jogo", "tipo", "game", "nomeJogo", "lottery", "endpoint", "titulo"]);
  try {
    if (typeof formatarJogoV39 === "function") return formatarJogoV39(raw);
    if (typeof formatarJogoV40 === "function") return formatarJogoV40(raw);
    if (typeof formatarJogoV33 === "function") return formatarJogoV33(raw);
  } catch {}
  return raw || "Jogo";
}

function valorPremioV41(item) {
  const direto = campoTextoV41(item, ["valor", "valorPremio", "premioValor", "amount", "prize", "prize_value"]);
  if (direto) return direto;

  const texto = [campoTextoV41(item, ["premio", "titulo", "descricao", "resultado", "texto"]), JSON.stringify(item || {})].join(" ");
  const eur = texto.match(/(?:€\s*)?(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|\d+(?:,\d{2})?)\s*€/);
  if (eur) return `${eur[1].replace(/\s/g, ".")} €`;
  if (/valor\s+a\s+consultar/i.test(texto)) return "valor a consultar";
  return "";
}

function acertosPremioV41(item) {
  const direto = campoTextoV41(item, ["acertos", "resultadoAposta", "match", "matches"]);
  if (direto) return direto;
  const texto = [campoTextoV41(item, ["descricao", "resultado", "premio", "texto"]), JSON.stringify(item || {})].join(" ");
  const m = texto.match(/(\d+\s*n[úu]mero\(s\).*?(?:estrela\(s\)|n[ºo]\s*da\s*sorte|sonho\(s\))?|\d+\s*n[úu]mero\(s\)|\d+\s*estrela\(s\)|\d+\s*n[ºo]\s*da\s*sorte)/i);
  return m ? m[0].replace(/\s+/g, " ").trim() : "";
}

function concursoPremioV41(item) {
  const sorteio = campoTextoV41(item, ["sorteio", "concurso", "draw", "numeroSorteio"]);
  const data = campoTextoV41(item, ["data", "dataSorteio", "date", "dia"]);
  if (sorteio && data) return `Concurso ${sorteio} • ${data}`;
  if (sorteio) return `Concurso ${sorteio}`;
  if (data) return data;
  return "";
}

function corpoPremioV41(item) {
  const jogo = jogoPremioV41(item);
  const concurso = concursoPremioV41(item);
  const acertos = acertosPremioV41(item);
  const valor = valorPremioV41(item);
  const linhas = [];
  linhas.push(concurso ? `${jogo} • ${concurso}` : jogo);
  if (acertos) linhas.push(acertos);
  linhas.push(`Valor: ${valor || "a consultar"}`);
  return linhas.join("\n");
}

async function verificarPremiosPremiumV41() {
  if (estadoNotifV41() !== "granted") return;
  const hist = obterHistoricoPremiosV41();
  const total = hist.length;
  const avisado = Number(localStorage.getItem("jsc_premios_notificados_v41") || localStorage.getItem("jsc_premios_notificados") || "0");
  if (total > avisado) {
    const novos = hist.slice(0, Math.min(total - avisado, 5));
    for (let i = novos.length - 1; i >= 0; i--) {
      const item = novos[i] || {};
      await mostrarNotificacaoPremiumV41("premio", "🏆 Encontrámos um prémio!", corpoPremioV41(item), {
        tag: gerarTagUnicaV41("jsc-premio"),
        url: "./#secHistorico",
        data: { premio: item }
      });
    }
    localStorage.setItem("jsc_premios_notificados_v41", String(total));
    localStorage.setItem("jsc_premios_notificados", String(total));
  }
}

function assinaturaResultadosPremiumV41() {
  try { if (typeof assinaturaResultadosV37 === "function") return assinaturaResultadosV37(); } catch {}
  const partes = [];
  try {
    const jogos = ["euromilhoes", "totoloto", "eurodreams", "milhao", "lotaria_classica", "lotaria_popular"];
    jogos.forEach(j => {
      const r = (typeof resultadosOficiais !== "undefined" && resultadosOficiais) ? resultadosOficiais[j] : null;
      if (r) partes.push(`${j}:${r.sorteio || ""}:${r.data || r.data_sorteio || ""}:${JSON.stringify(r.resultado || r.numeros || "")}`);
    });
  } catch {}
  return partes.join("|");
}

async function verificarResultadosPremiumV41() {
  if (estadoNotifV41() !== "granted") return;
  const ass = assinaturaResultadosPremiumV41();
  if (!ass) return;
  const anterior = localStorage.getItem("jsc_assinatura_resultados_v41") || localStorage.getItem("jsc_assinatura_resultados") || "";
  if (anterior && anterior !== ass) {
    await mostrarNotificacaoPremiumV41("resultados", "📢 Novos resultados disponíveis", "Já existem resultados atualizados para verificar as tuas apostas.", {
      tag: gerarTagUnicaV41("jsc-resultados"),
      url: "./#secResultados"
    });
  }
  localStorage.setItem("jsc_assinatura_resultados_v41", ass);
  localStorage.setItem("jsc_assinatura_resultados", ass);
}

function jogosHojePremiumV41() {
  try { if (typeof jogosComSorteioHojeV37 === "function") return jogosComSorteioHojeV37(); } catch {}
  const dia = new Date().getDay();
  const jogos = [];
  if (dia === 2 || dia === 5) jogos.push("Euromilhões");
  if (dia === 3 || dia === 6) jogos.push("Totoloto");
  if ([1,2,3,4,5,6].includes(dia)) jogos.push("M1lhão");
  return jogos;
}

async function verificarSorteiosPremiumV41() {
  if (estadoNotifV41() !== "granted") return;
  const hoje = new Date().toISOString().slice(0,10);
  const key = `jsc_sorteio_avisado_v41_${hoje}`;
  if (localStorage.getItem(key) === "1") return;
  if (new Date().getHours() < 10) return;
  const jogos = jogosHojePremiumV41();
  if (!jogos.length) return;
  await mostrarNotificacaoPremiumV41("sorteio", "🎲 Hoje há sorteio", `${jogos.join(", ")}. Boa sorte! 🍀`, {
    tag: gerarTagUnicaV41("jsc-sorteio"),
    url: "./"
  });
  localStorage.setItem(key, "1");
}

async function enviarNotificacaoV37(titulo, body, tag = "jsc-notificacao") {
  return mostrarNotificacaoPremiumV41("geral", titulo, body, { tag: gerarTagUnicaV41(tag) });
}
async function enviarNotificacaoTesteV37() {
  return mostrarNotificacaoPremiumV41("geral", "🍀 Jogos Santa Casa", "Teste enviado com sucesso. Som por defeito do telemóvel.", { tag: gerarTagUnicaV41("jsc-teste") });
}
async function enviarNotificacaoTesteV35(){ return enviarNotificacaoTesteV37(); }

async function executarNotificacoesAutomaticasV41() {
  await verificarPremiosPremiumV41();
  await verificarResultadosPremiumV41();
  await verificarSorteiosPremiumV41();
}
function iniciarNotificacoesPremiumV41() {
  executarNotificacoesAutomaticasV41();
}


setTimeout(() => { try { iniciarNotificacoesPremiumV41(); } catch(e) {} }, 1300);
setInterval(() => { try { executarNotificacoesAutomaticasV41(); } catch(e) {} }, 60000);


// V41.1 - Afinar notificações premium
function assetNotifV411(nome) {
  try { return new URL(nome, location.href).href; }
  catch { return nome; }
}

const JSC_ICON_V411 = assetNotifV411("icon-192.png");
const JSC_BADGE_V411 = assetNotifV411("icon-192.png");

function valorPremioV411(item) {
  const direto = campoTextoV41(item, ["valor", "valorPremio", "premioValor", "amount", "prize", "prize_value", "premio_valor"]);
  if (direto) {
    const d = String(direto).trim();
    if (/consultar/i.test(d)) return "valor a consultar";
    if (/€/.test(d)) return d;
    if (/^\d+([,.]\d{2})?$/.test(d)) return `${d.replace(".", ",")} €`;
    return d;
  }

  const texto = [
    campoTextoV41(item, ["premio", "titulo", "descricao", "resultado", "texto", "resumo"]),
    JSON.stringify(item || {})
  ].join(" ");

  const eur1 = texto.match(/€\s*(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|\d+(?:,\d{2})?)/);
  if (eur1) return `${eur1[1].replace(/\s/g, ".")} €`;

  const eur2 = texto.match(/(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|\d+(?:,\d{2})?)\s*€/);
  if (eur2) return `${eur2[1].replace(/\s/g, ".")} €`;

  if (/valor\s+a\s+consultar/i.test(texto)) return "valor a consultar";
  if (/a\s+consultar/i.test(texto)) return "valor a consultar";
  return "";
}

function limparPremioTextoV411(txt) {
  return String(txt || "")
    .replace(/pr[ée]mio\s*[—-]\s*/i, "")
    .replace(/valor\s+a\s+consultar/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function corpoPremioV41(item) {
  const jogo = jogoPremioV41(item);
  const concurso = concursoPremioV41(item);
  const acertos = acertosPremioV41(item);
  const valor = valorPremioV411(item);
  const premioTexto = limparPremioTextoV411(campoTextoV41(item, ["premio", "titulo", "descricao"]));

  const linhas = [];
  linhas.push(concurso ? `${jogo} • ${concurso}` : jogo);
  if (acertos) linhas.push(acertos);
  else if (premioTexto && !/premio encontrado/i.test(premioTexto)) linhas.push(premioTexto);
  linhas.push(`Valor: ${valor || "a consultar"}`);
  return linhas.join("\n");
}

async function mostrarNotificacaoPremiumV41(tipo, titulo, body, extra = {}) {
  if (estadoNotifV41() !== "granted") return false;
  const reg = await swReadyV41();
  const options = {
    body,
    icon: extra.icon || JSC_ICON_V411,
    badge: extra.badge || JSC_BADGE_V411,
    tag: extra.tag || gerarTagUnicaV41(`jsc-${tipo}`),
    renotify: false,
    vibrate: extra.vibrate || vibracaoV41(tipo),
    requireInteraction: tipo === "premio",
    data: { url: extra.url || urlDestinoNotifV41(tipo), tipo, criadoEm: new Date().toISOString(), ...(extra.data || {}) },
    actions: extra.actions || [{ action: "abrir", title: "Abrir app" }]
  };

  if (tipo === "premio") {
    options.actions = [{ action: "ver_premio", title: "Ver prémio" }, { action: "abrir", title: "Abrir app" }];
  } else if (tipo === "resultados") {
    options.actions = [{ action: "ver_resultados", title: "Ver resultados" }, { action: "abrir", title: "Abrir app" }];
  }

  try {
    if (reg && reg.showNotification) await reg.showNotification(titulo, options);
    else new Notification(titulo, options);
    localStorage.setItem("jsc_ultima_notificacao", new Date().toISOString());
    if (typeof atualizarMiniNotificacoesV37 === "function") atualizarMiniNotificacoesV37();
    return true;
  } catch {
    return false;
  }
}

async function enviarNotificacaoTesteV37() {
  return mostrarNotificacaoPremiumV41("geral", "🍀 Jogos Santa Casa", "Teste com ícone da app e som por defeito do telemóvel.", { tag: gerarTagUnicaV41("jsc-teste") });
}
async function enviarNotificacaoTesteV35(){ return enviarNotificacaoTesteV37(); }



// V42 - Prémios Premium com valores e tendência
function parseValorPremioV42(valor) {
  if (valor === undefined || valor === null) return null;
  let txt = String(valor).trim();
  if (!txt || /consultar/i.test(txt)) return null;
  txt = txt.replace(/[€\s]/g, "");
  if (txt.includes(",") && txt.includes(".")) txt = txt.replace(/\./g, "").replace(",", ".");
  else if (txt.includes(",")) txt = txt.replace(",", ".");
  const n = Number(txt);
  return Number.isFinite(n) ? n : null;
}

function formatMoedaV42(n) {
  if (!Number.isFinite(n)) return "valor a consultar";
  return n.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

function historicoPremiosV42() {
  try { if (typeof obterHistoricoPremiosV41 === "function") return obterHistoricoPremiosV41() || []; } catch {}
  try { if (typeof recolherHistoricoV39 === "function") return recolherHistoricoV39() || []; } catch {}
  try { if (typeof recolherHistoricoV40 === "function") return recolherHistoricoV40() || []; } catch {}
  try { if (Array.isArray(historico)) return historico; } catch {}
  return [];
}

function valorConhecidoPremioV42(item) {
  try {
    if (typeof valorPremioV411 === "function") return parseValorPremioV42(valorPremioV411(item));
    if (typeof valorPremioV41 === "function") return parseValorPremioV42(valorPremioV41(item));
  } catch {}
  const campos = ["valor", "valorPremio", "premioValor", "amount", "prize", "prize_value", "premio_valor"];
  for (const c of campos) {
    const v = parseValorPremioV42(item?.[c]);
    if (v !== null) return v;
  }
  const texto = JSON.stringify(item || {});
  const m = texto.match(/(?:€\s*)?(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|\d+(?:,\d{2})?)\s*€/);
  return m ? parseValorPremioV42(m[1]) : null;
}

function jogoPremioV42(item) {
  try { if (typeof jogoPremioV41 === "function") return jogoPremioV41(item); } catch {}
  return item?.jogo || item?.tipo || "Jogo";
}

function dataPremioV42(item) {
  return item?.data || item?.dataSorteio || item?.date || item?.dia || "";
}

function acertosPremioV42(item) {
  try { if (typeof acertosPremioV41 === "function") return acertosPremioV41(item); } catch {}
  return item?.acertos || item?.resultado || "";
}

function tendenciaPremiosV42(totalApostas, totalPremios) {
  if (!totalApostas) return "—";
  const taxa = totalPremios / totalApostas;
  if (taxa >= 0.20) return "⬆ A melhorar";
  if (taxa >= 0.08) return "➡ Estável";
  return "⬇ Baixa";
}

function apostasTotaisV42() {
  try {
    if (typeof recolherApostasV40 === "function") {
      const ap = recolherApostasV40();
      if (Array.isArray(ap) && ap.length) return ap.length;
    }
  } catch {}
  try {
    if (typeof recolherApostasV39 === "function") {
      const ap = recolherApostasV39();
      if (Array.isArray(ap) && ap.length) return ap.length;
    }
  } catch {}
  const txt = document.body.innerText.match(/Total de apostas\s+(\d+)/i);
  return txt ? Number(txt[1]) : 0;
}

function atualizarPremiosPremiumV42() {
  const hist = historicoPremiosV42();
  const totalPremios = hist.length;
  const totalApostas = apostasTotaisV42();

  const conhecidos = hist.map(p => ({ item:p, valor:valorConhecidoPremioV42(p) }));
  const apenasValores = conhecidos.map(x => x.valor).filter(v => v !== null);
  const totalGanho = apenasValores.reduce((s,n)=>s+n,0);
  const maior = apenasValores.length ? Math.max(...apenasValores) : null;
  const consultar = conhecidos.filter(x => x.valor === null).length;

  const porJogo = {};
  hist.forEach(p => {
    const j = jogoPremioV42(p);
    porJogo[j] = (porJogo[j] || 0) + 1;
  });
  const melhorJogo = Object.entries(porJogo).sort((a,b)=>b[1]-a[1])[0];

  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

  set("premioTotalGanho", apenasValores.length ? formatMoedaV42(totalGanho) : "A consultar");
  set("premioTotalNota", consultar ? `${consultar} prémio(s) ainda com valor a consultar.` : "Todos os valores conhecidos.");
  set("premioMaior", maior !== null ? formatMoedaV42(maior) : "A consultar");
  set("premioMelhorJogo", melhorJogo ? `${melhorJogo[0]} (${melhorJogo[1]})` : "—");
  set("premioTendencia", tendenciaPremiosV42(totalApostas, totalPremios));

  const badge = document.getElementById("premiosNivelBadge");
  if (badge) {
    if (!totalPremios) badge.textContent = "Sem prémios";
    else if (apenasValores.length) badge.textContent = `${formatMoedaV42(totalGanho)}`;
    else badge.textContent = `${totalPremios} prémio(s)`;
  }

  const resumo = document.getElementById("premiosPremiumResumo");
  if (resumo) resumo.textContent = `${totalPremios} prémio(s) · ${consultar} a consultar`;

  const lista = document.getElementById("premiosPremiumLista");
  if (lista) {
    if (!hist.length) {
      lista.innerHTML = '<div class="premios-empty">Ainda sem prémios registados.</div>';
    } else {
      lista.innerHTML = hist.slice(0, 5).map(p => {
        const valor = valorConhecidoPremioV42(p);
        const jogo = jogoPremioV42(p);
        const data = dataPremioV42(p);
        const acertos = acertosPremioV42(p);
        return `<div class="premio-row ${valor !== null ? "valor" : "consultar"}">
          <div>
            <strong>${jogo}</strong>
            <span>${[data, acertos].filter(Boolean).join(" · ") || "Prémio encontrado"}</span>
          </div>
          <b>${valor !== null ? formatMoedaV42(valor) : "A consultar"}</b>
        </div>`;
      }).join("");
    }
  }
}

// Override texto das notificações para destacar valor
function corpoPremioV41(item) {
  const jogo = jogoPremioV42(item);
  const data = dataPremioV42(item);
  const acertos = acertosPremioV42(item);
  const valor = valorConhecidoPremioV42(item);
  const linhas = [];
  linhas.push(data ? `${jogo} • ${data}` : jogo);
  if (acertos) linhas.push(acertos);
  linhas.push(`Valor: ${valor !== null ? formatMoedaV42(valor) : "a consultar"}`);
  return linhas.join("\n");
}

async function mostrarAnimacaoPremioV42() {
  if (document.getElementById("premioConfettiV42")) return;
  const wrap = document.createElement("div");
  wrap.id = "premioConfettiV42";
  wrap.innerHTML = Array.from({length: 24}, (_, i) => `<i style="--i:${i}">🎉</i>`).join("");
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 2400);
}

async function verificarPremiosPremiumV41() {
  if (estadoNotifV41() !== "granted") return;
  const hist = obterHistoricoPremiosV41();
  const total = hist.length;
  const avisado = Number(localStorage.getItem("jsc_premios_notificados_v41") || localStorage.getItem("jsc_premios_notificados") || "0");
  if (total > avisado) {
    const novos = hist.slice(0, Math.min(total - avisado, 5));
    for (let i = novos.length - 1; i >= 0; i--) {
      const item = novos[i] || {};
      const valor = valorConhecidoPremioV42(item);
      await mostrarNotificacaoPremiumV41(
        "premio",
        valor !== null ? `🏆 Ganhou ${formatMoedaV42(valor)}!` : "🏆 Encontrámos um prémio!",
        corpoPremioV41(item),
        { tag: gerarTagUnicaV41("jsc-premio"), url: "./#secHistorico", data: { premio: item } }
      );
    }
    localStorage.setItem("jsc_premios_notificados_v41", String(total));
    localStorage.setItem("jsc_premios_notificados", String(total));
    mostrarAnimacaoPremioV42();
  }
}

function iniciarPremiosPremiumV42() {
  atualizarPremiosPremiumV42();
}


setTimeout(() => {
  try { iniciarPremiosPremiumV42(); } catch(e) {}
}, 1400);
setInterval(() => {
  try { atualizarPremiosPremiumV42(); } catch(e) {}
}, 3000);


// V43 - Perfil do Apostador + valores oficiais mais agressivos
function limparNumeroMoedaV43(txt) {
  if (txt === undefined || txt === null) return null;
  let s = String(txt).trim();
  if (!s || /consultar/i.test(s)) return null;
  s = s.replace(/[€\s]/g, "");
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function formatMoedaV43(n) {
  if (!Number.isFinite(n)) return "A consultar";
  return n.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

function procurarValorEmObjetoV43(obj, profundidade = 0) {
  if (!obj || profundidade > 5) return null;

  if (typeof obj === "number") return obj > 0 ? obj : null;

  if (typeof obj === "string") {
    const moeda1 = obj.match(/€\s*(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|\d+(?:,\d{2})?)/);
    if (moeda1) return limparNumeroMoedaV43(moeda1[1]);

    const moeda2 = obj.match(/(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|\d+(?:,\d{2})?)\s*€/);
    if (moeda2) return limparNumeroMoedaV43(moeda2[1]);

    if (/valor|premio|prémio|amount|prize/i.test(obj)) {
      const n = limparNumeroMoedaV43(obj);
      if (n !== null) return n;
    }
    return null;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const v = procurarValorEmObjetoV43(item, profundidade + 1);
      if (v !== null) return v;
    }
    return null;
  }

  if (typeof obj === "object") {
    const preferidas = [
      "valor", "valorPremio", "premioValor", "valor_premio", "premio_valor",
      "amount", "prize", "prize_value", "valorPremios", "premios", "premio",
      "jackpot", "value", "quantia", "montante"
    ];

    for (const k of preferidas) {
      if (obj[k] !== undefined) {
        const v = procurarValorEmObjetoV43(obj[k], profundidade + 1);
        if (v !== null) return v;
      }
    }

    for (const [k, v0] of Object.entries(obj)) {
      if (/valor|premio|prémio|amount|prize|quantia|montante/i.test(k)) {
        const v = procurarValorEmObjetoV43(v0, profundidade + 1);
        if (v !== null) return v;
      }
    }

    for (const v0 of Object.values(obj)) {
      const v = procurarValorEmObjetoV43(v0, profundidade + 1);
      if (v !== null) return v;
    }
  }

  return null;
}

function valorConhecidoPremioV42(item) {
  const direto = procurarValorEmObjetoV43(item);
  if (direto !== null) return direto;

  try {
    if (typeof valorPremioV411 === "function") {
      const v = limparNumeroMoedaV43(valorPremioV411(item));
      if (v !== null) return v;
    }
    if (typeof valorPremioV41 === "function") {
      const v = limparNumeroMoedaV43(valorPremioV41(item));
      if (v !== null) return v;
    }
  } catch {}

  return null;
}

function recolherApostasPerfilV43() {
  try { if (typeof recolherApostasV40 === "function") return recolherApostasV40() || []; } catch {}
  try { if (typeof recolherApostasV39 === "function") return recolherApostasV39() || []; } catch {}
  return [];
}

function recolherHistoricoPerfilV43() {
  try { if (typeof historicoPremiosV42 === "function") return historicoPremiosV42() || []; } catch {}
  try { if (typeof obterHistoricoPremiosV41 === "function") return obterHistoricoPremiosV41() || []; } catch {}
  return [];
}

function jogoApostaPerfilV43(aposta) {
  try { if (typeof jogoDaApostaV40 === "function") return formatarJogoV40(jogoDaApostaV40(aposta)); } catch {}
  try { if (typeof jogoDaApostaV39 === "function") return formatarJogoV39(jogoDaApostaV39(aposta)); } catch {}
  return aposta?.jogo || "—";
}

function calcularNivelPerfilV43(pontos) {
  const niveis = [
    { nome:"🥉 Bronze", min:0, prox:50 },
    { nome:"🥈 Prata", min:50, prox:120 },
    { nome:"🥇 Ouro", min:120, prox:250 },
    { nome:"💎 Diamante", min:250, prox:500 },
    { nome:"👑 Lendário", min:500, prox:null }
  ];
  let atual = niveis[0];
  for (const n of niveis) if (pontos >= n.min) atual = n;
  return atual;
}

function sequenciasPerfilV43(totalApostas, totalPremios) {
  const tamanho = Math.min(Math.max(totalApostas, totalPremios), 20);
  const seq = Array.from({ length:tamanho }, (_, i) => i >= tamanho - totalPremios);
  let semAtual = 0;
  for (let i = seq.length - 1; i >= 0; i--) {
    if (seq[i]) break;
    semAtual++;
  }
  let melhorPremios = 0, atual = 0;
  seq.forEach(v => {
    if (v) { atual++; melhorPremios = Math.max(melhorPremios, atual); }
    else atual = 0;
  });
  return { semAtual, melhorPremios };
}

function atualizarPerfilApostadorV43() {
  const apostas = recolherApostasPerfilV43();
  const hist = recolherHistoricoPerfilV43();

  const totalApostas = apostas.length || apostasTotaisV42?.() || 0;
  const totalPremios = hist.length;
  const valores = hist.map(valorConhecidoPremioV42).filter(v => v !== null);
  const totalGanho = valores.reduce((s,n)=>s+n,0);
  const maior = valores.length ? Math.max(...valores) : null;
  const taxa = totalApostas ? Math.round((totalPremios / totalApostas) * 100) : 0;

  const porJogo = {};
  apostas.forEach(a => {
    const j = jogoApostaPerfilV43(a);
    if (!j || j === "—") return;
    porJogo[j] = (porJogo[j] || 0) + 1;
  });
  const favorito = Object.entries(porJogo).sort((a,b)=>b[1]-a[1])[0];

  const seq = sequenciasPerfilV43(totalApostas, totalPremios);
  const indice = Math.max(0, Math.min(100, Math.round((taxa * 3) + Math.min(totalApostas, 30) + (totalPremios * 8) + (valores.length ? 10 : 0))));
  const pontos = totalApostas * 4 + totalPremios * 22 + Math.min(Math.round(totalGanho / 10), 150);
  const nivel = calcularNivelPerfilV43(pontos);
  const prox = nivel.prox;

  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  set("perfilNivel", nivel.nome);
  set("perfilNivelBadge", `${pontos} pts`);
  set("perfilNivelTexto", prox ? `${Math.max(0, prox - pontos)} pontos para o próximo nível.` : "Nível máximo atingido.");
  set("perfilApostas", String(totalApostas));
  set("perfilPremios", String(totalPremios));
  set("perfilTotalGanho", valores.length ? formatMoedaV43(totalGanho) : "A consultar");
  set("perfilMaiorPremio", maior !== null ? formatMoedaV43(maior) : "A consultar");
  set("perfilJogoFavorito", favorito ? `${favorito[0]} (${favorito[1]})` : "—");
  set("perfilTaxa", `${taxa}%`);
  set("perfilSeqSem", `${seq.semAtual} aposta(s)`);
  set("perfilSeqPremios", `${seq.melhorPremios} prémio(s)`);
  set("perfilIndiceSorte", `${indice}/100`);

  const avatar = document.getElementById("perfilAvatar");
  if (avatar) avatar.textContent = nivel.nome.split(" ")[0];

  if (prox) {
    const prevMin = nivel.min;
    const pct = Math.max(0, Math.min(100, Math.round(((pontos - prevMin) / (prox - prevMin)) * 100)));
    set("perfilProximoNivel", `${pct}%`);
    const bar = document.getElementById("perfilProgressBar");
    if (bar) bar.style.width = `${pct}%`;
  } else {
    set("perfilProximoNivel", "Máximo");
    const bar = document.getElementById("perfilProgressBar");
    if (bar) bar.style.width = "100%";
  }

  // Refresca também Prémios Premium com a nova leitura agressiva.
  try { atualizarPremiosPremiumV42(); } catch {}
}

function iniciarPerfilApostadorV43() {
  atualizarPerfilApostadorV43();
}


setTimeout(() => {
  try { iniciarPerfilApostadorV43(); } catch(e) {}
}, 1600);
setInterval(() => {
  try { atualizarPerfilApostadorV43(); } catch(e) {}
}, 3000);


// V43.1 - Cruzar histórico com tabelas de prémios oficiais
function moedaNumV431(v){
  if(v===undefined||v===null)return null;
  let s=String(v).trim();
  if(!s||/consultar/i.test(s))return null;
  s=s.replace(/[€\s]/g,"");
  if(s.includes(",")&&s.includes("."))s=s.replace(/\./g,"").replace(",",".");
  else if(s.includes(","))s=s.replace(",",".");
  const n=Number(s);
  return Number.isFinite(n)?n:null;
}
function fmtMoedaV431(n){
  return Number.isFinite(n)?n.toLocaleString("pt-PT",{style:"currency",currency:"EUR"}):"A consultar";
}
function normV431(t){
  return String(t||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[ºª.]/g," ").replace(/\s+/g," ").trim();
}
function jogoKeyV431(t){
  const s=normV431(t);
  if(s.includes("eurom"))return"euromilhoes";
  if(s.includes("toto"))return"totoloto";
  if(s.includes("dream"))return"eurodreams";
  if(s.includes("milhao")||s.includes("m1lhao"))return"milhao";
  if(s.includes("class"))return"lotaria_classica";
  if(s.includes("popular"))return"lotaria_popular";
  return s.replace(/\s+/g,"_");
}
function valorTextoV431(t){
  const s=String(t||"");
  const m=s.match(/€\s*(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|\d+(?:,\d{2})?)|(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|\d+(?:,\d{2})?)\s*€/);
  return m?moedaNumV431(m[1]||m[2]):null;
}
function fontesResultadosV431(){
  const a=[];
  try{if(typeof resultadosOficiais!=="undefined")a.push(resultadosOficiais)}catch{}
  try{if(window.resultadosOficiais)a.push(window.resultadosOficiais)}catch{}
  try{if(window.resultados)a.push(window.resultados)}catch{}
  try{if(window.ultimosResultados)a.push(window.ultimosResultados)}catch{}
  return a.filter(Boolean);
}
function resultadoJogoV431(jogo){
  const key=jogoKeyV431(jogo);
  for(const f of fontesResultadosV431()){
    if(f[key])return f[key];
    if(typeof f==="object"){
      for(const [k,v] of Object.entries(f)){
        if(jogoKeyV431(k)===key)return v;
        if(v&&typeof v==="object"){
          const j=v.jogo||v.tipo||v.nome||v.name||v.game;
          if(j&&jogoKeyV431(j)===key)return v;
        }
      }
    }
  }
  return null;
}
function tabelasPremiosV431(obj,prof=0){
  const out=[];
  if(!obj||prof>6)return out;
  if(Array.isArray(obj)){
    if(obj.some(x=>/premio|valor|escalao|categoria|acertos|numeros|estrelas|sorte|prize|amount/i.test(JSON.stringify(x||{}))))out.push(obj);
    obj.forEach(x=>out.push(...tabelasPremiosV431(x,prof+1)));
  }else if(typeof obj==="object"){
    for(const [k,v] of Object.entries(obj)){
      if(Array.isArray(v)&&/premios|premio|tabela|escalao|escaloes|prizes|winners|rank|odds/i.test(k))out.push(v);
      out.push(...tabelasPremiosV431(v,prof+1));
    }
  }
  return out;
}
function acertosFromTextV431(txt){
  const s=normV431(txt);
  const pick=(re)=>{const m=s.match(re);return m?Number(m[1]):null};
  return {
    numeros:pick(/(\d+)\s*numero/),
    estrelas:pick(/(\d+)\s*estrela/),
    sorte:pick(/(\d+)\s*(?:n\s*da\s*sorte|numero\s*da\s*sorte|sorte)/),
    sonhos:pick(/(\d+)\s*sonho/),
    escalao:pick(/(\d+)\s*(?:premio|escalao)/),
    texto:s
  };
}
function acertosItemV431(item){
  return acertosFromTextV431([item?.acertos,item?.resultadoAposta,item?.match,item?.matches,item?.premio,item?.titulo,item?.descricao,item?.texto,JSON.stringify(item||{})].filter(Boolean).join(" "));
}
function acertosRowV431(row){
  const base=acertosFromTextV431(JSON.stringify(row||{}));
  if(row&&typeof row==="object"){
    const map=[["numeros",["numeros","numero","numbers","n","acertos_numeros"]],["estrelas",["estrelas","estrela","stars","acertos_estrelas"]],["sorte",["numero_sorte","n_sorte","sorte","numeroDaSorte"]],["sonhos",["sonhos","sonho","dreams"]],["escalao",["escalao","premio","categoria","rank"]]];
    for(const [dst,keys] of map){
      for(const k of keys){
        if(row[k]!==undefined&&Number.isFinite(Number(row[k])))base[dst]=Number(row[k]);
      }
    }
  }
  return base;
}
function valorRowV431(row){
  if(!row)return null;
  const keys=["valor","valorPremio","premioValor","valor_premio","premio_valor","amount","prize","prize_value","valorUnitario","valor_unitario","value","montante","quantia"];
  if(typeof row==="object"){
    for(const k of keys){
      if(row[k]!==undefined){
        const v=moedaNumV431(row[k])??valorTextoV431(row[k]);
        if(v!==null)return v;
      }
    }
  }
  return valorTextoV431(JSON.stringify(row));
}
function matchEscalaoV431(a,b){
  const pairs=["numeros","estrelas","sorte","sonhos"];
  let any=false;
  for(const p of pairs){
    if(a[p]!==null&&b[p]!==null){
      any=true;
      if(a[p]!==b[p])return false;
    }
  }
  if(any)return true;
  if(a.escalao!==null&&b.escalao!==null)return a.escalao===b.escalao;
  return false;
}
function valorOficialPremioV431(item){
  const jogo=(typeof jogoPremioV41==="function"?jogoPremioV41(item):(item?.jogo||item?.tipo||""));
  const res=resultadoJogoV431(jogo);
  if(!res)return null;
  const ac=acertosItemV431(item);
  for(const tab of tabelasPremiosV431(res)){
    for(const row of tab){
      if(matchEscalaoV431(ac,acertosRowV431(row))){
        const v=valorRowV431(row);
        if(v!==null)return v;
      }
    }
  }
  return null;
}
function valorConhecidoPremioV42(item){
  const oficial=valorOficialPremioV431(item);
  if(oficial!==null)return oficial;
  try{const direto=procurarValorEmObjetoV43?.(item); if(direto!==null&&direto!==undefined)return direto}catch{}
  try{if(typeof valorPremioV411==="function"){const v=moedaNumV431(valorPremioV411(item));if(v!==null)return v}}catch{}
  try{if(typeof valorPremioV41==="function"){const v=moedaNumV431(valorPremioV41(item));if(v!==null)return v}}catch{}
  return null;
}
function enriquecerHistoricoComValoresV431(){
  let hist=[];
  try{if(typeof historicoPremiosV42==="function")hist=historicoPremiosV42()||[]}catch{}
  if(!hist.length){try{if(typeof obterHistoricoPremiosV41==="function")hist=obterHistoricoPremiosV41()||[]}catch{}}
  let alterado=false;
  hist.forEach(item=>{
    if(!item||typeof item!=="object")return;
    const atual=moedaNumV431(item.valorPremio??item.valor??item.premioValor);
    if(atual!==null)return;
    const v=valorOficialPremioV431(item);
    if(v!==null){
      item.valorPremio=fmtMoedaV431(v);
      item.valor=item.valorPremio;
      alterado=true;
    }
  });
  if(alterado){
    ["historico","jsc_historico","historico_premios","premios_historico","historicoPremios"].forEach(k=>{
      try{const raw=localStorage.getItem(k);if(raw&&Array.isArray(JSON.parse(raw)))localStorage.setItem(k,JSON.stringify(hist))}catch{}
    });
    try{if(typeof atualizarHistorico==="function")atualizarHistorico()}catch{}
    try{if(typeof renderHistorico==="function")renderHistorico()}catch{}
  }
}
function atualizarValoresPremiosV431(){
  enriquecerHistoricoComValoresV431();
  try{atualizarPremiosPremiumV42()}catch{}
  try{atualizarPerfilApostadorV43()}catch{}
}
function iniciarValoresPremiosFixV431(){atualizarValoresPremiosV431()}


setTimeout(()=>{try{iniciarValoresPremiosFixV431()}catch(e){}},1800);
setInterval(()=>{try{atualizarValoresPremiosV431()}catch(e){}},5000);


// V43.2 - Debug de valores dos prémios
function safeJsonV432(obj, max = 18000) {
  try {
    const txt = JSON.stringify(obj, null, 2);
    return txt.length > max ? txt.slice(0, max) + "\n...CORTADO..." : txt;
  } catch (e) {
    return String(obj);
  }
}

function compactarObjV432(obj, depth = 0) {
  if (depth > 3) return "[max-depth]";
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.slice(0, 4).map(x => compactarObjV432(x, depth + 1));
  const out = {};
  Object.entries(obj).slice(0, 80).forEach(([k,v]) => {
    if (/valor|premio|prémio|amount|prize|escalao|escal|winner|rank|categoria|acerto|numero|estrela|sorte|data|sorteio|concurso|jogo|tipo/i.test(k)) {
      out[k] = compactarObjV432(v, depth + 1);
    } else if (depth < 1 && typeof v === "object") {
      const s = JSON.stringify(v || {});
      if (/valor|premio|prémio|amount|prize|escalao|winner|rank|categoria/i.test(s)) {
        out[k] = compactarObjV432(v, depth + 1);
      }
    }
  });
  return out;
}

function fontesDebugV432() {
  const fontes = {};
  try { if (typeof resultadosOficiais !== "undefined") fontes.resultadosOficiais = resultadosOficiais; } catch {}
  try { if (window.resultadosOficiais) fontes.window_resultadosOficiais = window.resultadosOficiais; } catch {}
  try { if (window.resultados) fontes.window_resultados = window.resultados; } catch {}
  try { if (window.ultimosResultados) fontes.window_ultimosResultados = window.ultimosResultados; } catch {}
  try { if (typeof historicoPremiosV42 === "function") fontes.historicoPremiosV42 = historicoPremiosV42(); } catch {}
  try { if (typeof obterHistoricoPremiosV41 === "function") fontes.obterHistoricoPremiosV41 = obterHistoricoPremiosV41(); } catch {}
  try { fontes.localStorage_keys = Object.keys(localStorage).filter(k => /historico|resultado|premio|aposta/i.test(k)).map(k => ({ key:k, value: String(localStorage.getItem(k)).slice(0,800) })); } catch {}
  return fontes;
}

function analisarValoresPremiosV432() {
  const output = document.getElementById("debugValoresOutput");
  const fontes = fontesDebugV432();

  const hist = fontes.historicoPremiosV42 || fontes.obterHistoricoPremiosV41 || [];
  const rel = {
    appVersion: window.APP_VERSION,
    data: new Date().toISOString(),
    resumo: {
      premiosHistorico: Array.isArray(hist) ? hist.length : "não-array",
      fontesDisponiveis: Object.keys(fontes),
      resultadosOficiaisKeys: fontes.resultadosOficiais ? Object.keys(fontes.resultadosOficiais) : []
    },
    historicoCompacto: compactarObjV432(hist),
    resultadosCompacto: compactarObjV432(fontes.resultadosOficiais || fontes.window_resultadosOficiais || fontes.window_resultados || {}),
    localStorage: fontes.localStorage_keys || []
  };

  window.DEBUG_VALORES_PREMIOS = rel;
  localStorage.setItem("jsc_debug_valores_premios", safeJsonV432(rel, 60000));

  if (output) output.textContent = safeJsonV432(rel, 28000);
  console.log("DEBUG_VALORES_PREMIOS", rel);
  return rel;
}

function mostrarDebugValoresV432() {
  const card = document.getElementById("debugValoresCard");
  if (card) card.hidden = false;
  setTimeout(() => analisarValoresPremiosV432(), 100);
}

async function copiarDebugValoresV432() {
  const rel = window.DEBUG_VALORES_PREMIOS || analisarValoresPremiosV432();
  const txt = safeJsonV432(rel, 60000);
  try {
    await navigator.clipboard.writeText(txt);
    alert("Relatório copiado. Cola-o aqui no chat.");
  } catch {
    prompt("Copia este relatório e cola no chat:", txt);
  }
}

function iniciarDebugValoresV432() {
  window.analisarValoresPremios = analisarValoresPremiosV432;
  window.mostrarDebugValores = mostrarDebugValoresV432;
  window.copiarDebugValores = copiarDebugValoresV432;

  const fechar = document.getElementById("debugValoresFechar");
  const analisar = document.getElementById("debugValoresAnalisar");
  const copiar = document.getElementById("debugValoresCopiar");

  if (fechar && !fechar.__v432) {
    fechar.__v432 = true;
    fechar.addEventListener("click", () => {
      const card = document.getElementById("debugValoresCard");
      if (card) card.hidden = true;
    });
  }
  if (analisar && !analisar.__v432) {
    analisar.__v432 = true;
    analisar.addEventListener("click", analisarValoresPremiosV432);
  }
  if (copiar && !copiar.__v432) {
    copiar.__v432 = true;
    copiar.addEventListener("click", copiarDebugValoresV432);
  }

  // Mostra automaticamente se houver prémios a consultar
  try {
    const txt = document.body.innerText || "";
    if (/A consultar|valor a consultar/i.test(txt)) {
      const card = document.getElementById("debugValoresCard");
      if (card) card.hidden = false;
      setTimeout(analisarValoresPremiosV432, 1200);
    }
  } catch {}
}


setTimeout(() => {
  try { iniciarDebugValoresV432(); } catch(e) {}
}, 2200);
