window.APP_INFO = {
  version: "78.0",
  label: "V78.0",
  build: "2026.07.08",
  codename: "Launch Ready",
  environment: "Production",
  backend: "Supabase",
  push: "Firebase",
  cloud: true
};
window.APP_VERSION = `v${window.APP_INFO.version}-launch-ready`;

const API = "https://jogos-santa-casa-api.onrender.com";
const BACKEND_API = "https://jogos-santa-casa-backend.onrender.com";
const SUPABASE_URL = "https://whnokdkqobtgyywqmrju.supabase.co";
const SUPABASE_KEY = "sb_publishable_t1ONYEGH_h11uFDENsINJw_RqlNxcpc";
const SUPABASE_HISTORICO = "historico_premios";
const SUPABASE_APOSTAS = "apostas_guardadas";
const SUPABASE_V67_PROFILES = "profiles";
const SUPABASE_V67_DEVICES = "devices";
const SUPABASE_V67_PUSH_SUBSCRIPTIONS = "push_subscriptions";
const SUPABASE_V68_PUSH_ENGINE_RUNS = "push_engine_runs";
const V67_1_VAPID_PUBLIC_KEY = "BLIiD2ChRw0XwhWFES1hjpu7qwUfItr5fEjBxcLMKTSatPAS-1OkhQSjTgKA4q3gafiY2Dhxi6UX9wpFd_jQwp4";
const V67_2_PUSH_ENGINE = true;
const V67_3_GITHUB_ACTIONS_PUSH = true;

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


async function loginGoogle() {
  esconderAuthMensagem();
  try {
    estado.textContent = "A abrir login Google...";
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "select_account"
        }
      }
    });
    if (error) {
      mostrarAuthMensagem("Erro ao entrar com Google: " + error.message, "bad");
      estado.textContent = "Erro no login Google.";
    }
  } catch (err) {
    mostrarAuthMensagem("Erro ao abrir login Google: " + (err.message || err), "bad");
    estado.textContent = "Erro no login Google.";
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

function obterNomeUtilizadorV762() {
  const meta = currentUser?.user_metadata || {};
  return meta.full_name || meta.name || meta.preferred_username || currentUser?.email || "Utilizador";
}

function atualizarContaGoogleV762() {
  const nome = obterNomeUtilizadorV762();
  const email = currentUser?.email || "";
  const avatar = currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture || "";

  userInfo.textContent = `Olá, ${nome}`;

  const emailEl = document.getElementById("userEmailV762");
  if (emailEl) emailEl.textContent = email ? email : "Sessão iniciada";

  const avatarEl = document.getElementById("userAvatarV762");
  if (avatarEl) {
    if (avatar) {
      avatarEl.src = avatar;
      avatarEl.style.display = "block";
    } else {
      avatarEl.removeAttribute("src");
      avatarEl.style.display = "none";
    }
  }
}

function atualizarPerfilContaV763() {
  const nome = obterNomeUtilizadorV762();
  const email = currentUser?.email || "";
  const meta = currentUser?.user_metadata || {};
  const avatar = meta.avatar_url || meta.picture || "";
  const provider = currentUser?.app_metadata?.provider || "email";
  const providerTxt = provider === "google" ? "Google" : (provider === "email" ? "Email" : provider);

  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  set("perfilContaNome", nome);
  set("perfilContaEmail", email || "Sessão iniciada");
  set("perfilContaProvider", providerTxt);
  set("perfilContaEstado", "Ligada e sincronizada");

  const inicial = (nome || email || "U").trim().charAt(0).toUpperCase() || "U";
  const wrap = document.getElementById("perfilContaAvatar");
  const img = document.getElementById("perfilContaAvatarImg");
  const letter = document.getElementById("perfilContaAvatarLetter");
  if (img && letter && wrap) {
    if (avatar) {
      img.src = avatar;
      img.style.display = "block";
      letter.style.display = "none";
      wrap.classList.add("has-photo");
    } else {
      img.removeAttribute("src");
      img.style.display = "none";
      letter.textContent = inicial;
      letter.style.display = "grid";
      wrap.classList.remove("has-photo");
    }
  }
}

async function mostrarAppAutenticada() {
  authBox.style.display = "none";
  userBox.style.display = "";
  appBox.style.display = "";

  atualizarContaGoogleV762();
  atualizarPerfilContaV763();
  carregarAliasCloud();
  syncInfo.textContent = "Sincronização automática ativa.";
  setTimeout(() => { try { v67CloudInit(); } catch(e) { console.warn("V67 cloud init falhou:", e); } }, 50);

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

  const formScope = camposDiv || document;
  const nums = [...formScope.querySelectorAll("input.num")].map(i => String(i.value || "").trim());
  const extras = [...formScope.querySelectorAll("input.extra")].map(i => String(i.value || "").trim());

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
  const lista = data.resultados || data || [];
  window.resultadosOficiaisLista = lista;
  window.resultadosOficiaisBackendRaw = data;
  return lista;
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
      const formatado = linhaResultadoParaFormatoApp(row, cfg);
      window.ultimoResultadoAtual = formatado;
      window.ultimoResultadoBackendRow = row;
      return formatado;
    }
  } catch (err) {
    console.info("Backend indisponível; a usar fallback/cache.");
  }

  const res = await fetch(`${API}/${cfg.endpoint}`, { cache: "no-store" });
  const data = await res.json();
  if (data.erro) throw new Error(data.erro);
  window.ultimoResultadoAtual = data;
  window.ultimoResultadoApiRaw = data;
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
    "🍀 Assistente Jogos Santa Casa",
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
    doc.text("Gerado por Assistente Jogos Santa Casa", margin, pageH - 8);
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

document.getElementById("googleLoginBtn")?.addEventListener("click", loginGoogle);
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
    navigator.serviceWorker.register("service-worker.js?v=27")
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

  if (currentUser && (window.location.hash || window.location.search.includes("code="))) {
    try { window.history.replaceState({}, document.title, window.location.pathname); } catch(e) {}
  }

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

  try { v671AtualizarModalPushCloud(); } catch(e) {}

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
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
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
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
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
  const ok = await enviarNotificacaoV37("🍀 Assistente Jogos Santa Casa", "Teste local enviado com sucesso. As notificações estão prontas.", "jsc-teste");
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
    try { await v671RegistarPushCloud(); } catch(e) { console.warn("Push Cloud não registado automaticamente:", e); v671AtualizarModalPushCloud("Notificações locais ativas. Push Cloud precisa de novo teste/registo."); }
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
  const registarPush = document.getElementById("notifModalRegistarPush");
  const header = document.getElementById("ativarNotificacoesBtn");

  if (mini && !mini.__v37) { mini.__v37 = true; mini.addEventListener("click", abrirModalNotificacoesV37); }
  if (fechar && !fechar.__v37) { fechar.__v37 = true; fechar.addEventListener("click", fecharModalNotificacoesV37); }
  if (fecharBg && !fecharBg.__v37) { fecharBg.__v37 = true; fecharBg.addEventListener("click", fecharModalNotificacoesV37); }
  if (ativar && !ativar.__v37) { ativar.__v37 = true; ativar.addEventListener("click", ativarNotificacoesV37); }
  if (teste && !teste.__v37) { teste.__v37 = true; teste.addEventListener("click", enviarNotificacaoTesteV37); }
  if (registarPush && !registarPush.__v671) { registarPush.__v671 = true; registarPush.addEventListener("click", async () => { try { await v671RegistarPushCloud(); } catch(e) { console.warn(e); v671AtualizarModalPushCloud("Erro ao registar Push Cloud: " + (e.message || e)); } }); }
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


// V68.1 - Auto Update robusto, sem loop infinito
const VERSAO_ATUAL = "v68.1-update-fix";
async function limparCachesAppV681() {
  try {
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => String(k).startsWith("jogos-santa-casa-")).map(k => caches.delete(k)));
    }
  } catch (e) {}
}
async function verificarNovaVersao() {
  try {
    const r = await fetch(`manifest.json?ts=${Date.now()}`, { cache: "no-store" });
    const m = await r.json();
    const nova = m.version || VERSAO_ATUAL;
    if (!nova || nova === VERSAO_ATUAL) {
      try { localStorage.removeItem("jsc_update_prompt_version"); } catch (e) {}
      return;
    }

    const jaPerguntou = (() => {
      try { return localStorage.getItem("jsc_update_prompt_version") === nova; } catch (e) { return false; }
    })();
    if (jaPerguntou) return;

    if (confirm(`Existe uma nova versão (${nova}). Atualizar agora?`)) {
      try { localStorage.setItem("jsc_update_prompt_version", nova); } catch (e) {}
      await limparCachesAppV681();
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          try {
            if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
            await reg.update();
          } catch (e) {}
        }
      }
      window.location.replace(`${location.pathname}?v=${encodeURIComponent(nova)}&t=${Date.now()}${location.hash || ""}`);
    } else {
      try { localStorage.setItem("jsc_update_prompt_version", nova); } catch (e) {}
    }
  } catch (e) {}
}
setInterval(verificarNovaVersao, 300000);
setTimeout(verificarNovaVersao, 5000);


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
  try { atualizarPerfilContaV763(); } catch {}

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


// V43.3 - Backend/API debug + enriquecimento no momento certo
function normalizarPremiosBackendV433(premios) {
  if (!premios) return {};
  if (typeof premios === "string") {
    try { premios = JSON.parse(premios); } catch { return {}; }
  }
  if (!Array.isArray(premios)) return premios || {};

  const out = {};
  premios.forEach(row => {
    const txt = JSON.stringify(row || {});
    const n = txt.match(/(\d+)\s*n[úu]mero/i)?.[1] || row.numeros || row.numero || row.numbers;
    const e = txt.match(/(\d+)\s*(?:estrela|n[ºo]\s*da\s*sorte|numero\s*da\s*sorte|sonho)/i)?.[1] || row.estrelas || row.estrela || row.extra || row.extras || row.sorte || row.numero_sorte || row.sonhos;
    const key = n !== undefined && e !== undefined ? `${Number(n)}+${Number(e)}` : (row.categoria || row.escalao || row.rank || "");
    if (!key) return;
    const valor = row.valor || row.valorPremio || row.premioValor || row.amount || row.prize_value || row.premio_valor || row.montante || row.quantia || row.prize || "valor a consultar";
    const premio = row.premio || row.nome || row.categoria || row.escalao || "Prémio";
    out[key] = { premio, valor };
  });
  return out;
}

const linhaResultadoParaFormatoAppOriginalV433 = typeof linhaResultadoParaFormatoApp === "function" ? linhaResultadoParaFormatoApp : null;
if (linhaResultadoParaFormatoAppOriginalV433) {
  linhaResultadoParaFormatoApp = function(row, cfg) {
    const data = linhaResultadoParaFormatoAppOriginalV433(row, cfg);
    data.premios = normalizarPremiosBackendV433(row?.premios || data.premios);
    window.ultimoResultadoAtual = data;
    window.ultimoResultadoBackendRow = row;
    return data;
  };
}

function tentarValorPorCategoriaAtualV433(item) {
  const data = window.ultimoResultadoAtual || {};
  const premios = normalizarPremiosBackendV433(data.premios);
  const res = item?.resultado || "";
  const n = String(res).match(/(\d+)\s*n[úu]mero/i)?.[1];
  const e = String(res).match(/(\d+)\s*(?:estrela|n[ºo]\s*da\s*sorte|numero\s*da\s*sorte|sonho|extra)/i)?.[1];
  if (n !== undefined && e !== undefined) {
    const info = premios?.[`${Number(n)}+${Number(e)}`];
    if (info?.valor) return info.valor;
  }
  return null;
}

const valorConhecidoPremioV42OriginalV433 = typeof valorConhecidoPremioV42 === "function" ? valorConhecidoPremioV42 : null;
function valorConhecidoPremioV42(item) {
  const porCategoria = tentarValorPorCategoriaAtualV433(item);
  if (porCategoria) {
    const n = typeof moedaNumV431 === "function" ? moedaNumV431(porCategoria) : (typeof parseValorPremioV42 === "function" ? parseValorPremioV42(porCategoria) : null);
    if (n !== null && n !== undefined) return n;
  }
  if (valorConhecidoPremioV42OriginalV433) {
    const v = valorConhecidoPremioV42OriginalV433(item);
    if (v !== null && v !== undefined) return v;
  }
  return null;
}

const guardarEventosHistoricoOriginalV433 = typeof guardarEventosHistorico === "function" ? guardarEventosHistorico : null;
if (guardarEventosHistoricoOriginalV433) {
  guardarEventosHistorico = async function(data, eventos) {
    if (Array.isArray(eventos)) {
      eventos.forEach(ev => {
        const premios = normalizarPremiosBackendV433(data?.premios);
        const res = ev?.resultado || "";
        const n = String(res).match(/(\d+)\s*n[úu]mero/i)?.[1];
        const e = String(res).match(/(\d+)\s*(?:estrela|n[ºo]\s*da\s*sorte|numero\s*da\s*sorte|sonho|extra)/i)?.[1];
        if (n !== undefined && e !== undefined) {
          const info = premios?.[`${Number(n)}+${Number(e)}`];
          if (info?.valor && !/consultar/i.test(String(info.valor))) {
            ev.valorPremio = info.valor;
            ev.valor = info.valor;
            ev.premio = `${info.premio || "Prémio"} — ${info.valor}`;
          }
        }
      });
    }
    return guardarEventosHistoricoOriginalV433(data, eventos);
  };
}

async function fetchJsonDebugV433(url) {
  try {
    const res = await fetch(url, { cache:"no-store" });
    const txt = await res.text();
    let json = null;
    try { json = JSON.parse(txt); } catch {}
    return { ok: res.ok, status: res.status, url, json, text: json ? undefined : txt.slice(0, 1500) };
  } catch (err) {
    return { ok:false, url, error:String(err && err.message ? err.message : err) };
  }
}

async function analisarValoresPremiosV432() {
  const output = document.getElementById("debugValoresOutput");

  const backend = await fetchJsonDebugV433(`${BACKEND_API}/resultados?debug=${Date.now()}`);
  const apiTotoloto = await fetchJsonDebugV433(`${API}/totoloto?debug=${Date.now()}`);

  const hist = (() => {
    try { if (typeof historicoPremiosV42 === "function") return historicoPremiosV42() || []; } catch {}
    try { if (typeof obterHistoricoPremiosV41 === "function") return obterHistoricoPremiosV41() || []; } catch {}
    return [];
  })();

  const rel = {
    appVersion: window.APP_VERSION,
    data: new Date().toISOString(),
    resumo: {
      premiosHistorico: Array.isArray(hist) ? hist.length : "não-array",
      backendStatus: backend.status || backend.error || "sem status",
      apiTotolotoStatus: apiTotoloto.status || apiTotoloto.error || "sem status",
      ultimoResultadoKeys: window.ultimoResultadoAtual ? Object.keys(window.ultimoResultadoAtual) : [],
      backendRows: Array.isArray(backend.json?.resultados) ? backend.json.resultados.length : (Array.isArray(backend.json) ? backend.json.length : "não-array")
    },
    historicoCompacto: typeof compactarObjV432 === "function" ? compactarObjV432(hist) : hist,
    ultimoResultadoAtual: typeof compactarObjV432 === "function" ? compactarObjV432(window.ultimoResultadoAtual || {}) : (window.ultimoResultadoAtual || {}),
    ultimoResultadoBackendRow: typeof compactarObjV432 === "function" ? compactarObjV432(window.ultimoResultadoBackendRow || {}) : (window.ultimoResultadoBackendRow || {}),
    backendCompacto: typeof compactarObjV432 === "function" ? compactarObjV432(backend.json || backend) : backend,
    apiTotolotoCompacto: typeof compactarObjV432 === "function" ? compactarObjV432(apiTotoloto.json || apiTotoloto) : apiTotoloto,
    localStorage: Object.keys(localStorage).filter(k => /historico|resultado|premio|aposta/i.test(k)).map(k => ({ key:k, value:String(localStorage.getItem(k)).slice(0,1200) }))
  };

  window.DEBUG_VALORES_PREMIOS = rel;
  try { localStorage.setItem("jsc_debug_valores_premios", JSON.stringify(rel, null, 2).slice(0, 65000)); } catch {}
  if (output) output.textContent = JSON.stringify(rel, null, 2).slice(0, 32000);
  console.log("DEBUG_VALORES_PREMIOS", rel);
  return rel;
}

async function atualizarValoresPremiosV433() {
  try { enriquecerHistoricoComValoresV431?.(); } catch {}
  try { atualizarPremiosPremiumV42?.(); } catch {}
  try { atualizarPerfilApostadorV43?.(); } catch {}
}

setTimeout(() => { try { atualizarValoresPremiosV433(); } catch(e) {} }, 2500);
setInterval(() => { try { atualizarValoresPremiosV433(); } catch(e) {} }, 5000);



// V43.4 - Limpar debug e gravar valores no histórico/visual
function valorParaTextoV434(v) {
  if (v === undefined || v === null) return "";
  if (typeof v === "number" && Number.isFinite(v)) {
    return v.toLocaleString("pt-PT", { style:"currency", currency:"EUR" });
  }
  const s = String(v).trim();
  if (!s || /consultar/i.test(s)) return "";
  if (/€/.test(s)) return s;
  const n = (typeof moedaNumV431 === "function" ? moedaNumV431(s) : (typeof parseValorPremioV42 === "function" ? parseValorPremioV42(s) : null));
  return Number.isFinite(n) ? n.toLocaleString("pt-PT", { style:"currency", currency:"EUR" }) : s;
}

function obterHistoricoArrayV434() {
  try { if (typeof historicoPremiosV42 === "function") return historicoPremiosV42() || []; } catch {}
  try { if (typeof obterHistoricoPremiosV41 === "function") return obterHistoricoPremiosV41() || []; } catch {}
  try { if (Array.isArray(historico)) return historico; } catch {}
  return [];
}

function calcularValorHistoricoV434(item) {
  try {
    if (typeof valorConhecidoPremioV42 === "function") {
      const v = valorConhecidoPremioV42(item);
      const txt = valorParaTextoV434(v);
      if (txt) return txt;
    }
  } catch {}
  try {
    if (typeof valorPremioV411 === "function") {
      const txt = valorParaTextoV434(valorPremioV411(item));
      if (txt) return txt;
    }
  } catch {}
  return "";
}

function guardarHistoricoEmTodasChavesV434(hist) {
  const chaves = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && /historico/i.test(k)) chaves.push(k);
    }
  } catch {}
  [...new Set(chaves)].forEach(k => {
    try {
      const raw = localStorage.getItem(k);
      const parsed = JSON.parse(raw || "null");
      if (Array.isArray(parsed)) localStorage.setItem(k, JSON.stringify(hist));
    } catch {}
  });
}

function enriquecerHistoricoComValoresV434() {
  const hist = obterHistoricoArrayV434();
  let alterado = false;

  hist.forEach(item => {
    if (!item || typeof item !== "object") return;
    const atual = valorParaTextoV434(item.valorPremio || item.valor || item.premioValor);
    if (atual) {
      item.valorPremio = atual;
      item.valor = atual;
      if (item.premio && /consultar/i.test(item.premio)) item.premio = `Prémio — ${atual}`;
      return;
    }

    const valor = calcularValorHistoricoV434(item);
    if (valor) {
      item.valorPremio = valor;
      item.valor = valor;
      item.premio = `Prémio — ${valor}`;
      alterado = true;
    }
  });

  if (alterado) {
    guardarHistoricoEmTodasChavesV434(hist);
    try { if (typeof guardarHistoricoCloud === "function") guardarHistoricoCloud(hist); } catch {}
  }
  return alterado;
}

function atualizarTextoHistoricoVisualV434() {
  const hist = obterHistoricoArrayV434();
  if (!hist.length) return;

  const corpo = document.body;
  hist.forEach(item => {
    const valor = valorParaTextoV434(item.valorPremio || item.valor || item.premioValor) || calcularValorHistoricoV434(item);
    if (!valor) return;
    const data = item.dataSorteio || item.data || "";
    const aposta = item.aposta || "";
    const walker = document.createTreeWalker(corpo, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) {
      if (/valor a consultar|A consultar/i.test(node.nodeValue || "")) {
        const parentText = node.parentElement ? node.parentElement.innerText : "";
        if ((!data || parentText.includes(data)) || (!aposta || parentText.includes(aposta)) || parentText.includes(item.jogo || "")) {
          nodes.push(node);
        }
      }
    }
    nodes.slice(0, 4).forEach(n => {
      n.nodeValue = n.nodeValue.replace(/valor a consultar|A consultar/gi, valor);
    });
  });
}

function limparDebugValoresV434() {
  const card = document.getElementById("debugValoresCard");
  if (card) card.remove();
}

function atualizarValoresHistoricoCleanV434() {
  limparDebugValoresV434();
  enriquecerHistoricoComValoresV434();
  try { atualizarPremiosPremiumV42?.(); } catch {}
  try { atualizarPerfilApostadorV43?.(); } catch {}
  setTimeout(atualizarTextoHistoricoVisualV434, 300);
}

// desativa debug automático da V43.2/V43.3
function iniciarDebugValoresV432() {}
function mostrarDebugValoresV432() {}
function copiarDebugValoresV432() {}

setTimeout(() => { try { atualizarValoresHistoricoCleanV434(); } catch(e) {} }, 1200);
setInterval(() => { try { atualizarValoresHistoricoCleanV434(); } catch(e) {} }, 4000);



// V44 - Resultados Premium: corrigir cartões com prémio/valor
function valorTextoV44(v) {
  try { if (typeof valorParaTextoV434 === "function") { const t = valorParaTextoV434(v); if (t) return t; } } catch {}
  if (v === undefined || v === null) return "";
  if (typeof v === "number" && Number.isFinite(v)) return v.toLocaleString("pt-PT", { style:"currency", currency:"EUR" });
  const s = String(v).trim();
  if (!s || /consultar/i.test(s)) return "";
  if (/€/.test(s)) return s;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n.toLocaleString("pt-PT", { style:"currency", currency:"EUR" }) : s;
}
function historicoV44(){try{if(typeof obterHistoricoArrayV434==="function")return obterHistoricoArrayV434()||[]}catch{}try{if(typeof historicoPremiosV42==="function")return historicoPremiosV42()||[]}catch{}try{if(typeof obterHistoricoPremiosV41==="function")return obterHistoricoPremiosV41()||[]}catch{}return[]}
function normalizarApostaV44(s){return String(s||"").replace(/\s+/g," ").replace(/\+/g," + ").replace(/\s+/g," ").trim()}
function mapaPremiosHistoricoV44(){const mapa=new Map();historicoV44().forEach(item=>{if(!item)return;const valor=valorTextoV44(item.valorPremio||item.valor||item.premioValor)||valorTextoV44(typeof calcularValorHistoricoV434==="function"?calcularValorHistoricoV434(item):"");const resultado=item.resultado||item.acertos||"";const jogo=String(item.jogo||"").toLowerCase();const aposta=normalizarApostaV44(item.aposta||"");const data=String(item.dataSorteio||item.data||"");const info={valor,resultado,item};if(jogo&&aposta&&data)mapa.set(`${jogo}|${aposta}|${data}`,info);if(jogo&&aposta)mapa.set(`${jogo}|${aposta}`,info)});return mapa}
function valorPremioParaApostaV44(jogo,aposta,data){const mapa=mapaPremiosHistoricoV44();const j=String(jogo||"").toLowerCase();const a=normalizarApostaV44(aposta);return mapa.get(`${j}|${a}|${data||""}`)||mapa.get(`${j}|${a}`)||null}
function extrairJogoCardV44(card){const sec=card.closest("section, .card")||document;const txt=(sec.querySelector("h2,h3,strong")?.textContent||sec.textContent||"");if(/totoloto/i.test(txt))return"Totoloto";if(/euromilh/i.test(txt))return"Euromilhões";if(/euro.?dream/i.test(txt))return"EuroDreams";if(/m1lh|milh/i.test(txt))return"M1lhão";if(/class/i.test(txt))return"Lotaria Clássica";if(/popular/i.test(txt))return"Lotaria Popular";return""}
function dataResultadoAtualV44(){const txt=document.body.innerText||"";const m=txt.match(/Data:\s*(\d{2}\/\d{2}\/\d{4})/i);return m?m[1]:""}
function atualizarCardsResultadosPremiumV44(){const candidatos=Array.from(document.querySelectorAll("div, article, li")).filter(el=>{const t=el.innerText||"";return /SEM PR[ÉE]MIO|COM ACERTOS|PREMIADO/i.test(t)&&/Aposta\s*\d+/i.test(t)&&/Acertos:/i.test(t)});candidatos.forEach(card=>{const txt=card.innerText||"";const ap=txt.match(/Aposta\s*\d+\s*:\s*([^\n]+)/i);const aposta=ap?ap[1].trim():"";const jogo=extrairJogoCardV44(card);const data=dataResultadoAtualV44();const info=valorPremioParaApostaV44(jogo,aposta,data);if(!info||!info.valor)return;card.classList.add("resultado-premium-card","resultado-premium-ganho");const valor=info.valor;const resultado=info.resultado||(txt.match(/Acertos:\s*([^\n]+)/i)?.[1]||"");card.innerHTML=card.innerHTML.replace(/SEM PR[ÉE]MIO/gi,`🏆 PRÉMIO — ${valor}`).replace(/COM ACERTOS\s*[—-]\s*sem pr[ée]mio/gi,`🏆 PRÉMIO — ${valor}`).replace(/Pr[ée]mio\s*[—-]\s*valor a consultar/gi,`Prémio — ${valor}`);if(!card.querySelector(".resultado-premium-valor")){const linha=document.createElement("div");linha.className="resultado-premium-valor";linha.innerHTML=`<span>💰 Valor do prémio</span><strong>${valor}</strong>`;card.appendChild(linha)}if(resultado&&!card.querySelector(".resultado-premium-acertos")){const ac=document.createElement("div");ac.className="resultado-premium-acertos";ac.textContent=`🏆 ${resultado}`;card.appendChild(ac)}const num=parseFloat(String(valor).replace(/[^\d,.-]/g,"").replace(".","").replace(",","."));card.classList.remove("resultado-premium-pequeno","resultado-premium-medio","resultado-premium-alto","resultado-premium-jackpot");if(Number.isFinite(num)){if(num>=10000)card.classList.add("resultado-premium-jackpot");else if(num>=1000)card.classList.add("resultado-premium-alto");else if(num>=100)card.classList.add("resultado-premium-medio");else card.classList.add("resultado-premium-pequeno")}})}
function melhorarCentroSorteV44(){const el=document.getElementById("premiumScoreTexto");const val=document.getElementById("premiumScoreValor");if(el&&val){const n=Number(val.textContent||0);el.textContent=n>=75?"🔥 Excelente momento":n>=50?"🍀 Boa fase":n>=25?"Histórico em evolução":"A iniciar histórico"}}
if(typeof corpoPremioV41==="function"){const corpoPremioOriginalV44=corpoPremioV41;corpoPremioV41=function(item){const valor=valorTextoV44(item?.valorPremio||item?.valor||item?.premioValor)||valorTextoV44(typeof calcularValorHistoricoV434==="function"?calcularValorHistoricoV434(item):"");const resultado=item?.resultado||item?.acertos||"";const jogo=item?.jogo||(typeof jogoPremioV42==="function"?jogoPremioV42(item):"Jogo");const data=item?.dataSorteio||item?.data||"";if(valor)return[data?`${jogo} • ${data}`:jogo,resultado?`🏆 ${resultado}`:"",`💰 ${valor}`].filter(Boolean).join("\n");return corpoPremioOriginalV44(item)}}
function iniciarResultadosPremiumV44(){try{atualizarValoresHistoricoCleanV434?.()}catch{}atualizarCardsResultadosPremiumV44();melhorarCentroSorteV44()}


setTimeout(()=>{try{iniciarResultadosPremiumV44()}catch(e){}},1400);
setInterval(()=>{try{iniciarResultadosPremiumV44()}catch(e){}},2500);
document.addEventListener("click",()=>setTimeout(()=>{try{iniciarResultadosPremiumV44()}catch(e){}},400));


// V45 - Resultados Premium Definitivos
function dinheiroV45(v) {
  try { if (typeof valorTextoV44 === "function") { const t = valorTextoV44(v); if (t) return t; } } catch {}
  try { if (typeof valorParaTextoV434 === "function") { const t = valorParaTextoV434(v); if (t) return t; } } catch {}
  if (v === undefined || v === null) return "";
  if (typeof v === "number" && Number.isFinite(v)) return v.toLocaleString("pt-PT", {style:"currency",currency:"EUR"});
  const s = String(v).trim();
  if (!s || /consultar/i.test(s)) return "";
  return /€/.test(s) ? s : s;
}
function normalizarV45(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}
function apostaNormV45(s) {
  return String(s || "").replace(/\s*\+\s*/g, " + ").replace(/\s+/g, " ").trim();
}
function histV45() {
  try { if (typeof obterHistoricoArrayV434 === "function") return obterHistoricoArrayV434() || []; } catch {}
  try { if (typeof historicoV44 === "function") return historicoV44() || []; } catch {}
  try { if (typeof historicoPremiosV42 === "function") return historicoPremiosV42() || []; } catch {}
  try { if (typeof obterHistoricoPremiosV41 === "function") return obterHistoricoPremiosV41() || []; } catch {}
  return [];
}
function premioInfoV45(jogo, aposta, data) {
  const j = normalizarV45(jogo);
  const a = apostaNormV45(aposta);
  const d = String(data || "");
  for (const item of histV45()) {
    if (!item) continue;
    const ij = normalizarV45(item.jogo || "");
    const ia = apostaNormV45(item.aposta || "");
    const id = String(item.dataSorteio || item.data || "");
    if (ij && j && ij !== j) continue;
    if (ia && a && ia !== a) continue;
    if (d && id && d !== id) continue;
    const valor = dinheiroV45(item.valorPremio || item.valor || item.premioValor || (typeof calcularValorHistoricoV434 === "function" ? calcularValorHistoricoV434(item) : ""));
    if (valor) return { valor, resultado: item.resultado || item.acertos || "", item };
  }
  return null;
}
function jogoDaZonaResultadosV45(el) {
  const section = el.closest("section, .card, main") || document;
  const around = section.innerText || document.body.innerText || "";
  if (/TOTOL?OTO/i.test(around)) return "Totoloto";
  if (/EUROMILH/i.test(around)) return "Euromilhões";
  if (/EURO.?DREAM/i.test(around)) return "EuroDreams";
  if (/M1LH|MILHÃO|MILHAO/i.test(around)) return "M1lhão";
  if (/CL[ÁA]SSICA|CLASSICA/i.test(around)) return "Lotaria Clássica";
  if (/POPULAR/i.test(around)) return "Lotaria Popular";
  return "";
}
function dataDaZonaResultadosV45(el) {
  const section = el.closest("section, .card, main") || document;
  const txt = section.innerText || document.body.innerText || "";
  const m = txt.match(/Data:\s*(\d{2}\/\d{2}\/\d{4})/i);
  return m ? m[1] : "";
}
function classValorV45(valor) {
  const n = parseFloat(String(valor).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n)) return "premio-pequeno-v45";
  if (n >= 10000) return "premio-jackpot-v45";
  if (n >= 1000) return "premio-alto-v45";
  if (n >= 100) return "premio-medio-v45";
  return "premio-pequeno-v45";
}
function transformarCardResultadoV45(card, info) {
  if (!card || !info || !info.valor) return;
  const valor = info.valor;
  const resultado = info.resultado || "Prémio encontrado";
  card.classList.add("resultado-v45", classValorV45(valor));
  card.innerHTML = card.innerHTML
    .replace(/🔴\s*/g, "")
    .replace(/SEM PR[ÉE]MIO/gi, "🏆 PRÉMIO")
    .replace(/COM ACERTOS\s*[—-]\s*sem pr[ée]mio/gi, "🏆 PRÉMIO")
    .replace(/Pr[ée]mio\s*[—-]\s*valor a consultar/gi, `Prémio — ${valor}`)
    .replace(/Acertos:\s*0\s*n[úu]mero\(s\)\s*\+\s*0\s*estrela\(s\)/gi, `Acertos: ${resultado}`)
    .replace(/Acertos:\s*0\s*n[úu]mero\(s\)\s*\+\s*0\s*N[ºo]\s*da\s*Sorte\(s\)/gi, `Acertos: ${resultado}`)
    .replace(/Acertos:\s*0\s*n[úu]mero\(s\)/gi, `Acertos: ${resultado}`);
  if (!card.querySelector(".resultado-v45-title")) {
    const header = document.createElement("div");
    header.className = "resultado-v45-title";
    header.innerHTML = `<span>🏆 PRÉMIO</span><strong>${valor}</strong>`;
    card.prepend(header);
  }
  if (!card.querySelector(".resultado-v45-acertos")) {
    const ac = document.createElement("div");
    ac.className = "resultado-v45-acertos";
    ac.textContent = `✔ ${resultado}`;
    card.appendChild(ac);
  }
  if (!card.querySelector(".resultado-v45-valor")) {
    const val = document.createElement("div");
    val.className = "resultado-v45-valor";
    val.innerHTML = `<span>💰 Valor</span><strong>${valor}</strong>`;
    card.appendChild(val);
  }
}
function encontrarCardsResultadosV45() {
  return Array.from(document.querySelectorAll("div, article, li")).filter(el => {
    const t = el.innerText || "";
    return /Aposta\s*\d+\s*:/i.test(t) && /SEM PR[ÉE]MIO|COM ACERTOS|Acertos:/i.test(t) && t.length < 900;
  });
}
function atualizarResultadosPremiumDefinitivoV45() {
  try { atualizarValoresHistoricoCleanV434?.(); } catch {}
  encontrarCardsResultadosV45().forEach(card => {
    const txt = card.innerText || "";
    const aposta = txt.match(/Aposta\s*\d+\s*:\s*([^\n]+)/i)?.[1]?.trim() || "";
    if (!aposta) return;
    const info = premioInfoV45(jogoDaZonaResultadosV45(card), aposta, dataDaZonaResultadosV45(card));
    if (info && info.valor) transformarCardResultadoV45(card, info);
  });
  try { atualizarPremiosPremiumV42?.(); } catch {}
  try { atualizarPerfilApostadorV43?.(); } catch {}
}
function corpoPremioV45(item) {
  const valor = dinheiroV45(item?.valorPremio || item?.valor || item?.premioValor || (typeof calcularValorHistoricoV434 === "function" ? calcularValorHistoricoV434(item) : ""));
  const jogo = item?.jogo || (typeof jogoPremioV42 === "function" ? jogoPremioV42(item) : "Jogo");
  const data = item?.dataSorteio || item?.data || "";
  const resultado = item?.resultado || item?.acertos || "";
  if (valor) return [data ? `${jogo} • ${data}` : jogo, resultado ? `🏆 ${resultado}` : "", `💰 ${valor}`].filter(Boolean).join("\n");
  return `${jogo}\n${resultado}`;
}
if (typeof corpoPremioV41 === "function") corpoPremioV41 = corpoPremioV45;
setTimeout(() => { try { atualizarResultadosPremiumDefinitivoV45(); } catch(e) {} }, 1000);
setInterval(() => { try { atualizarResultadosPremiumDefinitivoV45(); } catch(e) {} }, 1800);
document.addEventListener("click", () => setTimeout(() => { try { atualizarResultadosPremiumDefinitivoV45(); } catch(e) {} }, 250));



// V46 - Render Resultados Premium: patch agressivo pós-render
function v46Money(v){
  try{ if(typeof dinheiroV45==='function'){ const t=dinheiroV45(v); if(t) return t; } }catch{}
  try{ if(typeof valorParaTextoV434==='function'){ const t=valorParaTextoV434(v); if(t) return t; } }catch{}
  if(v==null) return '';
  if(typeof v==='number' && Number.isFinite(v)) return v.toLocaleString('pt-PT',{style:'currency',currency:'EUR'});
  const s=String(v).trim();
  return (!s || /consultar/i.test(s)) ? '' : s;
}
function v46NormAposta(s){return String(s||'').replace(/\s*\+\s*/g,' + ').replace(/\s+/g,' ').trim();}
function v46Norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
function v46Hist(){
  try{ if(typeof obterHistoricoArrayV434==='function') return obterHistoricoArrayV434()||[]; }catch{}
  try{ if(typeof historicoV44==='function') return historicoV44()||[]; }catch{}
  try{ if(typeof histV45==='function') return histV45()||[]; }catch{}
  try{ if(typeof historicoPremiosV42==='function') return historicoPremiosV42()||[]; }catch{}
  try{ if(typeof obterHistoricoPremiosV41==='function') return obterHistoricoPremiosV41()||[]; }catch{}
  return [];
}
function v46PrizeMap(){
  const m=[];
  v46Hist().forEach(item=>{
    if(!item) return;
    const valor=v46Money(item.valorPremio||item.valor||item.premioValor||(typeof calcularValorHistoricoV434==='function'?calcularValorHistoricoV434(item):''));
    if(!valor) return;
    m.push({jogo:v46Norm(item.jogo||''),aposta:v46NormAposta(item.aposta||''),data:String(item.dataSorteio||item.data||''),resultado:item.resultado||item.acertos||'Prémio encontrado',valor,item});
  });
  return m;
}
function v46FindPrizeForBlock(block){
  const txt=block?.innerText||'';
  const ap=txt.match(/Aposta\s*\d+\s*:\s*([^\n]+)/i);
  if(!ap) return null;
  const aposta=v46NormAposta(ap[1]);
  const pageTxt=document.body.innerText||'';
  const data=(txt.match(/Data:\s*(\d{2}\/\d{2}\/\d{4})/i)||pageTxt.match(/Data:\s*(\d{2}\/\d{2}\/\d{4})/i)||[])[1]||'';
  const area=block.closest('section,.card,main')?.innerText||pageTxt;
  let jogo='';
  if(/totoloto/i.test(area)) jogo='totoloto';
  else if(/euromilh/i.test(area)) jogo='euromilhoes';
  else if(/euro.?dream/i.test(area)) jogo='eurodreams';
  else if(/m1lh|milh/i.test(area)) jogo='m1lhao';
  const list=v46PrizeMap();
  return list.find(p=>p.aposta===aposta && (!jogo || p.jogo===jogo) && (!data || !p.data || p.data===data)) || list.find(p=>p.aposta===aposta && (!jogo || p.jogo===jogo)) || list.find(p=>p.aposta===aposta) || null;
}
function v46DecorateBlock(block, prize){
  if(!block || !prize || !prize.valor) return;
  block.classList.add('resultado-v46-premio');
  const valor=prize.valor;
  const resultado=prize.resultado||'Prémio encontrado';
  const walker=document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  const nodes=[]; let n;
  while((n=walker.nextNode())) nodes.push(n);
  nodes.forEach(node=>{
    let s=node.nodeValue||'';
    s=s.replace(/SEM PR[ÉE]MIO/gi,'🏆 PRÉMIO');
    s=s.replace(/COM ACERTOS\s*[—-]\s*sem pr[ée]mio/gi,'🏆 PRÉMIO');
    s=s.replace(/Pr[ée]mio\s*[—-]\s*valor a consultar/gi,`Prémio — ${valor}`);
    s=s.replace(/Acertos:\s*0\s*n[úu]mero\(s\)\s*\+\s*0\s*estrela\(s\)/gi,`Acertos: ${resultado}`);
    s=s.replace(/Acertos:\s*0\s*n[úu]mero\(s\)\s*\+\s*0\s*N[ºo]\s*da\s*Sorte\(s\)/gi,`Acertos: ${resultado}`);
    s=s.replace(/Acertos:\s*0\s*n[úu]mero\(s\)/gi,`Acertos: ${resultado}`);
    node.nodeValue=s;
  });
  if(!block.querySelector('.resultado-v46-head')){const head=document.createElement('div');head.className='resultado-v46-head';head.innerHTML=`<span>🏆 PRÉMIO</span><strong>${valor}</strong>`;block.prepend(head);}
  if(!block.querySelector('.resultado-v46-acertos')){const ac=document.createElement('div');ac.className='resultado-v46-acertos';ac.textContent=`✔ ${resultado}`;block.appendChild(ac);}
  if(!block.querySelector('.resultado-v46-valor')){const val=document.createElement('div');val.className='resultado-v46-valor';val.innerHTML=`<span>💰 Valor do prémio</span><strong>${valor}</strong>`;block.appendChild(val);}
}
function v46PatchResultados(){
  const blocks=Array.from(document.querySelectorAll('div,article,li')).filter(el=>{const t=el.innerText||'';return /Aposta\s*\d+\s*:/i.test(t) && /Acertos:/i.test(t) && /SEM PR[ÉE]MIO|COM ACERTOS|0\s*n[úu]mero/i.test(t) && t.length<1200;});
  blocks.forEach(block=>{const prize=v46FindPrizeForBlock(block); if(prize) v46DecorateBlock(block,prize);});
}
function v46HookRenderFunctions(){
  Object.keys(window).filter(k=>/render|mostrar|desenhar|atualizar/i.test(k)&&/resultado/i.test(k)&&typeof window[k]==='function').forEach(k=>{
    if(window[k].__v46hook) return;
    const orig=window[k];
    window[k]=function(...args){const r=orig.apply(this,args);setTimeout(v46PatchResultados,30);setTimeout(v46PatchResultados,250);return r;};
    window[k].__v46hook=true;
  });
}
function iniciarV46(){try{atualizarValoresHistoricoCleanV434?.();}catch{} v46HookRenderFunctions(); v46PatchResultados();}
setTimeout(iniciarV46,600);setTimeout(iniciarV46,1600);setInterval(iniciarV46,1500);
try{const obs=new MutationObserver(()=>{clearTimeout(window.__v46mt);window.__v46mt=setTimeout(v46PatchResultados,120);});obs.observe(document.body,{childList:true,subtree:true,characterData:true});}catch{}



// V47 - Debug da secção Resultados
function safeJsonV47(obj,max=80000){try{const t=JSON.stringify(obj,null,2);return t.length>max?t.slice(0,max)+"\n...CORTADO...":t}catch(e){return String(obj)}}
function compactV47(obj,depth=0){if(depth>4)return"[max-depth]";if(obj==null)return obj;if(typeof obj!=="object")return obj;if(Array.isArray(obj))return obj.slice(0,8).map(x=>compactV47(x,depth+1));const out={};for(const k of Object.keys(obj).slice(0,120)){let blob="";try{blob=JSON.stringify(obj[k]||"")}catch{} if(/resultado|result|premio|prémio|aposta|acerto|match|ganh|win|valor|jogo|sorteio|data|numero|estrela|sorte|estado|status/i.test(k)||/SEM PR|premio|prémio|aposta|acerto|ganh|valor|totoloto/i.test(blob)){out[k]=compactV47(obj[k],depth+1)}}return out}
function histDebugV47(){try{if(typeof obterHistoricoArrayV434==="function")return obterHistoricoArrayV434()||[]}catch{}try{if(typeof histV45==="function")return histV45()||[]}catch{}try{if(typeof historicoV44==="function")return historicoV44()||[]}catch{}try{if(typeof historicoPremiosV42==="function")return historicoPremiosV42()||[]}catch{}return[]}
function cardsDebugV47(){return Array.from(document.querySelectorAll("div,article,li,section")).filter(el=>{const t=el.innerText||"";return /Aposta\s*\d+\s*:/i.test(t)&&/SEM PR[ÉE]MIO|COM ACERTOS|Acertos:/i.test(t)&&t.length<2500}).slice(0,25).map((el,i)=>({i,tag:el.tagName,id:el.id||"",className:String(el.className||""),text:(el.innerText||"").slice(0,1300),html:(el.outerHTML||"").slice(0,2000),parent:el.parentElement?{tag:el.parentElement.tagName,id:el.parentElement.id||"",className:String(el.parentElement.className||""),text:(el.parentElement.innerText||"").slice(0,1000)}:null}))}
function storageDebugV47(store){const out=[];try{for(let i=0;i<store.length;i++){const k=store.key(i);if(k&&/resultado|result|premio|historico|aposta|cache|jsc/i.test(k))out.push({key:k,value:String(store.getItem(k)).slice(0,2500)})}}catch{}return out}
function funcsDebugV47(){return Object.keys(window).filter(k=>typeof window[k]==="function"&&/resultado|result|premio|aposta|render|mostrar|desenhar|atualizar|verificar|comparar/i.test(k)).slice(0,220).map(k=>({nome:k,preview:String(window[k]).slice(0,1000)}))}
function varsDebugV47(){const vars={};Object.keys(window).filter(k=>/resultado|result|premio|aposta|historico|jogo|sorteio|match|ganh/i.test(k)&&!/^on/i.test(k)).slice(0,220).forEach(k=>{try{const v=window[k];vars[k]=typeof v==="function"?`[function] ${String(v).slice(0,500)}`:compactV47(v)}catch(e){vars[k]=`[erro ${String(e)}]`}});return vars}
async function fetchDebugV47(url){try{const res=await fetch(url,{cache:"no-store"});const text=await res.text();let json=null;try{json=JSON.parse(text)}catch{}return{ok:res.ok,status:res.status,url,json:compactV47(json),text:json?undefined:text.slice(0,1200)}}catch(e){return{ok:false,url,error:String(e&&e.message?e.message:e)}}}
async function analisarResultadosV47(){const rel={appVersion:window.APP_VERSION,data:new Date().toISOString(),location:location.href,resumo:{cardsResultados:cardsDebugV47().length,premiosHistorico:histDebugV47().length,funcoesSuspeitas:funcsDebugV47().length},cardsResultados:cardsDebugV47(),historico:compactV47(histDebugV47()),windowVars:varsDebugV47(),functions:funcsDebugV47(),localStorage:storageDebugV47(localStorage),sessionStorage:storageDebugV47(sessionStorage),scripts:Array.from(document.scripts).map(s=>s.src||"inline").filter(Boolean)};try{if(typeof BACKEND_API!=="undefined")rel.backendResultados=await fetchDebugV47(`${BACKEND_API}/resultados?debug=v47-${Date.now()}`)}catch{}try{if(typeof API!=="undefined")rel.apiTotoloto=await fetchDebugV47(`${API}/totoloto?debug=v47-${Date.now()}`)}catch{}window.DEBUG_RESULTADOS_V47=rel;try{localStorage.setItem("jsc_debug_resultados_v47",safeJsonV47(rel,120000))}catch{}const out=document.getElementById("debugResultadosOutput");if(out)out.textContent=safeJsonV47(rel,90000);console.log("DEBUG_RESULTADOS_V47",rel);return rel}
async function copiarResultadosV47(){const rel=window.DEBUG_RESULTADOS_V47||await analisarResultadosV47();const txt=safeJsonV47(rel,120000);try{await navigator.clipboard.writeText(txt);alert("Relatório copiado. Cola-o aqui no chat.")}catch{prompt("Copia este relatório e cola no chat:",txt)}}
function iniciarDebugResultadosV47(){window.analisarResultadosV47=analisarResultadosV47;window.copiarResultadosV47=copiarResultadosV47;const a=document.getElementById("debugResultadosAnalisar"),c=document.getElementById("debugResultadosCopiar"),f=document.getElementById("debugResultadosFechar");if(a&&!a.__v47){a.__v47=true;a.addEventListener("click",analisarResultadosV47)}if(c&&!c.__v47){c.__v47=true;c.addEventListener("click",copiarResultadosV47)}if(f&&!f.__v47){f.__v47=true;f.addEventListener("click",()=>{const card=document.getElementById("debugResultadosCard");if(card)card.hidden=true})}setTimeout(analisarResultadosV47,1800)}
setTimeout(iniciarDebugResultadosV47,1000);



// V48 - Resultados definitivos: substitui o render na origem
function valorTxtV48(v){try{if(typeof valorParaTextoV434==="function"){const t=valorParaTextoV434(v);if(t)return t}}catch{}try{if(typeof dinheiroV45==="function"){const t=dinheiroV45(v);if(t)return t}}catch{}if(v==null)return"";if(typeof v==="number"&&Number.isFinite(v))return v.toLocaleString("pt-PT",{style:"currency",currency:"EUR"});const s=String(v).trim();if(!s||/consultar/i.test(s))return"";if(/€/.test(s))return s;const n=Number(s.replace(",","."));return Number.isFinite(n)?n.toLocaleString("pt-PT",{style:"currency",currency:"EUR"}):s}
function normJogoV48(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"")}
function normApostaV48(s){return String(s||"").replace(/\s*\+\s*/g," + ").replace(/\s+/g," ").trim()}
function histV48(){try{if(typeof obterHistoricoArrayV434==="function")return obterHistoricoArrayV434()||[]}catch{}try{if(typeof historicoPremiosV42==="function")return historicoPremiosV42()||[]}catch{}try{if(typeof obterHistoricoPremiosV41==="function")return obterHistoricoPremiosV41()||[]}catch{}try{if(Array.isArray(historico))return historico}catch{}return[]}
function valorDoHistV48(item){const d=valorTxtV48(item?.valorPremio||item?.valor||item?.premioValor);if(d)return d;try{const c=calcularValorHistoricoV434?.(item);const t=valorTxtV48(c);if(t)return t}catch{}try{const v=valorConhecidoPremioV42?.(item);const t=valorTxtV48(v);if(t)return t}catch{}return""}
function premioHistV48(jogo,aposta,dataSorteio){const j=normJogoV48(jogo),a=normApostaV48(aposta),d=String(dataSorteio||"").trim();const lista=histV48();for(const exact of [true,false]){for(const item of lista){if(!item)continue;const ij=normJogoV48(item.jogo||""),ia=normApostaV48(item.aposta||""),id=String(item.dataSorteio||item.data||"").trim();if(j&&ij&&j!==ij)continue;if(a&&ia&&a!==ia)continue;if(exact&&d&&id&&d!==id)continue;const valor=valorDoHistV48(item);if(valor)return{premio:(item.premio&&!/consultar/i.test(String(item.premio)))?item.premio:"Prémio",valor,resultado:item.resultado||item.acertos||"",item}}}return null}
function premioCatV48(data,categoria){const info=data?.premios?data.premios[categoria]:null;if(!info)return null;return{premio:info.premio||"Prémio",valor:valorTxtV48(info.valor)||info.valor||"valor a consultar"}}
function renderResultadoNumerosExtra(data){const numeros=data.numeros||[],extras=data.extras||[],eventos=[];let html=renderCabecalhoResultado(data,`<div>Resultado: [${numeros.join(", ")}] + [${extras.join(", ")}]</div>`);if(!apostas[jogoAtual].length)html+=`<div class="result-card warn">Sem apostas guardadas.</div>`;apostas[jogoAtual].forEach((aposta,index)=>{const parsed=parseAposta(aposta);const nums=parsed.nums,apostaExtras=parsed.extras;const acertosNums=nums.filter(n=>numeros.includes(n)).length;const acertosExtras=apostaExtras.filter(e=>extras.includes(e)).length;const categoria=`${acertosNums}+${acertosExtras}`;const extraNome=data.extra_nome||"extra";let premioInfo=premioCatV48(data,categoria);let premiado=!!premioInfo||categoriaTemPremio(jogoAtual,acertosNums,acertosExtras);let resultadoTxt=`${acertosNums} número(s) + ${acertosExtras} ${extraNome}(s)`;const hp=premioHistV48(data.jogo,aposta,data.data);if(hp){premioInfo=hp;premiado=true;resultadoTxt=hp.resultado||resultadoTxt}const comAcertos=acertosNums||acertosExtras;let titulo="🔴 SEM PRÉMIO",classe="bad",premio="",valor="";if(premiado){premio=premioInfo?.premio||"Prémio";valor=premioInfo?.valor||"valor a consultar";titulo=`🏆 PREMIADO — ${premio}${valor?` — ${valor}`:""}`;classe="ok"}else if(comAcertos){titulo="🟡 COM ACERTOS — sem prémio";classe="warn"}if(premiado){eventos.push({jogo:data.jogo,aposta,resultado:resultadoTxt,sorteio:data.sorteio||"último sorteio",dataSorteio:data.data||"",premio:`${premio} — ${valor}`})}const valorHtml=classe==="ok"&&valorTxtV48(valor)?`<div class="resultado-final-valor"><span>💰 Valor</span><strong>${valorTxtV48(valor)}</strong></div>`:"";html+=`<div class="result-card ${classe}${classe==="ok"?" resultado-premio-final":""}"><strong>${titulo}</strong><br>Aposta ${index+1}: ${aposta}<br>Acertos: ${resultadoTxt}${valorHtml}</div>`});resultado.innerHTML=html;return eventos}
function renderResultadoCodigo(data){const codigoResultado=(data.codigo||"").replace(/\s+/g,"").toUpperCase();const eventos=[];let html=renderCabecalhoResultado(data,`<div>Resultado: ${codigoResultado||"não encontrado"}</div>`);if(!apostas[jogoAtual].length)html+=`<div class="result-card warn">Sem códigos guardados.</div>`;apostas[jogoAtual].forEach((aposta,index)=>{const codigo=aposta.replace(/\s+/g,"").toUpperCase();let premiado=codigo&&codigo===codigoResultado,premio="M1lhão",valor="valor a consultar";const hp=premioHistV48(data.jogo,aposta,data.data);if(hp){premiado=true;premio=hp.premio||premio;valor=hp.valor||valor}if(premiado)eventos.push({jogo:data.jogo,aposta,resultado:codigoResultado||codigo,sorteio:data.sorteio||"último sorteio",dataSorteio:data.data||"",premio:`${premio} — ${valor}`});html+=`<div class="result-card ${premiado?"ok resultado-premio-final":"bad"}"><strong>${premiado?`🏆 PREMIADO — ${premio} — ${valor}`:"🔴 SEM PRÉMIO"}</strong><br>Código ${index+1}: ${aposta}${premiado&&valorTxtV48(valor)?`<div class="resultado-final-valor"><span>💰 Valor</span><strong>${valorTxtV48(valor)}</strong></div>`:""}</div>`});resultado.innerHTML=html;return eventos}
function renderResultadoLotaria(data){const premios=data.premios||[];const numerosPremiados=premios.map(p=>String(p.numero).padStart(5,"0"));const eventos=[];let listaPremios=premios.map(p=>`${p.premio}: ${p.numero}`).join("<br>");let html=renderCabecalhoResultado(data,`<div>${listaPremios||"Prémios não encontrados"}</div>`);if(!apostas[jogoAtual].length)html+=`<div class="result-card warn">Sem números guardados.</div>`;apostas[jogoAtual].forEach((aposta,index)=>{const numero=String(aposta).padStart(5,"0");const pos=numerosPremiados.indexOf(numero);let premiado=pos>=0,premio=premiado?premios[pos].premio:"",valor="";const hp=premioHistV48(data.jogo,numero,data.data)||premioHistV48(data.jogo,aposta,data.data);if(hp){premiado=true;premio=hp.premio||premio||"Prémio";valor=hp.valor||""}if(premiado)eventos.push({jogo:data.jogo,aposta:numero,resultado:numero,sorteio:data.sorteio||"último sorteio",dataSorteio:data.data||"",premio:valor?`${premio} — ${valor}`:premio});html+=`<div class="result-card ${premiado?"ok resultado-premio-final":"bad"}"><strong>${premiado?`🏆 PREMIADO — ${premio}${valor?` — ${valor}`:""}`:"🔴 SEM PRÉMIO"}</strong><br>Número ${index+1}: ${numero}${premiado&&valorTxtV48(valor)?`<div class="resultado-final-valor"><span>💰 Valor</span><strong>${valorTxtV48(valor)}</strong></div>`:""}</div>`});resultado.innerHTML=html;return eventos}
function limparDebugV48(){document.getElementById("debugResultadosCard")?.remove();document.getElementById("debugValoresCard")?.remove()}
setTimeout(()=>{try{limparDebugV48()}catch{}try{verificar()}catch{}},900);



// V49 - Instrumentação da verificação
const DEBUG_V49_LOG = { obter: [], renderNumeros: [], guardarEventos: [], erros: [] };

function safeJsonV49(obj, max=120000){
  try{ const t=JSON.stringify(obj,null,2); return t.length>max?t.slice(0,max)+"\n...CORTADO...":t; }catch(e){ return String(obj); }
}
function compactV49(obj, depth=0){
  if(depth>5)return "[max-depth]";
  if(obj==null||typeof obj!=="object")return obj;
  if(Array.isArray(obj))return obj.slice(0,30).map(x=>compactV49(x,depth+1));
  const out={};
  Object.keys(obj).slice(0,180).forEach(k=>{
    let b=""; try{b=JSON.stringify(obj[k]||"")}catch{}
    if(/jogo|sorteio|data|numero|extra|codigo|premio|prémio|valor|aposta|acerto|categoria|evento|resultado|ganh|win|match/i.test(k) ||
       /premio|prémio|valor|aposta|acerto|categoria|resultado|totoloto|6,81|2\+1/i.test(b)){
      out[k]=compactV49(obj[k],depth+1);
    }
  });
  return out;
}
function histV49(){
  try{ if(typeof obterHistoricoArrayV434==="function")return obterHistoricoArrayV434()||[] }catch{}
  try{ if(typeof historicoPremiosV42==="function")return historicoPremiosV42()||[] }catch{}
  try{ if(typeof obterHistoricoPremiosV41==="function")return obterHistoricoPremiosV41()||[] }catch{}
  try{ if(Array.isArray(historico))return historico }catch{}
  return [];
}
function simularV49(data){
  const rows=[];
  try{
    const jogo=jogoAtual;
    const numeros=data?.numeros||[];
    const extras=data?.extras||[];
    const lista=apostas?.[jogo]||[];
    lista.forEach((aposta,index)=>{
      const p=parseAposta(aposta);
      const acertosNums=(p.nums||[]).filter(n=>numeros.includes(n)).length;
      const acertosExtras=(p.extras||[]).filter(e=>extras.includes(e)).length;
      const categoria=`${acertosNums}+${acertosExtras}`;
      let categoriaTem=null, histPremio=null, histPremioV48=null;
      try{categoriaTem=categoriaTemPremio(jogo,acertosNums,acertosExtras)}catch(e){categoriaTem="ERRO "+e.message}
      try{histPremioV48=typeof premioHistoricoParaApostaV48==="function"?premioHistoricoParaApostaV48(data.jogo,aposta,data.data):null}catch(e){histPremioV48="ERRO "+e.message}
      try{
        histPremio=histV49().find(h=>
          String(h.jogo||"").toLowerCase().includes(String(data.jogo||"").toLowerCase().slice(0,4)) &&
          String(h.aposta||"").replace(/\s+/g," ").trim()===String(aposta||"").replace(/\s+/g," ").trim()
        ) || null;
      }catch{}
      rows.push({
        index, jogoAtual:jogo, dataJogo:data?.jogo, sorteio:data?.sorteio, data:data?.data,
        aposta, parsed:p, resultadoNumeros:numeros, resultadoExtras:extras,
        acertosNums, acertosExtras, categoria,
        premiosKeys:data?.premios?Object.keys(data.premios):[],
        premioInfo:data?.premios?data.premios[categoria]:null,
        premiosObj:compactV49(data?.premios||{}),
        categoriaTemPremio:categoriaTem,
        histPremioDireto:compactV49(histPremio),
        histPremioV48:compactV49(histPremioV48),
        decisao:!!(data?.premios?.[categoria]||categoriaTem||histPremio||histPremioV48)
      });
    });
  }catch(e){ rows.push({erro:String(e&&e.stack?e.stack:e)}); }
  return rows;
}
function pushV49(tipo,payload){
  DEBUG_V49_LOG[tipo].push({ts:new Date().toISOString(), payload:compactV49(payload)});
  if(DEBUG_V49_LOG[tipo].length>40)DEBUG_V49_LOG[tipo].shift();
  window.DEBUG_V49_LOG=DEBUG_V49_LOG;
}

try{
if(typeof obterResultadoAtual==="function"&&!obterResultadoAtual.__v49){
  const orig=obterResultadoAtual;
  obterResultadoAtual=async function(...args){
    pushV49("obter",{fase:"start",jogoAtual});
    const r=await orig.apply(this,args);
    pushV49("obter",{fase:"end",jogoAtual,resultado:r,simulacao:simularV49(r)});
    return r;
  };
  obterResultadoAtual.__v49=true;
}}catch(e){DEBUG_V49_LOG.erros.push({hook:"obterResultadoAtual",erro:String(e)})}

try{
if(typeof renderResultadoNumerosExtra==="function"&&!renderResultadoNumerosExtra.__v49){
  const orig=renderResultadoNumerosExtra;
  renderResultadoNumerosExtra=function(data){
    const simAntes=simularV49(data);
    const eventos=orig.call(this,data);
    pushV49("renderNumeros",{
      jogoAtual,data,simAntes,eventosDevolvidos:eventos,
      resultadoTexto:(resultado?.innerText||"").slice(0,6000),
      resultadoHtml:(resultado?.innerHTML||"").slice(0,9000)
    });
    return eventos;
  };
  renderResultadoNumerosExtra.__v49=true;
}}catch(e){DEBUG_V49_LOG.erros.push({hook:"renderResultadoNumerosExtra",erro:String(e)})}

try{
if(typeof guardarEventosHistorico==="function"&&!guardarEventosHistorico.__v49){
  const orig=guardarEventosHistorico;
  guardarEventosHistorico=async function(data,eventos){
    pushV49("guardarEventos",{fase:"antes",data,eventos,historicoAntes:histV49()});
    const r=await orig.call(this,data,eventos);
    pushV49("guardarEventos",{fase:"depois",retorno:r,historicoDepois:histV49()});
    return r;
  };
  guardarEventosHistorico.__v49=true;
}}catch(e){DEBUG_V49_LOG.erros.push({hook:"guardarEventosHistorico",erro:String(e)})}

async function executarDebugVerificarV49(){
  const out=document.getElementById("debugVerificarOutput");
  if(out)out.textContent="A verificar e analisar...";
  try{ if(typeof verificar==="function") await verificar(); }catch(e){pushV49("erros",{fn:"verificar",erro:String(e&&e.stack?e.stack:e)})}
  await new Promise(r=>setTimeout(r,700));
  const rel={
    appVersion:window.APP_VERSION,
    data:new Date().toISOString(),
    location:location.href,
    jogoAtual,
    apostasJogoAtual:apostas?.[jogoAtual]||[],
    ultimoResultadoAtual:compactV49(window.ultimoResultadoAtual||{}),
    ultimoResultadoBackendRow:compactV49(window.ultimoResultadoBackendRow||{}),
    historico:compactV49(histV49()),
    resultadoTextoAtual:(resultado?.innerText||"").slice(0,7000),
    resultadoHtmlAtual:(resultado?.innerHTML||"").slice(0,10000),
    log:DEBUG_V49_LOG
  };
  window.DEBUG_VERIFICAR_V49=rel;
  try{localStorage.setItem("jsc_debug_verificar_v49",safeJsonV49(rel,150000))}catch{}
  const txt=safeJsonV49(rel,120000);
  if(out)out.textContent=txt;
  console.log("DEBUG_VERIFICAR_V49",rel);
  return rel;
}
async function copiarDebugVerificarV49(){
  const rel=window.DEBUG_VERIFICAR_V49||await executarDebugVerificarV49();
  const txt=safeJsonV49(rel,150000);
  try{await navigator.clipboard.writeText(txt);alert("Relatório copiado. Cola-o aqui no chat.")}catch{prompt("Copia este relatório e cola no chat:",txt)}
}
function iniciarDebugVerificarV49(){
  window.executarDebugVerificarV49=executarDebugVerificarV49;
  window.copiarDebugVerificarV49=copiarDebugVerificarV49;
  const b1=document.getElementById("debugVerificarExecutar"),b2=document.getElementById("debugVerificarCopiar"),b3=document.getElementById("debugVerificarFechar");
  if(b1&&!b1.__v49){b1.__v49=true;b1.addEventListener("click",executarDebugVerificarV49)}
  if(b2&&!b2.__v49){b2.__v49=true;b2.addEventListener("click",copiarDebugVerificarV49)}
  if(b3&&!b3.__v49){b3.__v49=true;b3.addEventListener("click",()=>{const c=document.getElementById("debugVerificarCard");if(c)c.hidden=true})}
  setTimeout(executarDebugVerificarV49,1800);
}
setTimeout(iniciarDebugVerificarV49,1000);



// V50 - Debug Parser parseAposta/comparação
function safeJsonV50(obj, max=120000){
  try{const t=JSON.stringify(obj,null,2);return t.length>max?t.slice(0,max)+"\n...CORTADO...":t;}catch(e){return String(obj);}
}
function tipoArrayV50(arr){
  if(!Array.isArray(arr)) return {isArray:false,tipo:typeof arr,valor:String(arr)};
  return {isArray:true,length:arr.length,valores:arr,tipos:arr.map(v=>typeof v),numerosConvertidos:arr.map(v=>Number(v)),todosNumericos:arr.every(v=>Number.isFinite(Number(v)))};
}
function parseManualV50(aposta){
  const raw=String(aposta||"").trim();
  const partes=raw.split("+").map(p=>p.trim());
  const nums=(partes[0]||"").split(/\s+/).filter(Boolean).map(Number).filter(Number.isFinite);
  const extras=(partes[1]||"").split(/\s+/).filter(Boolean).map(Number).filter(Number.isFinite);
  return {raw,partes,nums,extras};
}
function compararV50(aposta,data){
  let parsedOriginal=null,erroParse=null;
  try{parsedOriginal=typeof parseAposta==="function"?parseAposta(aposta):null;}catch(e){erroParse=String(e&&e.stack?e.stack:e);}
  const manual=parseManualV50(aposta);
  const resultadoNums=data?.numeros||[];
  const resultadoExtras=data?.extras||[];
  const pNums=parsedOriginal?.nums||[];
  const pExtras=parsedOriginal?.extras||[];
  const resNumsNum=resultadoNums.map(Number);
  const resExtrasNum=resultadoExtras.map(Number);
  return {
    aposta,
    parseApostaExiste:typeof parseAposta==="function",
    erroParse,
    parsedOriginal,
    parsedOriginalTipos:{nums:tipoArrayV50(pNums),extras:tipoArrayV50(pExtras)},
    parsedManual:manual,
    parsedManualTipos:{nums:tipoArrayV50(manual.nums),extras:tipoArrayV50(manual.extras)},
    resultado:{numeros:resultadoNums,extras:resultadoExtras,numerosTipos:tipoArrayV50(resultadoNums),extrasTipos:tipoArrayV50(resultadoExtras)},
    contagemOriginal:{
      nums:Array.isArray(pNums)?pNums.filter(n=>resultadoNums.includes(n)).length:null,
      extras:Array.isArray(pExtras)?pExtras.filter(n=>resultadoExtras.includes(n)).length:null,
      numsConvertido:Array.isArray(pNums)?pNums.filter(n=>resNumsNum.includes(Number(n))).length:null,
      extrasConvertido:Array.isArray(pExtras)?pExtras.filter(n=>resExtrasNum.includes(Number(n))).length:null
    },
    contagemManual:{
      nums:manual.nums.filter(n=>resultadoNums.includes(n)).length,
      extras:manual.extras.filter(n=>resultadoExtras.includes(n)).length,
      numsConvertido:manual.nums.filter(n=>resNumsNum.includes(Number(n))).length,
      extrasConvertido:manual.extras.filter(n=>resExtrasNum.includes(Number(n))).length
    },
    comparacaoOriginal:{
      nums:Array.isArray(pNums)?pNums.map(n=>({valor:n,tipo:typeof n,includesDireto:resultadoNums.includes(n),includesConvertido:resNumsNum.includes(Number(n)),comparacoes:resultadoNums.map(r=>({resultado:r,tipoResultado:typeof r,igualDireto:r===n,igualConvertido:Number(r)===Number(n)}))})):[],
      extras:Array.isArray(pExtras)?pExtras.map(n=>({valor:n,tipo:typeof n,includesDireto:resultadoExtras.includes(n),includesConvertido:resExtrasNum.includes(Number(n)),comparacoes:resultadoExtras.map(r=>({resultado:r,tipoResultado:typeof r,igualDireto:r===n,igualConvertido:Number(r)===Number(n)}))})):[]
    },
    comparacaoManual:{
      nums:manual.nums.map(n=>({valor:n,tipo:typeof n,includesDireto:resultadoNums.includes(n),includesConvertido:resNumsNum.includes(Number(n))})),
      extras:manual.extras.map(n=>({valor:n,tipo:typeof n,includesDireto:resultadoExtras.includes(n),includesConvertido:resExtrasNum.includes(Number(n))}))
    }
  };
}
async function obterResultadoParaDebugV50(){
  try{if(typeof obterResultadoAtual==="function") return await obterResultadoAtual();}catch(e){return {erroObterResultadoAtual:String(e&&e.stack?e.stack:e),fallback:window.ultimoResultadoAtual||null};}
  return window.ultimoResultadoAtual||null;
}
async function executarDebugParserV50(){
  const out=document.getElementById("debugParserOutput");
  if(out)out.textContent="A analisar parser...";
  const data=await obterResultadoParaDebugV50();
  let listaApostas=[]; try{listaApostas=apostas?.[jogoAtual]||[]}catch{}
  const analise=listaApostas.map(aposta=>compararV50(aposta,data));
  const rel={
    appVersion:window.APP_VERSION,
    dataRelatorio:new Date().toISOString(),
    location:location.href,
    jogoAtual,
    dataResultado:data,
    apostasJogoAtual:listaApostas,
    parseApostaFunctionPreview:(()=>{try{return typeof parseAposta==="function"?String(parseAposta).slice(0,3000):"parseAposta não existe"}catch(e){return String(e)}})(),
    analise,
    conclusaoAutomatica:analise.map(a=>{
      const origVazio=(a.parsedOriginalTipos?.nums?.length||0)===0&&(a.parsedOriginalTipos?.extras?.length||0)===0;
      const manualTemDados=(a.parsedManualTipos?.nums?.length||0)>0||(a.parsedManualTipos?.extras?.length||0)>0;
      return {
        aposta:a.aposta,
        parserOriginalVazio:origVazio,
        parserManualTemDados:manualTemDados,
        possivelProblema:origVazio&&manualTemDados?"parseAposta devolve vazio":(a.contagemOriginal.nums!==a.contagemOriginal.numsConvertido||a.contagemOriginal.extras!==a.contagemOriginal.extrasConvertido)?"comparação string/number":"parser/comparação coerente",
        contagemOriginal:a.contagemOriginal,
        contagemManual:a.contagemManual
      };
    })
  };
  window.DEBUG_PARSER_V50=rel;
  try{localStorage.setItem("jsc_debug_parser_v50",safeJsonV50(rel,150000));}catch{}
  const txt=safeJsonV50(rel,120000);
  if(out)out.textContent=txt;
  console.log("DEBUG_PARSER_V50",rel);
  return rel;
}
async function copiarDebugParserV50(){
  const rel=window.DEBUG_PARSER_V50||await executarDebugParserV50();
  const txt=safeJsonV50(rel,150000);
  try{await navigator.clipboard.writeText(txt);alert("Relatório copiado. Cola-o aqui no chat.");}catch{prompt("Copia este relatório e cola no chat:",txt);}
}
function iniciarDebugParserV50(){
  window.executarDebugParserV50=executarDebugParserV50;
  window.copiarDebugParserV50=copiarDebugParserV50;
  const b1=document.getElementById("debugParserExecutar"),b2=document.getElementById("debugParserCopiar"),b3=document.getElementById("debugParserFechar");
  if(b1&&!b1.__v50){b1.__v50=true;b1.addEventListener("click",executarDebugParserV50);}
  if(b2&&!b2.__v50){b2.__v50=true;b2.addEventListener("click",copiarDebugParserV50);}
  if(b3&&!b3.__v50){b3.__v50=true;b3.addEventListener("click",()=>{const c=document.getElementById("debugParserCard");if(c)c.hidden=true;});}
  setTimeout(executarDebugParserV50,1800);
}
setTimeout(iniciarDebugParserV50,1000);



// V51 - Final: refresh total da UI após atualização de valores/histórico
let __v51Refreshing = false;
let __v51LastHistSignature = "";

function historicoV51() {
  try { if (typeof obterHistoricoArrayV434 === "function") return obterHistoricoArrayV434() || []; } catch {}
  try { if (typeof historicoPremiosV42 === "function") return historicoPremiosV42() || []; } catch {}
  try { if (typeof obterHistoricoPremiosV41 === "function") return obterHistoricoPremiosV41() || []; } catch {}
  try { if (Array.isArray(historico)) return historico; } catch {}
  return [];
}

function assinaturaHistoricoV51() {
  try {
    return JSON.stringify(historicoV51().map(h => ({
      jogo: h.jogo,
      aposta: h.aposta,
      sorteio: h.sorteio,
      dataSorteio: h.dataSorteio || h.data,
      premio: h.premio,
      valorPremio: h.valorPremio,
      valor: h.valor,
      resultado: h.resultado || h.acertos
    })));
  } catch {
    return String(Date.now());
  }
}

function limparDebugV51() {
  ["debugParserCard","debugVerificarCard","debugResultadosCard","debugValoresCard"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
}

function refrescarUICompletaV51(motivo = "refresh") {
  if (__v51Refreshing) return;
  __v51Refreshing = true;

  setTimeout(async () => {
    try {
      limparDebugV51();

      // 1) Enriquecer histórico com valores, se possível.
      try { if (typeof atualizarValoresHistoricoCleanV434 === "function") atualizarValoresHistoricoCleanV434(); } catch {}
      try { if (typeof atualizarValoresPremiosV431 === "function") atualizarValoresPremiosV431(); } catch {}
      try { if (typeof atualizarValoresPremiosV433 === "function") atualizarValoresPremiosV433(); } catch {}

      // 2) Renderizar blocos dependentes do histórico.
      try { if (typeof renderHistorico === "function") renderHistorico(); } catch {}
      try { if (typeof atualizarEstatisticas === "function") atualizarEstatisticas(); } catch {}
      try { if (typeof atualizarContador === "function") atualizarContador(); } catch {}
      try { if (typeof atualizarBadgesTabs === "function") atualizarBadgesTabs(); } catch {}
      try { if (typeof atualizarPremiosPremiumV42 === "function") atualizarPremiosPremiumV42(); } catch {}
      try { if (typeof atualizarPerfilApostadorV43 === "function") atualizarPerfilApostadorV43(); } catch {}

      // 3) Recalcular o painel Resultados para o jogo atual.
      // Proteção para não entrar em ciclo infinito.
      if (typeof verificar === "function" && !window.__v51InsideVerificar) {
        try {
          window.__v51InsideVerificar = true;
          await verificar();
        } catch (e) {
          console.warn("V51 verificar refresh falhou:", e);
        } finally {
          window.__v51InsideVerificar = false;
        }
      }

      // 4) Aplicar melhorias visuais já existentes, caso existam.
      try { if (typeof atualizarResultadosPremiumDefinitivoV45 === "function") atualizarResultadosPremiumDefinitivoV45(); } catch {}
      try { if (typeof v46PatchResultados === "function") v46PatchResultados(); } catch {}
      try { if (typeof atualizarCardsResultadosPremiumV44 === "function") atualizarCardsResultadosPremiumV44(); } catch {}

      // 5) Guardar nova assinatura.
      __v51LastHistSignature = assinaturaHistoricoV51();
      console.log("V51 UI refresh:", motivo);
    } finally {
      __v51Refreshing = false;
    }
  }, 80);
}

// Hook: quando o histórico é renderizado, atualizar o resto logo a seguir.
try {
  if (typeof renderHistorico === "function" && !renderHistorico.__v51Hook) {
    const __renderHistoricoOriginalV51 = renderHistorico;
    renderHistorico = function(...args) {
      const r = __renderHistoricoOriginalV51.apply(this, args);
      setTimeout(() => {
        try {
          const sig = assinaturaHistoricoV51();
          if (sig !== __v51LastHistSignature) refrescarUICompletaV51("historico alterado");
        } catch {}
      }, 180);
      return r;
    };
    renderHistorico.__v51Hook = true;
  }
} catch {}

// Hook: quando valores do histórico são enriquecidos, refrescar UI completa.
try {
  if (typeof enriquecerHistoricoComValoresV434 === "function" && !enriquecerHistoricoComValoresV434.__v51Hook) {
    const __enriquecerOriginalV51 = enriquecerHistoricoComValoresV434;
    enriquecerHistoricoComValoresV434 = function(...args) {
      const antes = assinaturaHistoricoV51();
      const r = __enriquecerOriginalV51.apply(this, args);
      const depois = assinaturaHistoricoV51();
      if (antes !== depois || r) setTimeout(() => refrescarUICompletaV51("valores enriquecidos"), 120);
      return r;
    };
    enriquecerHistoricoComValoresV434.__v51Hook = true;
  }
} catch {}

// Hook: quando cloud carrega histórico, refrescar UI completa.
try {
  if (typeof carregarHistoricoCloud === "function" && !carregarHistoricoCloud.__v51Hook) {
    const __carregarHistoricoCloudOriginalV51 = carregarHistoricoCloud;
    carregarHistoricoCloud = async function(...args) {
      const r = await __carregarHistoricoCloudOriginalV51.apply(this, args);
      setTimeout(() => refrescarUICompletaV51("cloud historico carregado"), 250);
      return r;
    };
    carregarHistoricoCloud.__v51Hook = true;
  }
} catch {}

// Hook: quando se guardam eventos, refrescar UI completa.
try {
  if (typeof guardarEventosHistorico === "function" && !guardarEventosHistorico.__v51Hook) {
    const __guardarEventosHistoricoOriginalV51 = guardarEventosHistorico;
    guardarEventosHistorico = async function(...args) {
      const r = await __guardarEventosHistoricoOriginalV51.apply(this, args);
      setTimeout(() => refrescarUICompletaV51("eventos historico guardados"), 250);
      return r;
    };
    guardarEventosHistorico.__v51Hook = true;
  }
} catch {}

// Observador leve: se a assinatura do histórico mudar, refresca.
function iniciarWatcherV51() {
  limparDebugV51();
  __v51LastHistSignature = assinaturaHistoricoV51();

  setTimeout(() => refrescarUICompletaV51("arranque"), 900);

  setInterval(() => {
    try {
      const atual = assinaturaHistoricoV51();
      if (atual !== __v51LastHistSignature) {
        refrescarUICompletaV51("watcher historico mudou");
      }
    } catch {}
  }, 2500);
}

setTimeout(iniciarWatcherV51, 700);



// V52 - Refresh Inteligente sem loops
// Desativa o refresh agressivo da V51.
try {
  if (window.__v52Loaded !== true) {
    window.__v52Loaded = true;
    window.__v51InsideVerificar = false;
  }
} catch {}

let __v52Refreshing = false;
let __v52LastSignature = "";
let __v52LastRun = 0;

function historicoV52() {
  try { if (typeof obterHistoricoArrayV434 === "function") return obterHistoricoArrayV434() || []; } catch {}
  try { if (typeof historicoPremiosV42 === "function") return historicoPremiosV42() || []; } catch {}
  try { if (typeof obterHistoricoPremiosV41 === "function") return obterHistoricoPremiosV41() || []; } catch {}
  try { if (Array.isArray(historico)) return historico; } catch {}
  return [];
}

function assinaturaHistoricoV52() {
  try {
    return JSON.stringify(historicoV52().map(h => ({
      id: h.idLocal || h.id || "",
      jogo: h.jogo || "",
      aposta: h.aposta || "",
      sorteio: h.sorteio || "",
      dataSorteio: h.dataSorteio || h.data || "",
      premio: h.premio || "",
      valorPremio: h.valorPremio || "",
      valor: h.valor || "",
      resultado: h.resultado || h.acertos || ""
    })));
  } catch {
    return "";
  }
}

function limparDebugV52() {
  ["debugParserCard","debugVerificarCard","debugResultadosCard","debugValoresCard"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
}

// Override da V51 para impedir loop infinito.
// Mantemos o nome para que hooks antigos chamem esta versão segura.
function refrescarUICompletaV51(motivo = "refresh") {
  refrescarUIInteligenteV52(motivo);
}

async function refrescarUIInteligenteV52(motivo = "refresh") {
  const agora = Date.now();
  if (__v52Refreshing) return;
  if (agora - __v52LastRun < 1800) return;

  const assinaturaAtual = assinaturaHistoricoV52();
  if (assinaturaAtual && assinaturaAtual === __v52LastSignature && motivo !== "arranque") {
    return;
  }

  __v52Refreshing = true;
  __v52LastRun = agora;

  try {
    limparDebugV52();

    // 1) Enriquecer valores uma vez, sem chamar verificar.
    try { if (typeof atualizarValoresHistoricoCleanV434 === "function") atualizarValoresHistoricoCleanV434(); } catch {}
    try { if (typeof atualizarValoresPremiosV431 === "function") atualizarValoresPremiosV431(); } catch {}
    try { if (typeof atualizarValoresPremiosV433 === "function") atualizarValoresPremiosV433(); } catch {}

    // 2) Re-render apenas dos blocos dependentes do histórico.
    try { if (typeof renderHistorico === "function") renderHistorico(); } catch {}
    try { if (typeof atualizarEstatisticas === "function") atualizarEstatisticas(); } catch {}
    try { if (typeof atualizarContador === "function") atualizarContador(); } catch {}
    try { if (typeof atualizarBadgesTabs === "function") atualizarBadgesTabs(); } catch {}
    try { if (typeof atualizarPremiosPremiumV42 === "function") atualizarPremiosPremiumV42(); } catch {}
    try { if (typeof atualizarPerfilApostadorV43 === "function") atualizarPerfilApostadorV43(); } catch {}

    // 3) Só aplicar patches visuais leves, sem chamar verificar().
    try { if (typeof atualizarResultadosPremiumDefinitivoV45 === "function") atualizarResultadosPremiumDefinitivoV45(); } catch {}
    try { if (typeof v46PatchResultados === "function") v46PatchResultados(); } catch {}
    try { if (typeof atualizarCardsResultadosPremiumV44 === "function") atualizarCardsResultadosPremiumV44(); } catch {}

    __v52LastSignature = assinaturaHistoricoV52();
    console.log("V52 UI refresh:", motivo);
  } finally {
    __v52Refreshing = false;
  }
}

// Reverte/neutraliza watchers antigos da V51 quando possível.
function iniciarWatcherV51() {
  limparDebugV52();
  __v52LastSignature = assinaturaHistoricoV52();
  setTimeout(() => refrescarUIInteligenteV52("arranque"), 1000);
}

// Hook seguro: só dispara se a assinatura mudou e com debounce.
function instalarHooksV52() {
  limparDebugV52();
  __v52LastSignature = assinaturaHistoricoV52();

  try {
    if (typeof guardarEventosHistorico === "function" && !guardarEventosHistorico.__v52Hook) {
      const original = guardarEventosHistorico;
      guardarEventosHistorico = async function(...args) {
        const antes = assinaturaHistoricoV52();
        const r = await original.apply(this, args);
        const depois = assinaturaHistoricoV52();

        if (antes !== depois) {
          setTimeout(() => refrescarUIInteligenteV52("eventos historico alterados"), 500);
        }
        return r;
      };
      guardarEventosHistorico.__v52Hook = true;
    }
  } catch {}

  try {
    if (typeof enriquecerHistoricoComValoresV434 === "function" && !enriquecerHistoricoComValoresV434.__v52Hook) {
      const original = enriquecerHistoricoComValoresV434;
      enriquecerHistoricoComValoresV434 = function(...args) {
        const antes = assinaturaHistoricoV52();
        const r = original.apply(this, args);
        const depois = assinaturaHistoricoV52();

        if (antes !== depois || r) {
          setTimeout(() => refrescarUIInteligenteV52("valores alterados"), 500);
        }
        return r;
      };
      enriquecerHistoricoComValoresV434.__v52Hook = true;
    }
  } catch {}

  setTimeout(() => refrescarUIInteligenteV52("arranque"), 1200);
}

// Importante: sem setInterval, sem verificar automático em loop.
setTimeout(instalarHooksV52, 900);



// V53 - Performance & Código Limpo
// Objetivo: neutralizar ferramentas de debug antigas e evitar logs ruidosos,
// mantendo as correções úteis de valores, histórico, prémios premium e refresh inteligente.

window.__JSC_CLEAN_MODE_V53 = true;

function limparDebugV53() {
  ["debugParserCard","debugVerificarCard","debugResultadosCard","debugValoresCard"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
}

// Neutralizar funções debug antigas, sem partir referências existentes.
function noopDebugV53() {
  return null;
}

[
  "executarDebugParserV50",
  "copiarDebugParserV50",
  "iniciarDebugParserV50",
  "executarDebugVerificarV49",
  "copiarDebugVerificarV49",
  "iniciarDebugVerificarV49",
  "analisarResultadosV47",
  "copiarResultadosV47",
  "iniciarDebugResultadosV47",
  "analisarValoresPremiosV432",
  "copiarDebugValoresV432",
  "mostrarDebugValoresV432",
  "iniciarDebugValoresV432"
].forEach(nome => {
  try { window[nome] = noopDebugV53; } catch {}
});

// Limpar variáveis de debug pesadas do window/localStorage.
function limparEstadoDebugV53() {
  [
    "DEBUG_PARSER_V50",
    "DEBUG_VERIFICAR_V49",
    "DEBUG_RESULTADOS_V47",
    "DEBUG_VALORES_PREMIOS",
    "DEBUG_VERIFICAR_V49_LOG",
    "DEBUG_V49_LOG"
  ].forEach(k => {
    try { window[k] = undefined; } catch {}
  });

  [
    "jsc_debug_parser_v50",
    "jsc_debug_verificar_v49",
    "jsc_debug_resultados_v47",
    "jsc_debug_valores_premios"
  ].forEach(k => {
    try { localStorage.removeItem(k); } catch {}
  });
}

// Silenciar apenas logs internos antigos, preservando erros reais.
(function instalarFiltroLogsV53(){
  if (console.__jscV53Filtro) return;
  console.__jscV53Filtro = true;

  const originalLog = console.log.bind(console);
  const originalInfo = console.info.bind(console);
  const originalWarn = console.warn.bind(console);

  function deveOcultar(args) {
    const txt = args.map(a => {
      try { return typeof a === "string" ? a : JSON.stringify(a); } catch { return String(a); }
    }).join(" ");

    return /DEBUG_PARSER_V50|DEBUG_VERIFICAR_V49|DEBUG_RESULTADOS_V47|DEBUG_VALORES_PREMIOS/i.test(txt) ||
           /V51 UI refresh|V50 - Debug|V49 - Instrumentação|V47 - Debug/i.test(txt);
  }

  console.log = (...args) => {
    if (deveOcultar(args)) return;
    originalLog(...args);
  };
  console.info = (...args) => {
    if (deveOcultar(args)) return;
    originalInfo(...args);
  };
  console.warn = (...args) => {
    if (deveOcultar(args)) return;
    originalWarn(...args);
  };
})();

// Refresh inteligente limpo: sem setInterval, sem loops e sem verificar automático repetido.
let __v53Refreshing = false;
let __v53LastSignature = "";
let __v53LastRun = 0;

function historicoV53() {
  try { if (typeof obterHistoricoArrayV434 === "function") return obterHistoricoArrayV434() || []; } catch {}
  try { if (typeof historicoPremiosV42 === "function") return historicoPremiosV42() || []; } catch {}
  try { if (typeof obterHistoricoPremiosV41 === "function") return obterHistoricoPremiosV41() || []; } catch {}
  try { if (Array.isArray(historico)) return historico; } catch {}
  return [];
}

function assinaturaHistoricoV53() {
  try {
    return JSON.stringify(historicoV53().map(h => ({
      id: h.idLocal || h.id || "",
      jogo: h.jogo || "",
      aposta: h.aposta || "",
      sorteio: h.sorteio || "",
      dataSorteio: h.dataSorteio || h.data || "",
      premio: h.premio || "",
      valorPremio: h.valorPremio || "",
      valor: h.valor || "",
      resultado: h.resultado || h.acertos || ""
    })));
  } catch {
    return "";
  }
}

async function refrescarUILimpoV53(motivo = "refresh") {
  const agora = Date.now();
  if (__v53Refreshing) return;
  if (agora - __v53LastRun < 1600) return;

  const sig = assinaturaHistoricoV53();
  if (sig && sig === __v53LastSignature && motivo !== "arranque") return;

  __v53Refreshing = true;
  __v53LastRun = agora;

  try {
    limparDebugV53();
    limparEstadoDebugV53();

    try { if (typeof atualizarValoresHistoricoCleanV434 === "function") atualizarValoresHistoricoCleanV434(); } catch {}
    try { if (typeof atualizarPremiosPremiumV42 === "function") atualizarPremiosPremiumV42(); } catch {}
    try { if (typeof atualizarPerfilApostadorV43 === "function") atualizarPerfilApostadorV43(); } catch {}
    try { if (typeof renderHistorico === "function") renderHistorico(); } catch {}
    try { if (typeof atualizarEstatisticas === "function") atualizarEstatisticas(); } catch {}
    try { if (typeof atualizarContador === "function") atualizarContador(); } catch {}
    try { if (typeof atualizarBadgesTabs === "function") atualizarBadgesTabs(); } catch {}

    // Patches visuais leves mantidos, sem ciclos.
    try { if (typeof atualizarResultadosPremiumDefinitivoV45 === "function") atualizarResultadosPremiumDefinitivoV45(); } catch {}
    try { if (typeof v46PatchResultados === "function") v46PatchResultados(); } catch {}
    try { if (typeof atualizarCardsResultadosPremiumV44 === "function") atualizarCardsResultadosPremiumV44(); } catch {}

    __v53LastSignature = assinaturaHistoricoV53();
    console.log("V53 pronto:", motivo);
  } finally {
    __v53Refreshing = false;
  }
}

// Substituir chamadas antigas por refresh seguro.
function refrescarUICompletaV51(motivo = "refresh") {
  refrescarUILimpoV53(motivo);
}
function refrescarUIInteligenteV52(motivo = "refresh") {
  refrescarUILimpoV53(motivo);
}
function iniciarWatcherV51() {
  limparDebugV53();
}
function iniciarWatcherV52() {
  limparDebugV53();
}

function instalarHooksLimposV53() {
  limparDebugV53();
  limparEstadoDebugV53();
  __v53LastSignature = assinaturaHistoricoV53();

  try {
    if (typeof guardarEventosHistorico === "function" && !guardarEventosHistorico.__v53Hook) {
      const original = guardarEventosHistorico;
      guardarEventosHistorico = async function(...args) {
        const antes = assinaturaHistoricoV53();
        const r = await original.apply(this, args);
        const depois = assinaturaHistoricoV53();
        if (antes !== depois) setTimeout(() => refrescarUILimpoV53("historico alterado"), 500);
        return r;
      };
      guardarEventosHistorico.__v53Hook = true;
    }
  } catch {}

  try {
    if (typeof enriquecerHistoricoComValoresV434 === "function" && !enriquecerHistoricoComValoresV434.__v53Hook) {
      const original = enriquecerHistoricoComValoresV434;
      enriquecerHistoricoComValoresV434 = function(...args) {
        const antes = assinaturaHistoricoV53();
        const r = original.apply(this, args);
        const depois = assinaturaHistoricoV53();
        if (antes !== depois || r) setTimeout(() => refrescarUILimpoV53("valores atualizados"), 500);
        return r;
      };
      enriquecerHistoricoComValoresV434.__v53Hook = true;
    }
  } catch {}

  setTimeout(() => refrescarUILimpoV53("arranque"), 1000);
}

setTimeout(instalarHooksLimposV53, 700);



// V54 - Dashboard Vivo + Gráficos + Números
function histV54(){try{if(typeof obterHistoricoArrayV434==="function")return obterHistoricoArrayV434()||[]}catch{}try{if(typeof historicoPremiosV42==="function")return historicoPremiosV42()||[]}catch{}try{if(typeof obterHistoricoPremiosV41==="function")return obterHistoricoPremiosV41()||[]}catch{}try{if(Array.isArray(historico))return historico}catch{}return[]}
function valorNumV54(v){if(v==null)return null;if(typeof v==="number"&&Number.isFinite(v))return v;const s=String(v).replace(/\s/g,"").replace("€","").replace(/\./g,"").replace(",",".");const n=Number(s.replace(/[^\d.-]/g,""));return Number.isFinite(n)?n:null}
function valorItemV54(item){for(const c of [item?.valorPremio,item?.valor,item?.premioValor,item?.premio]){const n=valorNumV54(c);if(n!==null)return n}try{const n=valorNumV54(calcularValorHistoricoV434?.(item));if(n!==null)return n}catch{}return null}
function moedaV54(n){return Number(n||0).toLocaleString("pt-PT",{style:"currency",currency:"EUR"})}
function parseDataV54(s){const m=String(s||"").match(/(\d{2})\/(\d{2})\/(\d{4})/);return m?new Date(+m[3],+m[2]-1,+m[1]):null}
function mesKeyV54(item){const d=parseDataV54(item?.dataSorteio||item?.data||item?.dataRegisto);return d?`${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getFullYear()).slice(-2)}`:"Sem data"}
function contarPorV54(lista,fn){const m=new Map();lista.forEach(x=>{const k=fn(x)||"—";m.set(k,(m.get(k)||0)+1)});return[...m.entries()].sort((a,b)=>b[1]-a[1])}
function atualizarDashboardVivoV54(){
 const hist=histV54();const sorted=[...hist].sort((a,b)=>(parseDataV54(b.dataSorteio||b.data||b.dataRegisto)?.getTime()||0)-(parseDataV54(a.dataSorteio||a.data||a.dataRegisto)?.getTime()||0));const ultimo=sorted[0];const total=hist.reduce((s,h)=>s+(valorItemV54(h)||0),0);const jogoTop=contarPorV54(hist,h=>h.jogo||"—")[0]?.[0]||"—";
 document.getElementById("dvUltimoPremio")&&(dvUltimoPremio.textContent=ultimo?`${ultimo.jogo||"Jogo"} — ${moedaV54(valorItemV54(ultimo)||0)}`:"Ainda sem prémios");
 document.getElementById("dvUltimoPremioMeta")&&(dvUltimoPremioMeta.textContent=ultimo?`${ultimo.dataSorteio||ultimo.data||""} · ${ultimo.resultado||""}`:"Quando houver prémios, aparecem aqui.");
 document.getElementById("dvTotalGanho")&&(dvTotalGanho.textContent=moedaV54(total));
 document.getElementById("dvSequencia")&&(dvSequencia.textContent=`${hist.length} prémio(s)`);
 document.getElementById("dvProximaAcao")&&(dvProximaAcao.textContent=hist.length?`Continuar no ${jogoTop}`:"Adicionar apostas");
 document.getElementById("dvProximaAcaoMeta")&&(dvProximaAcaoMeta.textContent=hist.length?"É o jogo com mais prémios no teu histórico.":"Começa por guardar apostas.");
 document.getElementById("dvBadge")&&(dvBadge.textContent=total>=100?"💎 Forte":total>=25?"🥇 Bom momento":hist.length?"🍀 Em crescimento":"Novo");
 document.getElementById("dvFrase")&&(dvFrase.textContent=hist.length?`Tens ${hist.length} prémio(s) registado(s), total conhecido de ${moedaV54(total)} e o teu jogo mais premiado é ${jogoTop}.`:"Ainda estás a construir histórico.");
}
function barrasV54(id,dados,lim=8){const el=document.getElementById(id);if(!el)return;const max=Math.max(1,...dados.map(x=>x[1]));el.innerHTML=dados.length?dados.slice(0,lim).map(([n,v])=>`<div class="bar-row-v54"><div class="bar-label-v54"><span>${n}</span><strong>${v}</strong></div><div class="bar-track-v54"><div class="bar-fill-v54" style="width:${Math.max(4,Math.round(v/max*100))}%"></div></div></div>`).join(""):`<div class="empty-v54">Sem dados suficientes.</div>`}
function atualizarGraficosV54(){const h=histV54();barrasV54("graficoMesesV54",contarPorV54(h,mesKeyV54).sort((a,b)=>a[0].localeCompare(b[0])),12);barrasV54("graficoJogosV54",contarPorV54(h,x=>x.jogo||"—"),8);document.getElementById("graficosV54Resumo")&&(graficosV54Resumo.textContent=`${h.length} prémio(s) analisado(s)`)}
function parseApostaNumerosV54(aposta){const p=String(aposta||"").split("+");return{nums:(p[0]||"").trim().split(/\s+/).map(Number).filter(Number.isFinite),extras:(p[1]||"").trim().split(/\s+/).map(Number).filter(Number.isFinite)}}
function todasApostasV54(){const out=[];try{Object.entries(apostas||{}).forEach(([j,l])=>(l||[]).forEach(a=>out.push({jogo:j,aposta:a})))}catch{}return out}
function atualizarNumerosV54(){const counts=new Map();const aps=todasApostasV54();aps.forEach(({aposta})=>{const p=parseApostaNumerosV54(aposta);[...p.nums,...p.extras].forEach(n=>counts.set(n,(counts.get(n)||0)+1))});const arr=[...counts.entries()].sort((a,b)=>a[0]-b[0]);const max=Math.max(1,...arr.map(x=>x[1]));document.getElementById("numerosV54Resumo")&&(numerosV54Resumo.textContent=`${aps.length} aposta(s) analisada(s)`);const el=document.getElementById("heatmapNumerosV54");if(!el)return;el.innerHTML=arr.length?arr.map(([n,c])=>`<div class="numero-chip-v54 level-${Math.ceil(c/max*5)}"><strong>${n}</strong><span>${c}</span></div>`).join(""):`<div class="empty-v54">Sem apostas guardadas.</div>`}
function atualizarV54(){try{atualizarDashboardVivoV54()}catch(e){console.warn("V54 dashboard",e)}try{atualizarGraficosV54()}catch(e){console.warn("V54 gráficos",e)}try{atualizarNumerosV54()}catch(e){console.warn("V54 números",e)}}
try{if(typeof renderHistorico==="function"&&!renderHistorico.__v54Hook){const o=renderHistorico;renderHistorico=function(...a){const r=o.apply(this,a);setTimeout(atualizarV54,120);return r};renderHistorico.__v54Hook=true}}catch{}
try{if(typeof guardarApostas==="function"&&!guardarApostas.__v54Hook){const o=guardarApostas;guardarApostas=function(...a){const r=o.apply(this,a);setTimeout(atualizarV54,120);return r};guardarApostas.__v54Hook=true}}catch{}
setTimeout(atualizarV54,1200);setTimeout(atualizarV54,2500);document.addEventListener("click",()=>setTimeout(atualizarV54,250));



// V55 - Layout Dashboard Clean
// Silenciar logs internos "V53 pronto" e deixar só logs úteis.
(function filtroLogsV55(){
  if (console.__v55Filtro) return;
  console.__v55Filtro = true;
  const oldLog = console.log.bind(console);
  console.log = (...args) => {
    const txt = args.map(a => {
      try { return typeof a === "string" ? a : JSON.stringify(a); } catch { return String(a); }
    }).join(" ");
    if (/^V53 pronto:|^V52 UI refresh:|^V51 UI refresh:/i.test(txt)) return;
    oldLog(...args);
  };
})();

function reposicionarV54V55(){
  const dash = document.getElementById("dashboardVivoCard");
  const oldDashTitle = Array.from(document.querySelectorAll("h2")).find(h => h.textContent.trim() === "Dashboard");
  if (dash && oldDashTitle) {
    const oldCard = oldDashTitle.closest("section,.card");
    if (oldCard && oldCard.parentElement && oldCard.previousElementSibling !== dash) {
      oldCard.parentElement.insertBefore(dash, oldCard);
    }
  }

  const grafs = document.getElementById("graficosV54Card");
  const nums = document.getElementById("numerosV54Card");
  const statInt = Array.from(document.querySelectorAll("h2")).find(h => /Estatísticas inteligentes|Estatisticas inteligentes/i.test(h.textContent));
  const statCard = statInt?.closest("section,.card");
  if (statCard && statCard.parentElement) {
    if (grafs && grafs.nextElementSibling !== nums) statCard.parentElement.insertBefore(grafs, statCard);
    if (nums) statCard.parentElement.insertBefore(nums, statCard);
  }

  try { if (typeof atualizarV54 === "function") atualizarV54(); } catch {}
}
setTimeout(reposicionarV54V55, 500);
setTimeout(reposicionarV54V55, 1600);
document.addEventListener("click", () => setTimeout(reposicionarV54V55, 250));



// V56 - Compact Layout
function aplicarCompactLayoutV56(){
  document.body.classList.add("compact-v56");

  // Transformar algumas zonas longas em secções recolhíveis leves
  const titulos = Array.from(document.querySelectorAll("h2"));
  const recolhiveis = [
    /Centro de Sorte/i,
    /Prémios Premium/i,
    /Perfil do Apostador/i,
    /^Estatísticas$/i,
    /Gráficos/i,
    /Números da Sorte/i
  ];

  titulos.forEach(h => {
    if (!recolhiveis.some(rx => rx.test(h.textContent || ""))) return;
    const card = h.closest("section,.card");
    if (!card || card.__v56Compact) return;
    card.__v56Compact = true;
    card.classList.add("collapsible-v56");

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "toggle-v56";
    btn.textContent = "Recolher";
    btn.addEventListener("click", () => {
      card.classList.toggle("collapsed-v56");
      btn.textContent = card.classList.contains("collapsed-v56") ? "Abrir" : "Recolher";
    });

    const head = h.parentElement && h.parentElement !== card ? h.parentElement : h;
    if (!head.querySelector?.(".toggle-v56")) head.appendChild(btn);
  });

  // Por defeito, deixar gráficos e números recolhidos para encurtar página
  ["graficosV54Card", "numerosV54Card"].forEach(id => {
    const el = document.getElementById(id);
    const btn = el?.querySelector(".toggle-v56");
    if (el && !el.__v56AutoCollapsed) {
      el.__v56AutoCollapsed = true;
      el.classList.add("collapsed-v56");
      if (btn) btn.textContent = "Abrir";
    }
  });
}

setTimeout(aplicarCompactLayoutV56, 500);
setTimeout(aplicarCompactLayoutV56, 1600);
document.addEventListener("click", () => setTimeout(aplicarCompactLayoutV56, 200));



// V57 - Final Tools: backup/restauro, cache, sobre e compacto mobile
function historicoV57(){
  try{if(typeof obterHistoricoArrayV434==="function")return obterHistoricoArrayV434()||[]}catch{}
  try{if(typeof historicoPremiosV42==="function")return historicoPremiosV42()||[]}catch{}
  try{if(typeof obterHistoricoPremiosV41==="function")return obterHistoricoPremiosV41()||[]}catch{}
  try{if(Array.isArray(historico))return historico}catch{}
  return [];
}
function apostasV57(){
  try{return JSON.parse(JSON.stringify(apostas||{}))}catch{return{}}
}
function estadoV57(){
  let notif="indisponível";
  try{notif=Notification?.permission||"indisponível"}catch{}
  return {
    appVersion:window.APP_VERSION,
    data:new Date().toISOString(),
    url:location.href,
    userAgent:navigator.userAgent,
    notificacoes:notif,
    apostas:apostasV57(),
    historico:historicoV57(),
    totais:{
      jogos:Object.keys(apostasV57()).length,
      apostas:Object.values(apostasV57()).reduce((s,l)=>s+(Array.isArray(l)?l.length:0),0),
      premios:historicoV57().length
    },
    localStorageKeys:Object.keys(localStorage||{}).filter(k=>/jsc|apostas|historico|premio/i.test(k))
  };
}
function setBadgeV57(txt){
  const el=document.getElementById("toolsV57Badge");
  if(el)el.textContent=txt;
}
function downloadJSONV57(nome,obj){
  const blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=nome;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportarBackupV57(){
  const dados=estadoV57();
  downloadJSONV57(`backup-jogos-santa-casa-${new Date().toISOString().slice(0,10)}.json`,dados);
  setBadgeV57("Backup feito");
}
async function restaurarBackupV57(file){
  if(!file)return;
  const txt=await file.text();
  const dados=JSON.parse(txt);
  if(!confirm("Restaurar este backup? Isto substitui os dados locais deste dispositivo."))return;

  const userId=(()=>{try{return user?.id||perfil?.user_id||""}catch{return""}})();
  const suffix=userId?`_${userId}`:"";
  try{
    if(dados.apostas)localStorage.setItem(`apostasJSC${suffix}`,JSON.stringify(dados.apostas));
    if(dados.historico)localStorage.setItem(`historicoJSC${suffix}`,JSON.stringify(dados.historico));
  }catch(e){
    alert("Erro ao restaurar: "+e.message);
    return;
  }
  setBadgeV57("Restaurado");
  alert("Backup restaurado. A app vai recarregar.");
  location.reload();
}
async function limparCacheV57(){
  try{
    if("caches" in window){
      const keys=await caches.keys();
      await Promise.all(keys.map(k=>caches.delete(k)));
    }
    if(navigator.serviceWorker){
      const regs=await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r=>r.update().catch(()=>{})));
    }
  }catch(e){console.warn("V57 cache",e)}
  setBadgeV57("Cache limpa");
  alert("Cache limpa. A página vai recarregar.");
  location.reload(true);
}
function atualizarSobreV57(){
  const st=estadoV57();
  const el=document.getElementById("sobreAppV57");
  if(el)el.textContent=`${st.appVersion} · ${st.totais.apostas} aposta(s) · ${st.totais.premios} prémio(s) · notif: ${st.notificacoes}`;
}
async function copiarEstadoV57(){
  const txt=JSON.stringify(estadoV57(),null,2);
  try{await navigator.clipboard.writeText(txt);alert("Estado copiado.")}catch{prompt("Copia o estado:",txt)}
}
function compactoOnV57(){
  document.body.classList.add("compact-v56","mobile-compact-v57");
  localStorage.setItem("jsc_compact_v57","1");
  setBadgeV57("Compacto ON");
}
function compactoOffV57(){
  document.body.classList.remove("mobile-compact-v57");
  localStorage.setItem("jsc_compact_v57","0");
  setBadgeV57("Modo normal");
}
function aplicarMobileCompactV57(){
  const saved=localStorage.getItem("jsc_compact_v57");
  if(saved==="1" || (saved!== "0" && window.innerWidth<820)){
    document.body.classList.add("compact-v56","mobile-compact-v57");
  }
}
function iniciarToolsV57(){
  aplicarMobileCompactV57();
  atualizarSobreV57();
  const bBackup=document.getElementById("btnBackupV57");
  const bRestore=document.getElementById("btnRestoreV57");
  const input=document.getElementById("inputRestoreV57");
  const bCache=document.getElementById("btnHardRefreshV57");
  const bReload=document.getElementById("btnReloadV57");
  const bSobre=document.getElementById("btnSobreV57");
  const bCopiar=document.getElementById("btnCopiarEstadoV57");
  const bOn=document.getElementById("btnCompactOnV57");
  const bOff=document.getElementById("btnCompactOffV57");
  if(bBackup&&!bBackup.__v57){bBackup.__v57=true;bBackup.addEventListener("click",exportarBackupV57)}
  if(bRestore&&!bRestore.__v57){bRestore.__v57=true;bRestore.addEventListener("click",()=>input?.click())}
  if(input&&!input.__v57){input.__v57=true;input.addEventListener("change",e=>restaurarBackupV57(e.target.files?.[0]))}
  if(bCache&&!bCache.__v57){bCache.__v57=true;bCache.addEventListener("click",limparCacheV57)}
  if(bReload&&!bReload.__v57){bReload.__v57=true;bReload.addEventListener("click",()=>location.reload())}
  if(bSobre&&!bSobre.__v57){bSobre.__v57=true;bSobre.addEventListener("click",()=>{atualizarSobreV57();alert(document.getElementById("sobreAppV57")?.textContent||window.APP_VERSION)})}
  if(bCopiar&&!bCopiar.__v57){bCopiar.__v57=true;bCopiar.addEventListener("click",copiarEstadoV57)}
  if(bOn&&!bOn.__v57){bOn.__v57=true;bOn.addEventListener("click",compactoOnV57)}
  if(bOff&&!bOff.__v57){bOff.__v57=true;bOff.addEventListener("click",compactoOffV57)}
}
setTimeout(iniciarToolsV57,800);
setTimeout(iniciarToolsV57,2000);
window.addEventListener("resize",aplicarMobileCompactV57);



// V58 - Gestão de Prémios + Notificações inteligentes + FCM Ready
const JSC_PREMIOS_LEVANTADOS_KEY_V58="jsc_premios_levantados_v58";
const JSC_NOTIFS_ENVIADAS_KEY_V58="jsc_notificacoes_premios_enviadas_v58";
function histV58(){try{if(typeof obterHistoricoArrayV434==="function")return obterHistoricoArrayV434()||[]}catch{}try{if(typeof historicoPremiosV42==="function")return historicoPremiosV42()||[]}catch{}try{if(typeof obterHistoricoPremiosV41==="function")return obterHistoricoPremiosV41()||[]}catch{}try{if(Array.isArray(historico))return historico}catch{}return[]}
function dinheiroNumV58(v){if(v==null)return 0;if(typeof v==="number"&&Number.isFinite(v))return v;const s=String(v).replace(/\s/g,"").replace("€","").replace(/\./g,"").replace(",",".");const n=Number(s.replace(/[^\d.-]/g,""));return Number.isFinite(n)?n:0}
function dinheiroTxtV58(n){return Number(n||0).toLocaleString("pt-PT",{style:"currency",currency:"EUR"})}
function valorItemV58(item){for(const c of [item?.valorPremio,item?.valor,item?.premioValor,item?.premio]){const n=dinheiroNumV58(c);if(n>0)return n}try{const n=dinheiroNumV58(calcularValorHistoricoV434?.(item));if(n>0)return n}catch{}return 0}
function normV58(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim()}
function premioIdV58(item){return [normV58(item?.jogo),normV58(item?.sorteio),normV58(item?.dataSorteio||item?.data),normV58(item?.aposta),normV58(item?.resultado||item?.acertos),valorItemV58(item)].join("|")}
function loadJsonV58(k,f){try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f))}catch{return f}}
function saveJsonV58(k,v){localStorage.setItem(k,JSON.stringify(v))}
function levantadosV58(){return loadJsonV58(JSC_PREMIOS_LEVANTADOS_KEY_V58,{})}
function setLevantadoV58(id,val){const st=levantadosV58();if(val)st[id]={levantado:true,data:new Date().toISOString()};else delete st[id];saveJsonV58(JSC_PREMIOS_LEVANTADOS_KEY_V58,st)}
function notifEnviadasV58(){return loadJsonV58(JSC_NOTIFS_ENVIADAS_KEY_V58,{})}
function setNotifEnviadaV58(id){const st=notifEnviadasV58();st[id]={enviada:true,data:new Date().toISOString()};saveJsonV58(JSC_NOTIFS_ENVIADAS_KEY_V58,st)}
function parseApostaV58(a){const p=String(a||"").split("+");return{nums:(p[0]||"").trim().split(/\s+/).map(Number).filter(Number.isFinite),extras:(p[1]||"").trim().split(/\s+/).map(Number).filter(Number.isFinite)}}
function explicarPremioV58(item){const p=parseApostaV58(item?.aposta);const resumo=String(item?.resultado||item?.acertos||"Prémio encontrado");return{nums:p.nums,extras:p.extras,resumo}}
function renderPremiosGestaoV58(){
 const lista=histV58(), lev=levantadosV58(), filtro=document.querySelector("[data-filtro-premios-v58].active")?.dataset?.filtroPremiosV58||"todos";
 const total=lista.reduce((s,i)=>s+valorItemV58(i),0), totalLev=lista.reduce((s,i)=>s+(lev[premioIdV58(i)]?valorItemV58(i):0),0), pend=total-totalLev;
 document.getElementById("premiosGestaoResumoV58")&&(premiosGestaoResumoV58.textContent=`${lista.length} prémio(s)`);
 document.getElementById("v58TotalGanho")&&(v58TotalGanho.textContent=dinheiroTxtV58(total));
 document.getElementById("v58TotalLevantado")&&(v58TotalLevantado.textContent=dinheiroTxtV58(totalLev));
 document.getElementById("v58TotalPorLevantar")&&(v58TotalPorLevantar.textContent=dinheiroTxtV58(pend));
 const el=document.getElementById("premiosListaGestaoV58"); if(!el)return;
 const arr=lista.filter(i=>{const l=!!lev[premioIdV58(i)];return filtro==="levantados"?l:filtro==="porLevantar"?!l:true});
 if(!arr.length){el.innerHTML='<div class="empty-v58">Sem prémios neste filtro.</div>';return}
 el.innerHTML=arr.map(item=>{const id=premioIdV58(item), l=!!lev[id], val=valorItemV58(item), ex=explicarPremioV58(item);
 const nums=ex.nums.map(n=>`<span>${n}</span>`).join(""), extras=ex.extras.map(n=>`<span class="extra">${n}</span>`).join("");
 return `<article class="premio-gestao-item-v58 ${l?"levantado":"pendente"}">
 <div class="premio-gestao-top-v58"><div><strong>🏆 ${item.jogo||"Jogo"} — ${dinheiroTxtV58(val)}</strong><small>${item.sorteio||""} · ${item.dataSorteio||item.data||""}</small></div><span>${l?"✅ Levantado":"🟡 Por levantar"}</span></div>
 <div class="premio-detalhe-v58"><div><b>A tua aposta</b><p class="bolas-v58">${nums}${extras?`<i>+</i>${extras}`:""}</p></div><div><b>Motivo do prémio</b><p>${ex.resumo}</p></div><div><b>Estado</b><p>${l?"Prémio já levantado":"Ainda por levantar"}</p></div></div>
 <button type="button" class="btn-levantar-v58" data-id="${encodeURIComponent(id)}">${l?"Marcar por levantar":"Marcar como levantado"}</button></article>`}).join("");
 el.querySelectorAll(".btn-levantar-v58").forEach(b=>{if(b.__v58)return;b.__v58=true;b.addEventListener("click",()=>{const id=decodeURIComponent(b.dataset.id||"");setLevantadoV58(id,!levantadosV58()[id]);renderPremiosGestaoV58()})});
}
function notificarPremiosNovosV58(){const lista=histV58(), env=notifEnviadasV58();let novas=0;lista.forEach(item=>{const id=premioIdV58(item);if(env[id])return;const val=valorItemV58(item);if(!val&&!item?.premio)return;try{if(typeof Notification!=="undefined"&&Notification.permission==="granted"){new Notification("🎉 Prémio encontrado!",{body:`${item.jogo||"Jogo"}: ${val?dinheiroTxtV58(val):(item.premio||"Prémio")}`,tag:`premio-${id}`,renotify:false})}}catch{}setNotifEnviadaV58(id);novas++});const r=document.getElementById("notifResumoV58");if(r)r.textContent=`${Object.keys(notifEnviadasV58()).length} prémio(s) já notificado(s) neste dispositivo.`;return novas}
async function testarNotifV58(){try{if(typeof Notification==="undefined"){alert("Este browser não suporta notificações.");return}let p=Notification.permission;if(p==="default")p=await Notification.requestPermission();if(p!=="granted"){alert("Notificações não autorizadas.");return}new Notification("🍀 Teste Jogos Santa Casa",{body:"As notificações locais estão a funcionar.",tag:"teste-v58"})}catch(e){alert("Erro: "+e.message)}}
function resetNotifV58(){if(confirm("Limpar memória de notificações enviadas?")){localStorage.removeItem(JSC_NOTIFS_ENVIADAS_KEY_V58);notificarPremiosNovosV58()}}
function instalarV58(){document.querySelectorAll("[data-filtro-premios-v58]").forEach(b=>{if(b.__v58)return;b.__v58=true;b.addEventListener("click",()=>{document.querySelectorAll("[data-filtro-premios-v58]").forEach(x=>x.classList.remove("active"));b.classList.add("active");renderPremiosGestaoV58()})});const t=document.getElementById("btnTesteNotifV58");if(t&&!t.__v58){t.__v58=true;t.addEventListener("click",testarNotifV58)}const r=document.getElementById("btnResetNotifV58");if(r&&!r.__v58){r.__v58=true;r.addEventListener("click",resetNotifV58)}renderPremiosGestaoV58();notificarPremiosNovosV58()}
try{if(typeof renderHistorico==="function"&&!renderHistorico.__v58Hook){const o=renderHistorico;renderHistorico=function(...a){const res=o.apply(this,a);setTimeout(()=>{renderPremiosGestaoV58();notificarPremiosNovosV58()},300);return res};renderHistorico.__v58Hook=true}}catch{}
setTimeout(instalarV58,1000);setTimeout(instalarV58,2500);document.addEventListener("click",()=>setTimeout(renderPremiosGestaoV58,250));



// V59 - Correção de Prémios: não confiar cegamente no histórico antigo
const JSC_PREMIOS_CONFIRMADOS_KEY_V59 = "jsc_premios_confirmados_v59";
const JSC_PREMIOS_LEVANTADOS_KEY_V59 = "jsc_premios_levantados_v59";

function jsonV59(k,f){try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f))}catch{return f}}
function saveV59(k,v){localStorage.setItem(k,JSON.stringify(v))}
function confirmadosV59(){return jsonV59(JSC_PREMIOS_CONFIRMADOS_KEY_V59,{})}
function levantadosV59(){return jsonV59(JSC_PREMIOS_LEVANTADOS_KEY_V59,{})}
function setConfirmadoV59(id,val){const st=confirmadosV59();if(val)st[id]={confirmado:true,data:new Date().toISOString()};else delete st[id];saveV59(JSC_PREMIOS_CONFIRMADOS_KEY_V59,st)}
function setLevantadoV59(id,val){const st=levantadosV59();if(val)st[id]={levantado:true,data:new Date().toISOString()};else delete st[id];saveV59(JSC_PREMIOS_LEVANTADOS_KEY_V59,st)}

function histSeguroV59(){
  try{return histV58?.()||[]}catch{}
  try{if(typeof obterHistoricoArrayV434==="function")return obterHistoricoArrayV434()||[]}catch{}
  return [];
}
function valorItemSeguroV59(item){
  try{return valorItemV58?.(item)||0}catch{}
  return 0;
}
function dinheiroV59(n){
  try{return dinheiroTxtV58?.(n)||Number(n||0).toLocaleString("pt-PT",{style:"currency",currency:"EUR"})}catch{return Number(n||0).toLocaleString("pt-PT",{style:"currency",currency:"EUR"})}
}
function premioIdSeguroV59(item){
  try{return premioIdV58?.(item)}catch{}
  return [item?.jogo,item?.sorteio,item?.dataSorteio||item?.data,item?.aposta,item?.resultado||item?.acertos,valorItemSeguroV59(item)].join("|");
}
function parseApostaSeguroV59(a){
  try{return parseApostaV58?.(a)||{nums:[],extras:[]}}catch{return{nums:[],extras:[]}}
}
function motivoSeguroV59(item){
  const txt=String(item?.resultado||item?.acertos||"");
  if(!txt)return "Prémio por confirmar";
  return txt;
}

// Override render da V58 com comportamento seguro
function renderPremiosGestaoV58(){
  const lista = histSeguroV59();
  const conf = confirmadosV59();
  const lev = levantadosV59();
  const filtro = document.querySelector("[data-filtro-premios-v58].active")?.dataset?.filtroPremiosV58 || "todos";

  const totalConfirmado = lista.reduce((s,i)=>s+(conf[premioIdSeguroV59(i)]?valorItemSeguroV59(i):0),0);
  const totalLev = lista.reduce((s,i)=>s+(lev[premioIdSeguroV59(i)]?valorItemSeguroV59(i):0),0);
  const totalPend = Math.max(0,totalConfirmado-totalLev);
  const porConfirmar = lista.filter(i=>!conf[premioIdSeguroV59(i)]).length;

  const elResumo=document.getElementById("premiosGestaoResumoV58");
  if(elResumo)elResumo.textContent=`${lista.length} candidato(s) · ${porConfirmar} por confirmar`;
  document.getElementById("v58TotalGanho")&&(v58TotalGanho.textContent=dinheiroV59(totalConfirmado));
  document.getElementById("v58TotalLevantado")&&(v58TotalLevantado.textContent=dinheiroV59(totalLev));
  document.getElementById("v58TotalPorLevantar")&&(v58TotalPorLevantar.textContent=dinheiroV59(totalPend));

  const el=document.getElementById("premiosListaGestaoV58");
  if(!el)return;

  let arr=lista.filter(i=>{
    const id=premioIdSeguroV59(i);
    const isConf=!!conf[id];
    const isLev=!!lev[id];
    if(filtro==="levantados")return isLev;
    if(filtro==="porLevantar")return isConf&&!isLev;
    return true;
  });

  if(!arr.length){
    el.innerHTML='<div class="empty-v58">Sem prémios neste filtro.</div>';
    return;
  }

  el.innerHTML=arr.map(item=>{
    const id=premioIdSeguroV59(item);
    const isConf=!!conf[id];
    const isLev=!!lev[id];
    const val=valorItemSeguroV59(item);
    const p=parseApostaSeguroV59(item?.aposta);
    const nums=p.nums.map(n=>`<span>${n}</span>`).join("");
    const extras=p.extras.map(n=>`<span class="extra">${n}</span>`).join("");
    const estado=isLev?"✅ Levantado":isConf?"🟡 Por levantar":"⚠️ Por confirmar";
    const cls=isLev?"levantado":isConf?"pendente":"por-confirmar";
    return `<article class="premio-gestao-item-v58 ${cls}">
      <div class="premio-gestao-top-v58">
        <div><strong>🏆 ${item.jogo||"Jogo"} — ${dinheiroV59(val)}</strong><small>${item.sorteio||""} · ${item.dataSorteio||item.data||""}</small></div>
        <span>${estado}</span>
      </div>
      <div class="premio-detalhe-v58">
        <div><b>A tua aposta</b><p class="bolas-v58">${nums}${extras?`<i>+</i>${extras}`:""}</p></div>
        <div><b>Motivo registado</b><p>${motivoSeguroV59(item)}</p></div>
        <div><b>Confirmação</b><p>${isConf?"Confirmado pelo utilizador":"Não soma até confirmares"}</p></div>
      </div>
      <div class="acoes-premio-v59">
        <button type="button" class="btn-confirmar-v59" data-id="${encodeURIComponent(id)}">${isConf?"Retirar confirmação":"Confirmar prémio"}</button>
        <button type="button" class="btn-levantar-v58" data-id="${encodeURIComponent(id)}" ${!isConf?"disabled":""}>${isLev?"Marcar por levantar":"Marcar como levantado"}</button>
      </div>
    </article>`;
  }).join("");

  el.querySelectorAll(".btn-confirmar-v59").forEach(b=>{
    if(b.__v59)return;b.__v59=true;
    b.addEventListener("click",()=>{
      const id=decodeURIComponent(b.dataset.id||"");
      setConfirmadoV59(id,!confirmadosV59()[id]);
      if(!confirmadosV59()[id]) setLevantadoV59(id,false);
      renderPremiosGestaoV58();
    });
  });
  el.querySelectorAll(".btn-levantar-v58").forEach(b=>{
    if(b.__v59)return;b.__v59=true;
    b.addEventListener("click",()=>{
      const id=decodeURIComponent(b.dataset.id||"");
      if(!confirmadosV59()[id])return;
      setLevantadoV59(id,!levantadosV59()[id]);
      renderPremiosGestaoV58();
    });
  });
}

// Notificações: só para prémios confirmados ou novos que não tenham sido sinalizados como suspeitos
function notificarPremiosNovosV58(){
  const lista=histSeguroV59();
  const env=notifEnviadasV58?.()||{};
  const conf=confirmadosV59();
  let novas=0;
  lista.forEach(item=>{
    const id=premioIdSeguroV59(item);
    if(env[id])return;
    // Histórico antigo sem confirmação não notifica.
    if(!conf[id])return;
    const val=valorItemSeguroV59(item);
    try{
      if(typeof Notification!=="undefined"&&Notification.permission==="granted"){
        new Notification("🎉 Prémio confirmado!",{body:`${item.jogo||"Jogo"}: ${dinheiroV59(val)}`,tag:`premio-${id}`,renotify:false});
      }
    }catch{}
    try{setNotifEnviadaV58?.(id)}catch{}
    novas++;
  });
  const r=document.getElementById("notifResumoV58");
  if(r)r.textContent=`Notificações sem repetição. Histórico antigo só notifica após confirmação.`;
  return novas;
}

function instalarV59(){
  renderPremiosGestaoV58();
  try{notificarPremiosNovosV58()}catch{}
}
setTimeout(instalarV59,800);
setTimeout(instalarV59,2200);
document.addEventListener("click",()=>setTimeout(instalarV59,250));



// V61 - Emergency Clean
// Corrige o problema da V60 e evita loops/deduplicação pesada.
// Base: V59 estável.

window.__V61_EMERGENCY_CLEAN = true;

function normV61(s){
  return String(s||"")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/\s+/g," ")
    .trim();
}
function apostaNormV61(s){
  return String(s||"")
    .replace(/\s*\+\s*/g," + ")
    .replace(/\s+/g," ")
    .trim();
}
function valorV61(item){
  try { return valorItemSeguroV59?.(item) || 0; } catch {}
  try { return valorItemV58?.(item) || 0; } catch {}
  return 0;
}
function keyPremioV61(item){
  return [
    normV61(item?.jogo),
    normV61(item?.sorteio),
    normV61(item?.dataSorteio || item?.data),
    apostaNormV61(item?.aposta),
    normV61(item?.resultado || item?.acertos),
    valorV61(item)
  ].join("|");
}
function histBaseV61(){
  try { if (typeof obterHistoricoArrayV434 === "function") return obterHistoricoArrayV434() || []; } catch {}
  try { if (typeof obterHistoricoPremiosV41 === "function") return obterHistoricoPremiosV41() || []; } catch {}
  try { if (Array.isArray(historico)) return historico; } catch {}
  return [];
}
function dedupeV61(lista){
  const map = new Map();
  (lista || []).forEach(item => {
    const k = keyPremioV61(item);
    if (!map.has(k)) map.set(k, {...item, __keyV61:k});
  });
  return [...map.values()];
}
function histSeguroV61(){
  return dedupeV61(histBaseV61());
}

// Override seguro das fontes da V58/V59.
function histSeguroV59(){ return histSeguroV61(); }
function histV58(){ return histSeguroV61(); }
function premioIdSeguroV59(item){ return keyPremioV61(item); }
function premioIdV58(item){ return keyPremioV61(item); }

// Limpeza local uma única vez e sem recursão.
function limparDuplicadosLocalV61(){
  try{
    Object.keys(localStorage).forEach(k=>{
      if(/^historicoJSC/.test(k)){
        const arr = JSON.parse(localStorage.getItem(k) || "[]");
        if(Array.isArray(arr) && arr.length){
          const clean = dedupeV61(arr);
          if(clean.length < arr.length) localStorage.setItem(k, JSON.stringify(clean));
        }
      }
    });
  }catch(e){
    console.warn("V61 limpeza duplicados falhou:", e);
  }
}

// Render da gestão em modo seguro: nada conta sem confirmação manual.
function renderPremiosGestaoV58(){
  const lista = histSeguroV61();
  const conf = (typeof confirmadosV59 === "function") ? confirmadosV59() : {};
  const lev = (typeof levantadosV59 === "function") ? levantadosV59() : {};
  const filtro = document.querySelector("[data-filtro-premios-v58].active")?.dataset?.filtroPremiosV58 || "todos";

  const totalConfirmado = lista.reduce((s,i)=>s+(conf[keyPremioV61(i)]?valorV61(i):0),0);
  const totalLev = lista.reduce((s,i)=>s+(lev[keyPremioV61(i)]?valorV61(i):0),0);
  const totalPend = Math.max(0,totalConfirmado-totalLev);
  const porConfirmar = lista.filter(i=>!conf[keyPremioV61(i)]).length;

  const resumo = document.getElementById("premiosGestaoResumoV58");
  if(resumo) resumo.textContent = `${lista.length} candidato(s) · ${porConfirmar} por confirmar`;
  document.getElementById("v58TotalGanho") && (v58TotalGanho.textContent = dinheiroV59 ? dinheiroV59(totalConfirmado) : `${totalConfirmado.toFixed(2)} €`);
  document.getElementById("v58TotalLevantado") && (v58TotalLevantado.textContent = dinheiroV59 ? dinheiroV59(totalLev) : `${totalLev.toFixed(2)} €`);
  document.getElementById("v58TotalPorLevantar") && (v58TotalPorLevantar.textContent = dinheiroV59 ? dinheiroV59(totalPend) : `${totalPend.toFixed(2)} €`);

  const el = document.getElementById("premiosListaGestaoV58");
  if(!el) return;

  let arr = lista.filter(i=>{
    const id = keyPremioV61(i);
    const isConf = !!conf[id];
    const isLev = !!lev[id];
    if(filtro === "levantados") return isLev;
    if(filtro === "porLevantar") return isConf && !isLev;
    return true;
  });

  if(!arr.length){
    el.innerHTML = '<div class="empty-v58">Sem prémios neste filtro.</div>';
    return;
  }

  el.innerHTML = arr.map(item=>{
    const id = keyPremioV61(item);
    const isConf = !!conf[id];
    const isLev = !!lev[id];
    const val = valorV61(item);
    let p = {nums:[],extras:[]};
    try{ p = parseApostaSeguroV59?.(item?.aposta) || parseApostaV58?.(item?.aposta) || p; }catch{}
    const nums = (p.nums||[]).map(n=>`<span>${n}</span>`).join("");
    const extras = (p.extras||[]).map(n=>`<span class="extra">${n}</span>`).join("");
    const estado = isLev ? "✅ Levantado" : isConf ? "🟡 Por levantar" : "⚠️ Por confirmar";
    const cls = isLev ? "levantado" : isConf ? "pendente" : "por-confirmar";

    return `<article class="premio-gestao-item-v58 ${cls}">
      <div class="premio-gestao-top-v58">
        <div>
          <strong>🏆 ${item.jogo || "Jogo"} — ${dinheiroV59 ? dinheiroV59(val) : val}</strong>
          <small>${item.sorteio || ""} · ${item.dataSorteio || item.data || ""}</small>
        </div>
        <span>${estado}</span>
      </div>
      <div class="premio-detalhe-v58">
        <div><b>A tua aposta</b><p class="bolas-v58">${nums}${extras?`<i>+</i>${extras}`:""}</p></div>
        <div><b>Motivo registado</b><p>${item.resultado || item.acertos || "Prémio por confirmar"}</p></div>
        <div><b>Confirmação</b><p>${isConf ? "Confirmado pelo utilizador" : "Não conta até confirmares"}</p></div>
      </div>
      <div class="acoes-premio-v59">
        <button type="button" class="btn-confirmar-v59" data-id="${encodeURIComponent(id)}">${isConf ? "Retirar confirmação" : "Confirmar prémio"}</button>
        <button type="button" class="btn-levantar-v58" data-id="${encodeURIComponent(id)}" ${!isConf ? "disabled" : ""}>${isLev ? "Marcar por levantar" : "Marcar como levantado"}</button>
      </div>
    </article>`;
  }).join("");

  el.querySelectorAll(".btn-confirmar-v59").forEach(b=>{
    if(b.__v61) return;
    b.__v61 = true;
    b.addEventListener("click",()=>{
      const id = decodeURIComponent(b.dataset.id || "");
      if(typeof setConfirmadoV59 === "function") setConfirmadoV59(id, !confirmadosV59()[id]);
      if(typeof setLevantadoV59 === "function" && !confirmadosV59()[id]) setLevantadoV59(id,false);
      renderPremiosGestaoV58();
    });
  });

  el.querySelectorAll(".btn-levantar-v58").forEach(b=>{
    if(b.__v61) return;
    b.__v61 = true;
    b.addEventListener("click",()=>{
      const id = decodeURIComponent(b.dataset.id || "");
      if(typeof confirmadosV59 === "function" && !confirmadosV59()[id]) return;
      if(typeof setLevantadoV59 === "function") setLevantadoV59(id, !levantadosV59()[id]);
      renderPremiosGestaoV58();
    });
  });

  const aviso = document.getElementById("avisoPremiosV59");
  if(aviso) aviso.textContent = "⚠️ Histórico antigo tratado como candidato. Só conta depois de carregares em Confirmar prémio.";
}

// Notificações: nunca para candidatos não confirmados.
function notificarPremiosNovosV58(){
  return 0;
}

function instalarV61(){
  limparDuplicadosLocalV61();
  try{ renderPremiosGestaoV58(); }catch(e){ console.warn("V61 render gestão:", e); }
}
setTimeout(instalarV61, 600);
setTimeout(instalarV61, 1800);
document.addEventListener("click", () => setTimeout(instalarV61, 200));



// V62 - Recalcular Totoloto por chave oficial
// Corrige histórico contaminado das versões anteriores.

const TOTOOFICIAL_V62 = {
  "050/2026": { data:"24/06/2026", numeros:[2,9,12,17,34], sorte:9, premios: { "5+1":0, "5+0":19525.07, "4+0":171.87, "3+0":4.14, "2+0":1.90, "0+1":0 } },
  "051/2026": { data:"27/06/2026", numeros:[7,12,17,22,46], sorte:9, premios: { "5+1":0, "5+0":0, "4+0":312.23, "3+0":4.37, "2+0":1.93, "0+1":0 } },
  "052/2026": { data:"01/07/2026", numeros:[12,16,35,44,47], sorte:10, premios: { "5+1":0, "5+0":0, "4+0":449.17, "3+0":6.02, "2+0":2.46, "0+1":0 } }
};

function parseApostaTotolotoV62(txt){
  const parts = String(txt||"").split("+");
  return {
    nums: (parts[0]||"").trim().split(/\s+/).map(Number).filter(Number.isFinite),
    sorte: Number((parts[1]||"").trim().split(/\s+/)[0])
  };
}
function extrairSorteioV62(s){
  const m = String(s||"").match(/0?(\d{2,3})\/2026/);
  return m ? `${String(Number(m[1])).padStart(3,"0")}/2026` : "";
}
function avaliarTotolotoV62(apostaTxt, sorteioTxt){
  const key = extrairSorteioV62(sorteioTxt);
  const of = TOTOOFICIAL_V62[key];
  if(!of) return null;

  const ap = parseApostaTotolotoV62(apostaTxt);
  const acertosNums = ap.nums.filter(n => of.numeros.includes(n));
  const acertouSorte = ap.sorte === of.sorte;
  const nums = acertosNums.length;

  let categoria = null;
  let valor = 0;

  // Regras oficiais visíveis nas tabelas:
  // 5+NS, 5, 4, 3, 2, Nº da Sorte.
  if(nums === 5 && acertouSorte) categoria = "5+1";
  else if(nums === 5) categoria = "5+0";
  else if(nums === 4) categoria = "4+0";
  else if(nums === 3) categoria = "3+0";
  else if(nums === 2) categoria = "2+0";
  else if(acertouSorte) categoria = "0+1";

  valor = categoria ? (of.premios[categoria] || 0) : 0;
  const temPremio = !!categoria && (categoria === "0+1" || valor > 0 || nums >= 2);

  return {
    sorteio:key,
    data:of.data,
    chave:of.numeros,
    sorte:of.sorte,
    aposta:ap,
    acertosNums,
    acertouSorte,
    nums,
    categoria,
    valor,
    temPremio,
    resultadoTexto: temPremio
      ? `${nums} número(s)${acertouSorte ? " + 1 Nº da Sorte" : ""}`
      : `${nums} número(s)${acertouSorte ? " + 1 Nº da Sorte" : ""} — sem prémio`
  };
}
function isTotolotoV62(item){
  return /totoloto/i.test(String(item?.jogo||""));
}
function recalcHistoricoLocalV62(){
  let mudou = false;
  try{
    Object.keys(localStorage).forEach(k=>{
      if(!/^historicoJSC/.test(k)) return;
      const arr = JSON.parse(localStorage.getItem(k)||"[]");
      if(!Array.isArray(arr)) return;

      const novo = [];
      const seen = new Set();

      arr.forEach(item=>{
        if(!isTotolotoV62(item)){
          const generic = JSON.stringify(item);
          if(!seen.has(generic)){ seen.add(generic); novo.push(item); }
          return;
        }

        const ev = avaliarTotolotoV62(item.aposta, item.sorteio || item.dataSorteio);
        if(!ev){
          const generic = JSON.stringify(item);
          if(!seen.has(generic)){ seen.add(generic); novo.push(item); }
          return;
        }

        // Remove falso prémio.
        if(!ev.temPremio || ev.valor <= 0){
          mudou = true;
          return;
        }

        const clean = {
          ...item,
          jogo:"Totoloto",
          dataSorteio: ev.data,
          sorteio: `${ev.sorteio} - ${String(item.sorteio||"").toLowerCase().includes("quarta") ? "quarta-feira" : String(item.sorteio||"").toLowerCase().includes("sábado") ? "sábado" : ""}`.trim(),
          resultado: ev.resultadoTexto,
          premio: `Prémio — ${ev.valor.toLocaleString("pt-PT",{style:"currency",currency:"EUR"})}`,
          valorPremio: ev.valor,
          __recalculadoV62: true
        };
        const id = [clean.jogo, ev.sorteio, clean.aposta, clean.resultado, ev.valor].join("|");
        if(!seen.has(id)){
          seen.add(id);
          novo.push(clean);
        }else{
          mudou = true;
        }
      });

      if(novo.length !== arr.length || JSON.stringify(novo) !== JSON.stringify(arr)){
        localStorage.setItem(k, JSON.stringify(novo));
        mudou = true;
      }
    });
  }catch(e){
    console.warn("V62 recalc local falhou:", e);
  }
  return mudou;
}

// Override valor e ids para Totoloto recalculado.
function valorItemSeguroV59(item){
  if(isTotolotoV62(item)){
    const ev = avaliarTotolotoV62(item.aposta, item.sorteio || item.dataSorteio);
    if(ev && ev.temPremio && ev.valor > 0) return ev.valor;
    return 0;
  }
  try{return valorItemV58?.(item)||0}catch{}
  return 0;
}
function valorItemV58(item){
  return valorItemSeguroV59(item);
}
function keyRecalcV62(item){
  if(isTotolotoV62(item)){
    const ev = avaliarTotolotoV62(item.aposta, item.sorteio || item.dataSorteio);
    if(ev) return ["totoloto", ev.sorteio, String(item.aposta||""), ev.resultadoTexto, ev.valor].join("|");
  }
  return [String(item?.jogo||""),String(item?.sorteio||""),String(item?.dataSorteio||item?.data||""),String(item?.aposta||""),String(item?.resultado||""),valorItemSeguroV59(item)].join("|");
}
function premioIdSeguroV59(item){ return keyRecalcV62(item); }
function premioIdV58(item){ return keyRecalcV62(item); }

function histSeguroV59(){
  const base = histBaseV61 ? histBaseV61() : [];
  const out = [];
  const seen = new Set();

  base.forEach(item=>{
    if(isTotolotoV62(item)){
      const ev = avaliarTotolotoV62(item.aposta, item.sorteio || item.dataSorteio);
      if(ev){
        if(!ev.temPremio || ev.valor <= 0) return;
        item = {...item, resultado:ev.resultadoTexto, valorPremio:ev.valor, premio:`Prémio — ${ev.valor.toLocaleString("pt-PT",{style:"currency",currency:"EUR"})}`};
      }
    }
    const id = keyRecalcV62(item);
    if(!seen.has(id)){
      seen.add(id);
      out.push(item);
    }
  });
  return out;
}
function histV58(){ return histSeguroV59(); }

function instalarV62(){
  const mudou = recalcHistoricoLocalV62();
  try{ renderPremiosGestaoV58?.(); }catch{}
  try{ renderHistorico?.(); }catch{}
  try{ atualizarDashboardVivoV54?.(); }catch{}
  try{ atualizarPremiosPremiumV42?.(); }catch{}
  try{ atualizarEstatisticas?.(); }catch{}

  const aviso = document.getElementById("avisoTotolotoV62");
  if(aviso) aviso.textContent = mudou
    ? "✅ V62: Totoloto recalculado. Falsos prémios/duplicados foram removidos."
    : "✅ V62: Totoloto recalculado pela chave oficial. Sem alterações necessárias.";
}

setTimeout(instalarV62, 700);
setTimeout(instalarV62, 2000);



// V63 - Totoloto render fix definitivo
function normV63(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim()}
function apostaNormV63(s){return String(s||"").replace(/\s*\+\s*/g," + ").replace(/\s+/g," ").trim()}
function baseHistV63(){try{if(typeof obterHistoricoArrayV434==="function")return obterHistoricoArrayV434()||[]}catch{}try{if(typeof obterHistoricoPremiosV41==="function")return obterHistoricoPremiosV41()||[]}catch{}try{if(Array.isArray(historico))return historico}catch{}return[]}
function isTotoV63(i){return /totoloto/i.test(String(i?.jogo||""))}
function evalTotoV63(i){try{return avaliarTotolotoV62?.(i.aposta,i.sorteio||i.dataSorteio||i.data)||null}catch{return null}}
function valorV63(i){if(isTotoV63(i)){const ev=evalTotoV63(i);return ev&&ev.temPremio&&ev.valor>0?ev.valor:0}try{return Number(i?.valorPremio||0)||valorItemSeguroV59?.(i)||0}catch{return Number(i?.valorPremio||0)||0}}
function cleanItemV63(i){if(isTotoV63(i)){const ev=evalTotoV63(i);if(ev){if(!ev.temPremio||ev.valor<=0)return null;return {...i,jogo:"Totoloto",dataSorteio:ev.data,resultado:ev.resultadoTexto,premio:`Prémio — ${ev.valor.toLocaleString("pt-PT",{style:"currency",currency:"EUR"})}`,valorPremio:ev.valor,__v63:true}}}return i}
function keyV63(i){return [normV63(i?.jogo),normV63(i?.sorteio),normV63(i?.dataSorteio||i?.data),apostaNormV63(i?.aposta),normV63(i?.resultado||i?.acertos),valorV63(i)].join("|")}
function histFiltradoV63(){const seen=new Set(),out=[];(baseHistV63()||[]).forEach(raw=>{const i=cleanItemV63(raw);if(!i)return;const k=keyV63(i);if(!seen.has(k)){seen.add(k);out.push(i)}});return out}
function limparLocalV63(){try{Object.keys(localStorage).forEach(k=>{if(!/^historicoJSC/.test(k))return;const arr=JSON.parse(localStorage.getItem(k)||"[]");if(!Array.isArray(arr))return;const seen=new Set(),clean=[];arr.forEach(raw=>{const i=cleanItemV63(raw);if(!i)return;const id=keyV63(i);if(!seen.has(id)){seen.add(id);clean.push(i)}});if(JSON.stringify(clean)!==JSON.stringify(arr))localStorage.setItem(k,JSON.stringify(clean))})}catch(e){console.warn("V63 limpar",e)}}
function histSeguroV59(){return histFiltradoV63()}
function histV58(){return histFiltradoV63()}
function histSeguroV61(){return histFiltradoV63()}
function valorItemSeguroV59(i){return valorV63(i)}
function valorItemV58(i){return valorV63(i)}
function premioIdSeguroV59(i){return keyV63(i)}
function premioIdV58(i){return keyV63(i)}
function moneyV63(n){try{return dinheiroV59(n)}catch{return Number(n||0).toLocaleString("pt-PT",{style:"currency",currency:"EUR"})}}
function parseApostaV63(a){try{return parseApostaSeguroV59?.(a)||parseApostaV58?.(a)||{nums:[],extras:[]}}catch{return{nums:[],extras:[]}}}
function renderPremiosGestaoV58(){
 const lista=histFiltradoV63(),conf=typeof confirmadosV59==="function"?confirmadosV59():{},lev=typeof levantadosV59==="function"?levantadosV59():{},filtro=document.querySelector("[data-filtro-premios-v58].active")?.dataset?.filtroPremiosV58||"todos";
 const total=lista.reduce((s,i)=>s+(conf[keyV63(i)]?valorV63(i):0),0), totalLev=lista.reduce((s,i)=>s+(lev[keyV63(i)]?valorV63(i):0),0), porConf=lista.filter(i=>!conf[keyV63(i)]).length;
 document.getElementById("premiosGestaoResumoV58")&&(premiosGestaoResumoV58.textContent=`${lista.length} prémio(s) real(is) · ${porConf} por confirmar`);
 document.getElementById("v58TotalGanho")&&(v58TotalGanho.textContent=moneyV63(total));document.getElementById("v58TotalLevantado")&&(v58TotalLevantado.textContent=moneyV63(totalLev));document.getElementById("v58TotalPorLevantar")&&(v58TotalPorLevantar.textContent=moneyV63(Math.max(0,total-totalLev)));
 const el=document.getElementById("premiosListaGestaoV58");if(!el)return;const arr=lista.filter(i=>{const id=keyV63(i),c=!!conf[id],l=!!lev[id];return filtro==="levantados"?l:filtro==="porLevantar"?c&&!l:true});
 if(!arr.length){el.innerHTML='<div class="empty-v58">Sem prémios reais neste filtro.</div>';return}
 el.innerHTML=arr.map(i=>{const id=keyV63(i),c=!!conf[id],l=!!lev[id],p=parseApostaV63(i.aposta),nums=(p.nums||[]).map(n=>`<span>${n}</span>`).join(""),extras=(p.extras||[]).map(n=>`<span class="extra">${n}</span>`).join("");return `<article class="premio-gestao-item-v58 ${l?'levantado':c?'pendente':'por-confirmar'}"><div class="premio-gestao-top-v58"><div><strong>🏆 ${i.jogo||'Jogo'} — ${moneyV63(valorV63(i))}</strong><small>${i.sorteio||''} · ${i.dataSorteio||i.data||''}</small></div><span>${l?'✅ Levantado':c?'🟡 Por levantar':'⚠️ Por confirmar'}</span></div><div class="premio-detalhe-v58"><div><b>A tua aposta</b><p class="bolas-v58">${nums}${extras?`<i>+</i>${extras}`:''}</p></div><div><b>Motivo correto</b><p>${i.resultado||'Prémio recalculado'}</p></div><div><b>Confirmação</b><p>${c?'Confirmado pelo utilizador':'Não conta até confirmares'}</p></div></div><div class="acoes-premio-v59"><button type="button" class="btn-confirmar-v59" data-id="${encodeURIComponent(id)}">${c?'Retirar confirmação':'Confirmar prémio'}</button><button type="button" class="btn-levantar-v58" data-id="${encodeURIComponent(id)}" ${!c?'disabled':''}>${l?'Marcar por levantar':'Marcar como levantado'}</button></div></article>`}).join("");
 el.querySelectorAll(".btn-confirmar-v59").forEach(b=>{if(b.__v63)return;b.__v63=true;b.addEventListener("click",()=>{const id=decodeURIComponent(b.dataset.id||"");if(typeof setConfirmadoV59==="function")setConfirmadoV59(id,!confirmadosV59()[id]);renderPremiosGestaoV58()})});
 el.querySelectorAll(".btn-levantar-v58").forEach(b=>{if(b.__v63)return;b.__v63=true;b.addEventListener("click",()=>{const id=decodeURIComponent(b.dataset.id||"");if(typeof confirmadosV59==="function"&&!confirmadosV59()[id])return;if(typeof setLevantadoV59==="function")setLevantadoV59(id,!levantadosV59()[id]);renderPremiosGestaoV58()})});
 const aviso=document.getElementById("avisoTotolotoV62");if(aviso)aviso.textContent="✅ V63: Totoloto corrigido. Sorteio 052 sem prémio foi removido; só ficam 050/051 quando há 2 números + Nº da Sorte.";
}
function notificarPremiosNovosV58(){return 0}
function instalarV63(){limparLocalV63();try{renderPremiosGestaoV58()}catch(e){console.warn('V63 gestão',e)}try{atualizarDashboardVivoV54?.()}catch{}try{atualizarPremiosPremiumV42?.()}catch{}try{atualizarEstatisticas?.()}catch{}}
setTimeout(instalarV63,700);setTimeout(instalarV63,2000);document.addEventListener('click',()=>setTimeout(instalarV63,250));



// V64 - Gestão Segura Global
window.__V64_GESTAO_SEGURA_GLOBAL = true;

function normGlobalV64(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim()}
function apostaGlobalV64(s){return String(s||"").replace(/\s*\+\s*/g," + ").replace(/\s+/g," ").trim()}
function baseHistoricoV64(){
  try{if(typeof obterHistoricoArrayV434==="function")return obterHistoricoArrayV434()||[]}catch{}
  try{if(typeof obterHistoricoPremiosV41==="function")return obterHistoricoPremiosV41()||[]}catch{}
  try{if(Array.isArray(historico))return historico}catch{}
  return []
}
function valorOriginalGlobalV64(item){
  if(/totoloto/i.test(String(item?.jogo||"")) && typeof avaliarTotolotoV62==="function"){
    const ev=avaliarTotolotoV62(item.aposta,item.sorteio||item.dataSorteio);
    if(ev&&ev.temPremio&&ev.valor>0)return ev.valor;
    if(ev)return 0;
  }
  const n=Number(item?.valorPremio||item?.valor||0);
  if(Number.isFinite(n)&&n>0)return n;
  return 0;
}
function idGlobalPremioV64(item){
  let extra="";
  if(/totoloto/i.test(String(item?.jogo||"")) && typeof avaliarTotolotoV62==="function"){
    const ev=avaliarTotolotoV62(item.aposta,item.sorteio||item.dataSorteio);
    if(ev)extra=`${ev.sorteio}|${ev.resultadoTexto}|${ev.valor}`;
  }
  return [normGlobalV64(item?.jogo),normGlobalV64(item?.sorteio),normGlobalV64(item?.dataSorteio||item?.data),apostaGlobalV64(item?.aposta),normGlobalV64(item?.resultado||item?.acertos),valorOriginalGlobalV64(item),extra].join("|");
}
function historicoFiltradoGlobalV64(){
  const out=[], seen=new Set();
  baseHistoricoV64().forEach(item=>{
    let clean=item;
    if(/totoloto/i.test(String(item?.jogo||"")) && typeof avaliarTotolotoV62==="function"){
      const ev=avaliarTotolotoV62(item.aposta,item.sorteio||item.dataSorteio);
      if(ev){
        if(!ev.temPremio||ev.valor<=0)return;
        clean={...item,jogo:"Totoloto",dataSorteio:ev.data,resultado:ev.resultadoTexto,premio:`Prémio — ${ev.valor.toLocaleString("pt-PT",{style:"currency",currency:"EUR"})}`,valorPremio:ev.valor,__recalculadoV64:true};
      }
    }
    const id=idGlobalPremioV64(clean);
    if(!seen.has(id)){seen.add(id);out.push(clean)}
  });
  return out;
}

function histSeguroV59(){return historicoFiltradoGlobalV64()}
function histV58(){return historicoFiltradoGlobalV64()}
function histSeguroV61(){return historicoFiltradoGlobalV64()}
function histTotolotoFiltradoV63(){return historicoFiltradoGlobalV64()}
function premioIdSeguroV59(item){return idGlobalPremioV64(item)}
function premioIdV58(item){return idGlobalPremioV64(item)}
function valorCandidatoV64(item){return valorOriginalGlobalV64(item)}
function valorConfirmadoV64(item){
  const conf=(typeof confirmadosV59==="function")?confirmadosV59():{};
  return conf[idGlobalPremioV64(item)]?valorOriginalGlobalV64(item):0;
}
function moedaV64(n){
  try{return dinheiroV59(n)}catch{return Number(n||0).toLocaleString("pt-PT",{style:"currency",currency:"EUR"})}
}

function renderPremiosGestaoV58(){
  const lista=historicoFiltradoGlobalV64();
  const conf=(typeof confirmadosV59==="function")?confirmadosV59():{};
  const lev=(typeof levantadosV59==="function")?levantadosV59():{};
  const filtro=document.querySelector("[data-filtro-premios-v58].active")?.dataset?.filtroPremiosV58||"todos";
  const total=lista.reduce((s,i)=>s+valorConfirmadoV64(i),0);
  const totalLev=lista.reduce((s,i)=>s+(lev[idGlobalPremioV64(i)]?valorOriginalGlobalV64(i):0),0);
  const porConfirmar=lista.filter(i=>!conf[idGlobalPremioV64(i)]).length;
  if(document.getElementById("premiosGestaoResumoV58"))premiosGestaoResumoV58.textContent=`${lista.length} candidato(s) · ${porConfirmar} por confirmar`;
  if(document.getElementById("v58TotalGanho"))v58TotalGanho.textContent=moedaV64(total);
  if(document.getElementById("v58TotalLevantado"))v58TotalLevantado.textContent=moedaV64(totalLev);
  if(document.getElementById("v58TotalPorLevantar"))v58TotalPorLevantar.textContent=moedaV64(Math.max(0,total-totalLev));
  const el=document.getElementById("premiosListaGestaoV58"); if(!el)return;
  const arr=lista.filter(i=>{const id=idGlobalPremioV64(i),c=!!conf[id],l=!!lev[id];return filtro==="levantados"?l:filtro==="porLevantar"?c&&!l:true});
  if(!arr.length){el.innerHTML='<div class="empty-v58">Sem prémios neste filtro.</div>';return}
  el.innerHTML=arr.map(item=>{
    const id=idGlobalPremioV64(item), c=!!conf[id], l=!!lev[id], val=valorCandidatoV64(item);
    let p={nums:[],extras:[]}; try{p=parseApostaSeguroV59?.(item.aposta)||parseApostaV58?.(item.aposta)||p}catch{}
    const nums=(p.nums||[]).map(n=>`<span>${n}</span>`).join("");
    const extras=(p.extras||[]).map(n=>`<span class="extra">${n}</span>`).join("");
    return `<article class="premio-gestao-item-v58 ${l?"levantado":c?"pendente":"por-confirmar"}">
      <div class="premio-gestao-top-v58"><div><strong>🏆 ${item.jogo||"Jogo"} — ${moedaV64(val)}</strong><small>${item.sorteio||""} · ${item.dataSorteio||item.data||""}</small></div><span>${l?"✅ Levantado":c?"🟡 Por levantar":"⚠️ Por confirmar"}</span></div>
      <div class="premio-detalhe-v58"><div><b>A tua aposta</b><p class="bolas-v58">${nums}${extras?`<i>+</i>${extras}`:""}</p></div><div><b>Motivo registado</b><p>${item.resultado||item.acertos||"Prémio candidato"}</p></div><div><b>Estado</b><p>${c?"Confirmado pelo utilizador":"Não conta até confirmares"}</p></div></div>
      <div class="acoes-premio-v59"><button type="button" class="btn-confirmar-v59" data-id="${encodeURIComponent(id)}">${c?"Retirar confirmação":"Confirmar prémio"}</button><button type="button" class="btn-levantar-v58" data-id="${encodeURIComponent(id)}" ${!c?"disabled":""}>${l?"Marcar por levantar":"Marcar como levantado"}</button></div>
    </article>`
  }).join("");
  el.querySelectorAll(".btn-confirmar-v59").forEach(btn=>{if(btn.__v64)return;btn.__v64=true;btn.addEventListener("click",()=>{const id=decodeURIComponent(btn.dataset.id||"");if(typeof setConfirmadoV59==="function")setConfirmadoV59(id,!confirmadosV59()[id]);if(typeof setLevantadoV59==="function"&&!confirmadosV59()[id])setLevantadoV59(id,false);renderPremiosGestaoV58();atualizarResumosSegurosV64()})});
  el.querySelectorAll(".btn-levantar-v58").forEach(btn=>{if(btn.__v64)return;btn.__v64=true;btn.addEventListener("click",()=>{const id=decodeURIComponent(btn.dataset.id||"");if(typeof confirmadosV59==="function"&&!confirmadosV59()[id])return;if(typeof setLevantadoV59==="function")setLevantadoV59(id,!levantadosV59()[id]);renderPremiosGestaoV58();atualizarResumosSegurosV64()})});
}

function atualizarResumosSegurosV64(){
  const lista=historicoFiltradoGlobalV64(), conf=(typeof confirmadosV59==="function")?confirmadosV59():{};
  const total=lista.reduce((s,i)=>s+(conf[idGlobalPremioV64(i)]?valorOriginalGlobalV64(i):0),0);
  const qtd=lista.filter(i=>conf[idGlobalPremioV64(i)]).length;
  if(document.getElementById("dvTotalGanho"))dvTotalGanho.textContent=moedaV64(total);
  if(document.getElementById("dvSequencia"))dvSequencia.textContent=`${qtd} confirmado(s)`;
  if(document.getElementById("dvFrase"))dvFrase.textContent=`Tens ${lista.length} candidato(s), ${qtd} confirmado(s) e total confirmado de ${moedaV64(total)}.`;
}

function notificarPremiosNovosV58(){return 0}
function limparAvisosTecnicosV64(){const a=document.getElementById("avisoTotolotoV62");if(a)a.remove()}
function instalarV64(){limparAvisosTecnicosV64();try{renderPremiosGestaoV58()}catch(e){console.warn("V64 gestão",e)}try{atualizarResumosSegurosV64()}catch{}}
setTimeout(instalarV64,700);setTimeout(instalarV64,2000);document.addEventListener("click",()=>setTimeout(instalarV64,250));



// V65 - Resultados com acertos destacados + remove aviso antigo

function removerAvisoPremiosV65(){
  const aviso = document.getElementById("avisoPremiosV59");
  if(aviso) aviso.remove();
}

function parseNumerosLinhaV65(txt){
  const m = String(txt||"").match(/Resultado:\s*\[([^\]]+)\]\s*\+\s*\[([^\]]+)\]/i);
  if(!m) return null;
  return {
    nums: m[1].split(/[,\s]+/).map(Number).filter(Number.isFinite),
    extras: m[2].split(/[,\s]+/).map(Number).filter(Number.isFinite)
  };
}

function parseApostaLinhaV65(txt){
  const m = String(txt||"").match(/Aposta\s*\d*\s*:\s*([0-9\s]+)(?:\+\s*([0-9\s]+))?/i);
  if(!m) return {nums:[], extras:[]};
  return {
    nums: (m[1]||"").trim().split(/\s+/).map(Number).filter(Number.isFinite),
    extras: (m[2]||"").trim().split(/\s+/).map(Number).filter(Number.isFinite)
  };
}

function bolasHtmlV65(aposta, resultado){
  const nums = (aposta.nums||[]).map(n => {
    const hit = resultado?.nums?.includes(n);
    return `<span class="bola-v65 ${hit?'hit':'miss'}">${n}</span>`;
  }).join("");
  const extras = (aposta.extras||[]).map(n => {
    const hit = resultado?.extras?.includes(n);
    return `<span class="bola-v65 extra ${hit?'hit':'miss'}">${n}</span>`;
  }).join("");
  return `${nums}${extras ? '<i class="plus-v65">+</i>' + extras : ''}`;
}

function destacarResultadosV65(){
  removerAvisoPremiosV65();

  const resultadosCards = Array.from(document.querySelectorAll(".result-card, .result-card.bad, .result-card.good, .result-card.warn"));
  resultadosCards.forEach(card => {
    if(card.__v65Done) return;

    const parentText = card.closest("section,.card,div")?.innerText || document.body.innerText || "";
    const resultado = parseNumerosLinhaV65(parentText);
    if(!resultado) return;

    const txt = card.innerText || "";
    const aposta = parseApostaLinhaV65(txt);
    if(!aposta.nums.length && !aposta.extras.length) return;

    const numsHit = aposta.nums.filter(n => resultado.nums.includes(n));
    const extrasHit = aposta.extras.filter(n => resultado.extras.includes(n));

    const destaque = document.createElement("div");
    destaque.className = "destaque-acertos-v65";
    destaque.innerHTML = `
      <div class="linha-bolas-v65">
        <b>A tua chave:</b>
        <span class="bolas-wrap-v65">${bolasHtmlV65(aposta, resultado)}</span>
      </div>
      <div class="resumo-acertos-v65">
        ${numsHit.length || extrasHit.length
          ? `Acertaste: <strong>${[...numsHit, ...extrasHit].join(", ")}</strong>`
          : `Sem números acertados`}
      </div>
    `;

    const meta = Array.from(card.querySelectorAll("br")).pop();
    card.appendChild(destaque);
    card.__v65Done = true;
  });
}

function melhorarResultadoAtualV65(){
  const sections = Array.from(document.querySelectorAll("section,.card,div"));
  sections.forEach(sec => {
    if(sec.__v65ResultadoHeader) return;
    const txt = sec.innerText || "";
    if(!/Resultado:\s*\[/.test(txt)) return;

    const resultado = parseNumerosLinhaV65(txt);
    if(!resultado) return;

    const title = Array.from(sec.querySelectorAll("strong,h3,h2")).find(x => /EUROMILHÕES|TOTOLOTO|EURODREAMS|MILHÃO|LOTO/i.test(x.textContent||""));
    if(!title) return;

    const header = document.createElement("div");
    header.className = "chave-vencedora-v65";
    header.innerHTML = `
      <b>Chave vencedora</b>
      <div class="bolas-wrap-v65">
        ${(resultado.nums||[]).map(n=>`<span class="bola-v65 winner">${n}</span>`).join("")}
        ${(resultado.extras||[]).length ? '<i class="plus-v65">+</i>' + resultado.extras.map(n=>`<span class="bola-v65 extra winner">${n}</span>`).join("") : ""}
      </div>
    `;
    title.parentElement?.insertBefore(header, title.nextSibling);
    sec.__v65ResultadoHeader = true;
  });
}

function instalarV65(){
  removerAvisoPremiosV65();
  destacarResultadosV65();
  melhorarResultadoAtualV65();
}

try{
  if(typeof verificarApostas === "function" && !verificarApostas.__v65Hook){
    const old = verificarApostas;
    verificarApostas = function(...args){
      const r = old.apply(this,args);
      setTimeout(instalarV65,300);
      setTimeout(instalarV65,900);
      return r;
    };
    verificarApostas.__v65Hook = true;
  }
}catch{}

setTimeout(instalarV65,700);
setTimeout(instalarV65,1800);
document.addEventListener("click",()=>setTimeout(instalarV65,250));



// V66 - Resultados inteligentes completos
function escV66(v){return String(v ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));}
function nomeExtraV66(data){return data?.extra_nome || jogos?.[jogoAtual]?.extraLabel || "extra";}
function arrNumsV66(v){return converterParaArray(v).map(Number).filter(Number.isFinite);}
function bolasV66(lista, acertados=[], tipo="num"){
  const hits = new Set((acertados||[]).map(Number));
  return (lista||[]).map(n=>`<span class="bola-v66 ${tipo==='extra'?'extra':''} ${hits.has(Number(n))?'hit':''}">${escV66(n)}</span>`).join("");
}
function chaveVencedoraV66(numeros, extras){
  return `<div class="chave-vencedora-v66"><div class="mini-label-v66">Chave vencedora</div><div class="bolas-wrap-v66">${bolasV66(numeros,numeros)}${extras?.length?`<i class="plus-v66">+</i>${bolasV66(extras,extras,'extra')}`:""}</div></div>`;
}
function progressoV66(acertos,total){
  const pct = total ? Math.round((acertos/total)*100) : 0;
  return `<div class="progresso-v66"><div class="progresso-info-v66"><span>Progresso dos acertos</span><b>${acertos}/${total}</b></div><div class="barra-v66"><span style="width:${pct}%"></span></div></div>`;
}
function quasePremioV66(jogo, n, e, premiado){
  if(premiado) return "";
  const regras={euromilhoes:[[2,1],[1,2],[2,0]], totoloto:[[2,0]], eurodreams:[[2,0],[1,1]]};
  const perto=(regras[jogo]||[]).some(([rn,re])=>n>=rn&&e>=re);
  if(!perto) return "";
  return `<div class="quase-premio-v66">🎯 <b>Quase prémios</b><br>Ficaste perto: ${n} número(s) + ${e} ${escV66(nomeExtraV66(window.ultimoResultadoAtual))}(s).</div>`;
}
function renderCabecalhoResultado(data, conteudo) {
  const numeros = arrNumsV66(data.numeros);
  const extras = arrNumsV66(data.extras);
  const chave = numeros.length ? chaveVencedoraV66(numeros, extras) : "";
  return `
    <div class="result-title">${escV66((data.jogo||jogos[jogoAtual]?.nome||jogoAtual).toUpperCase())}</div>
    <div class="result-meta-v66">
      <div><b>Sorteio:</b> ${escV66(data.sorteio || "último sorteio")}</div>
      <div><b>Data:</b> ${escV66(data.data || "")}</div>
      ${chave || conteudo || ""}
    </div>`;
}
function renderResultadoNumerosExtra(data) {
  const numeros = arrNumsV66(data.numeros);
  const extras = arrNumsV66(data.extras);
  const eventos = [];
  let html = renderCabecalhoResultado(data, "");
  if (!apostas[jogoAtual].length) html += `<div class="result-card warn">Sem apostas guardadas.</div>`;
  apostas[jogoAtual].forEach((aposta, index) => {
    const { nums, extras: apostaExtras } = parseAposta(aposta);
    const numsOk = nums.filter(n => numeros.includes(n));
    const extrasOk = apostaExtras.filter(e => extras.includes(e));
    const acertosNums = numsOk.length;
    const acertosExtras = extrasOk.length;
    const totalAcertos = acertosNums + acertosExtras;
    const totalPossivel = (nums?.length||0) + (apostaExtras?.length||0);
    const categoria = `${acertosNums}+${acertosExtras}`;
    const premioInfo = data.premios ? data.premios[categoria] : null;
    const premiado = !!premioInfo || categoriaTemPremio(jogoAtual, acertosNums, acertosExtras);
    let icone="🔴", titulo="SEM PRÉMIO", classe="bad", premio="", valor="";
    if (premiado) { premio = premioInfo?.premio || "Prémio"; valor = premioInfo?.valor || "valor a consultar"; icone="🏆"; titulo=`PREMIADO — ${premio} — ${valor}`; classe="ok"; }
    else if (totalAcertos) { icone="🟡"; titulo="COM ACERTOS — sem prémio"; classe="warn"; }
    if (premiado) eventos.push({jogo:data.jogo, aposta, resultado:`${acertosNums} número(s) + ${acertosExtras} ${nomeExtraV66(data)}(s)`, sorteio:data.sorteio||"último sorteio", dataSorteio:data.data||"", premio:`${premio} — ${valor}`});
    const faltaramNums = numeros.filter(n=>!nums.includes(n));
    const faltaramExtras = extras.filter(e=>!apostaExtras.includes(e));
    html += `<div class="result-card ${classe} resultado-inteligente-v66">
      <strong>${icone} ${escV66(titulo)}</strong>
      <div class="aposta-label-v66">Aposta ${index + 1}</div>
      <div class="linha-v66"><span>A tua chave</span><div class="bolas-wrap-v66">${bolasV66(nums, numsOk)}${apostaExtras.length?`<i class="plus-v66">+</i>${bolasV66(apostaExtras, extrasOk, 'extra')}`:""}</div></div>
      <div class="acertos-grid-v66">
        <div><b>Acertaste</b><p>${totalAcertos?`${[...numsOk, ...extrasOk].map(escV66).join(", ")} <small>(${acertosNums} número(s) + ${acertosExtras} ${escV66(nomeExtraV66(data))}(s))</small>`:"Nenhum número desta vez"}</p></div>
        <div><b>Faltaram</b><p>${[...faltaramNums, ...faltaramExtras].length?[...faltaramNums, ...faltaramExtras].map(escV66).join(", "):"Nada a faltar"}</p></div>
      </div>
      ${progressoV66(totalAcertos,totalPossivel)}
      ${quasePremioV66(jogoAtual, acertosNums, acertosExtras, premiado)}
    </div>`;
  });
  resultado.innerHTML = html;
  return eventos;
}
function renderResultadoCodigo(data) {
  const codigoResultado = (data.codigo || "").replace(/\s+/g, "").toUpperCase();
  const eventos = [];
  let html = renderCabecalhoResultado(data, `<div><b>Código vencedor:</b> ${escV66(codigoResultado || "não encontrado")}</div>`);
  if (!apostas[jogoAtual].length) html += `<div class="result-card warn">Sem códigos guardados.</div>`;
  apostas[jogoAtual].forEach((aposta, index) => {
    const codigo = aposta.replace(/\s+/g, "").toUpperCase();
    const premiado = codigo && codigo === codigoResultado;
    if (premiado) eventos.push({jogo:data.jogo, aposta, resultado:codigoResultado, sorteio:data.sorteio||"último sorteio", dataSorteio:data.data||"", premio:"M1lhão — valor a consultar"});
    html += `<div class="result-card ${premiado ? "ok" : "bad"} resultado-inteligente-v66"><strong>${premiado ? "🏆 PREMIADO" : "🔴 SEM PRÉMIO"}</strong><div class="aposta-label-v66">Código ${index + 1}: ${escV66(aposta)}</div>${progressoV66(premiado?1:0,1)}</div>`;
  });
  resultado.innerHTML = html; return eventos;
}
function renderResultadoLotaria(data) {
  const premios = data.premios || [];
  const numerosPremiados = premios.map(p => String(p.numero).padStart(5, "0"));
  const eventos = [];
  let listaPremios = premios.map(p => `<div><b>${escV66(p.premio)}:</b> ${escV66(p.numero)}</div>`).join("");
  let html = renderCabecalhoResultado(data, `<div class="premios-lista-v66">${listaPremios || "Prémios não encontrados"}</div>`);
  if (!apostas[jogoAtual].length) html += `<div class="result-card warn">Sem números guardados.</div>`;
  apostas[jogoAtual].forEach((aposta, index) => {
    const numero = String(aposta).padStart(5, "0");
    const pos = numerosPremiados.indexOf(numero);
    const premiado = pos >= 0;
    const premio = premiado ? premios[pos].premio : "";
    if (premiado) eventos.push({jogo:data.jogo, aposta:numero, resultado:numero, sorteio:data.sorteio||"último sorteio", dataSorteio:data.data||"", premio});
    html += `<div class="result-card ${premiado ? "ok" : "bad"} resultado-inteligente-v66"><strong>${premiado ? `🏆 PREMIADO — ${escV66(premio)}` : "🔴 SEM PRÉMIO"}</strong><div class="aposta-label-v66">Número ${index + 1}: ${escV66(numero)}</div>${progressoV66(premiado?1:0,1)}</div>`;
  });
  resultado.innerHTML = html; return eventos;
}
function instalarV66(){ removerAvisoPremiosV65?.(); document.querySelectorAll('#avisoPremiosV59,#avisoTotolotoV62,.aviso-totoloto-v62').forEach(e=>e.remove()); }
setTimeout(instalarV66,500); setTimeout(instalarV66,1500); document.addEventListener('click',()=>setTimeout(instalarV66,200));


// V67.1 - Cloud & Push / Multiutilizador / Dispositivo / Push Subscriptions
const V67_DEVICE_KEY = "jsc_v67_device_id";
let v67CloudState = {
  status: "A iniciar...",
  deviceId: null,
  deviceName: "—",
  profileReady: false,
  deviceReady: false,
  lastSync: null,
  pushReady: false,
  pushEndpoint: null,
  pushStatus: "—",
  engineStatus: "A preparar",
  engineLastRun: "—",
  engineNextRun: "—",
  engineLastNotification: "—",
  engineDevices: "—"
};

function v67Uuid() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function v67GetDeviceId() {
  let id = localStorage.getItem(V67_DEVICE_KEY);
  if (!id) {
    id = v67Uuid();
    localStorage.setItem(V67_DEVICE_KEY, id);
  }
  return id;
}

function v67DetectDeviceName() {
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
  if (/Android/i.test(ua)) return "Android / PWA";
  if (/iPhone/i.test(ua)) return "iPhone / PWA";
  if (/iPad/i.test(ua)) return "iPad / PWA";
  if (/Windows/i.test(ua) || /Win/i.test(platform)) return "Windows / Browser";
  if (/Mac/i.test(platform)) return "Mac / Browser";
  return isMobile ? "Telemóvel / PWA" : "Computador / Browser";
}

function v67CloudSetStatus(status, extra = {}) {
  v67CloudState = { ...v67CloudState, status, ...extra };
  v67RenderCloudCard();
}

function v67RenderCloudCard() {
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  const ready = v67CloudState.profileReady && v67CloudState.deviceReady;
  const pushReady = !!v67CloudState.pushReady;
  set("v67CloudBadge", ready ? (pushReady ? "Cloud + Push ativo" : "Cloud ativa") : "Cloud preparada");
  set("v67CloudStatus", v67CloudState.status || "—");
  set("v67CloudAccount", currentUser?.email || "—");
  set("v67CloudDevice", v67CloudState.deviceName || "—");
  set("v67CloudLastSync", v67CloudState.lastSync || "—");
  set("v67CloudVersion", window.APP_VERSION || "—");
  const engine = document.getElementById("v672PushEngineStatus");
  if (engine) engine.textContent = v67CloudState.engineStatus || (v67CloudState.pushReady ? "Preparado" : "A aguardar Push");
  set("v68PushEngineLastRun", v67CloudState.engineLastRun || "—");
  set("v68PushEngineNextRun", v67CloudState.engineNextRun || "—");
  set("v68PushEngineLastNotification", v67CloudState.engineLastNotification || "—");
  set("v68PushEngineDevices", v67CloudState.engineDevices || "—");
  set("v671PushCloudStatus", v67CloudState.pushStatus || (pushReady ? "Registado" : "Por registar"));
  const dot = document.getElementById("v67CloudDot");
  if (dot) dot.className = ready ? "v67-dot ok" : "v67-dot warn";
}

async function v67EnsureProfile() {
  if (!currentUser) return false;
  const payload = {
    id: currentUser.id,
    email: currentUser.email || null,
    display_name: aliasUtilizador || currentUser.email || "Utilizador",
    updated_at: new Date().toISOString()
  };
  const { error } = await supabaseClient.from(SUPABASE_V67_PROFILES).upsert(payload, { onConflict: "id", ignoreDuplicates: false });
  if (error) throw error;
  return true;
}

async function v67RegisterDevice() {
  if (!currentUser) return false;
  const deviceId = v67GetDeviceId();
  const deviceName = v67DetectDeviceName();
  v67CloudSetStatus("A registar dispositivo...", { deviceId, deviceName });
  const payload = {
    id: deviceId,
    profile_id: currentUser.id,
    device_name: deviceName,
    user_agent: navigator.userAgent || "",
    last_seen_at: new Date().toISOString()
  };
  const { error } = await supabaseClient.from(SUPABASE_V67_DEVICES).upsert(payload, { onConflict: "id" });
  if (error) throw error;
  return true;
}


function v68FormatarDataHora(valor) {
  if (!valor) return "—";
  try {
    return new Date(valor).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
  } catch { return "—"; }
}

function v68ProximaExecucaoPushEngine() {
  const agora = new Date();
  const prox = new Date(agora);
  const min = prox.getMinutes();
  prox.setSeconds(0, 0);
  prox.setMinutes(min < 30 ? 30 : 60);
  return prox.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
}

async function v68CarregarEstadoPushEngine() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from(SUPABASE_V68_PUSH_ENGINE_RUNS)
      .select("id, mode, status, game, draw_number, notification_type, notification_title, title, subscriptions_count, enabled_subscriptions, sent, skipped, disabled, failed, message, app_version, started_at, finished_at, run_id")
      .order("started_at", { ascending: false })
      .limit(1);
    if (error) throw error;
    const run = (data || [])[0];
    if (!run) {
      v67CloudSetStatus(v67CloudState.status, {
        engineStatus: v67CloudState.pushReady ? "Sem execuções" : "A aguardar Push",
        engineLastRun: "—",
        engineNextRun: v68ProximaExecucaoPushEngine(),
        engineLastNotification: "—",
        engineDevices: "—"
      });
      return;
    }
    const ok = run.status === "success";
    const titulo = run.title || run.notification_title || run.message || "Sem notificação";
    const subs = run.enabled_subscriptions ?? run.subscriptions_count ?? 0;
    const enviados = run.sent ?? 0;
    const ignorados = run.skipped ?? 0;
    const falhados = run.failed ?? 0;
    v67CloudSetStatus(v67CloudState.status, {
      engineStatus: ok ? "Online" : (run.status || "Executado"),
      engineLastRun: v68FormatarDataHora(run.finished_at || run.started_at),
      engineNextRun: v68ProximaExecucaoPushEngine(),
      engineLastNotification: titulo,
      engineDevices: `${subs} subscrição(ões) / ${enviados} enviada(s) / ${ignorados} ignorada(s) / ${falhados} falhada(s)`
    });
  } catch (e) {
    console.warn("V68 estado Push Engine indisponível:", e);
    v67CloudSetStatus(v67CloudState.status, {
      engineStatus: "Sem monitor",
      engineNextRun: v68ProximaExecucaoPushEngine()
    });
  }
}


function v671Base64UrlToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function v671SubscriptionToPayload(subscription) {
  const json = subscription.toJSON ? subscription.toJSON() : {};
  return {
    endpoint: subscription.endpoint,
    p256dh: json?.keys?.p256dh || "",
    auth: json?.keys?.auth || ""
  };
}

function v671ShortEndpoint(endpoint) {
  if (!endpoint) return "—";
  const s = String(endpoint);
  if (s.length <= 34) return s;
  return s.slice(0, 18) + "…" + s.slice(-12);
}

function v671AtualizarModalPushCloud(msg = "") {
  const pushEl = document.getElementById("notifModalPushCloud");
  const endpointEl = document.getElementById("notifModalEndpoint");
  if (pushEl) pushEl.textContent = v67CloudState.pushStatus || (v67CloudState.pushReady ? "Registado" : "Por registar");
  if (endpointEl) endpointEl.textContent = v671ShortEndpoint(v67CloudState.pushEndpoint);
  const status = document.getElementById("v671PushCloudStatus");
  if (status) status.textContent = v67CloudState.pushStatus || (v67CloudState.pushReady ? "Registado" : "Por registar");
  if (msg) atualizarMiniNotificacoesV37?.(msg);
}

async function v671ObterPushSubscriptionAtual() {
  const reg = await obterServiceWorkerV37();
  if (!reg || !reg.pushManager) return null;
  return await reg.pushManager.getSubscription();
}

async function v671RegistarPushCloud() {
  if (!currentUser) {
    v67CloudSetStatus("Inicia sessão para registar Push.", { pushReady: false, pushStatus: "Sem sessão" });
    v671AtualizarModalPushCloud("Inicia sessão para registar Push Cloud.");
    return false;
  }
  if (!notifSuportadasV37()) {
    v67CloudSetStatus("Este browser não suporta Push.", { pushReady: false, pushStatus: "Sem suporte" });
    v671AtualizarModalPushCloud("Este browser não suporta Push Notifications.");
    return false;
  }
  if (Notification.permission !== "granted") {
    const permissao = await Notification.requestPermission();
    if (permissao !== "granted") {
      v67CloudSetStatus("Push não autorizado.", { pushReady: false, pushStatus: "Sem permissão" });
      v671AtualizarModalPushCloud("Tens de permitir notificações primeiro.");
      return false;
    }
    localStorage.setItem("jsc_notificacoes", "1");
  }

  await v67EnsureProfile();
  await v67RegisterDevice();

  const reg = await obterServiceWorkerV37();
  if (!reg || !reg.pushManager) throw new Error("Service Worker/PushManager indisponível.");

  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: v671Base64UrlToUint8Array(V67_1_VAPID_PUBLIC_KEY)
    });
  }

  const sub = v671SubscriptionToPayload(subscription);
  if (!sub.endpoint || !sub.p256dh || !sub.auth) throw new Error("Subscription incompleta.");

  const payload = {
    profile_id: currentUser.id,
    device_id: v67GetDeviceId(),
    endpoint: sub.endpoint,
    p256dh: sub.p256dh,
    auth: sub.auth,
    enabled: true,
    updated_at: new Date().toISOString()
  };
  const { error } = await supabaseClient.from(SUPABASE_V67_PUSH_SUBSCRIPTIONS).upsert(payload, { onConflict: "endpoint" });
  if (error) throw error;

  v67CloudSetStatus("Push Cloud registado", {
    profileReady: true,
    deviceReady: true,
    pushReady: true,
    pushEndpoint: sub.endpoint,
    pushStatus: "Registado",
    lastSync: agoraPt()
  });
  localStorage.setItem("jsc_push_cloud_registado", "1");
  localStorage.setItem("jsc_push_endpoint", sub.endpoint);
  v671AtualizarModalPushCloud("Push Cloud registado neste dispositivo. O GitHub Actions já pode enviar Push com a app fechada.");
  return true;
}

async function v671SincronizarEstadoPushCloudSilencioso() {
  try {
    const sub = await v671ObterPushSubscriptionAtual();
    if (sub) {
      v67CloudState.pushReady = localStorage.getItem("jsc_push_cloud_registado") === "1";
      v67CloudState.pushEndpoint = sub.endpoint;
      v67CloudState.pushStatus = v67CloudState.pushReady ? "Registado" : "Local ativo";
    } else {
      v67CloudState.pushReady = false;
      v67CloudState.pushEndpoint = null;
      v67CloudState.pushStatus = estadoNotificacoesV37() === "granted" ? "Por registar" : "Desativado";
    }
    v67RenderCloudCard();
    v671AtualizarModalPushCloud();
  } catch (e) {
    v67CloudState.pushStatus = "Erro Push";
    v67RenderCloudCard();
  }
}

async function v67CloudInit() {
  if (!currentUser || !supabaseClient) return;
  v67CloudSetStatus("A ligar ao Supabase...", { deviceName: v67DetectDeviceName() });
  try {
    await v67EnsureProfile();
    v67CloudSetStatus("Perfil cloud criado/atualizado.", { profileReady: true });
    await v67RegisterDevice();
    v67CloudSetStatus("Sincronizado", {
      profileReady: true,
      deviceReady: true,
      lastSync: agoraPt()
    });
    await v671SincronizarEstadoPushCloudSilencioso();
    await v68CarregarEstadoPushEngine();
  } catch (err) {
    console.warn("V67 Cloud Foundation indisponível:", err);
    v67CloudSetStatus("Cloud parcial: " + (err.message || "erro desconhecido"), {
      profileReady: false,
      deviceReady: false,
      lastSync: agoraPt()
    });
  }
}

function v67BindCloudButtons() {
  const btn = document.getElementById("v67CloudSyncBtn");
  if (btn && !btn.dataset.v67bound) {
    btn.dataset.v67bound = "1";
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      const old = btn.textContent;
      btn.textContent = "A ligar...";
      await v67CloudInit();
      btn.textContent = old;
      btn.disabled = false;
    });
  }
  const btnPush = document.getElementById("v671PushRegisterBtn");
  if (btnPush && !btnPush.dataset.v671bound) {
    btnPush.dataset.v671bound = "1";
    btnPush.addEventListener("click", async () => {
      btnPush.disabled = true;
      const old = btnPush.textContent;
      btnPush.textContent = "A registar...";
      try { await v671RegistarPushCloud(); } catch(e) { console.warn(e); v671AtualizarModalPushCloud("Erro ao registar Push Cloud: " + (e.message || e)); }
      btnPush.textContent = old;
      btnPush.disabled = false;
    });
  }
  const btnDevice = document.getElementById("v67CloudDeviceBtn");
  if (btnDevice && !btnDevice.dataset.v67bound) {
    btnDevice.dataset.v67bound = "1";
    btnDevice.addEventListener("click", async () => {
      localStorage.removeItem(V67_DEVICE_KEY);
      await v67CloudInit();
    });
  }
}

setTimeout(() => {
  try {
    v67BindCloudButtons();
    v67RenderCloudCard();
    v68CarregarEstadoPushEngine?.();
  } catch(e) { console.warn(e); }
}, 250);


// V71/V72.1 - Centro de Estatísticas Inteligentes universal por jogo
function v71FormatPct(n){return `${Math.round((Number(n)||0)*100)}%`}
function v71Moeda(n){return Number(n||0).toLocaleString("pt-PT",{style:"currency",currency:"EUR"})}
function v71ParseNums(v){
  if(Array.isArray(v)) return v.map(Number).filter(Number.isFinite);
  if(v==null) return [];
  try{const j=JSON.parse(v); if(Array.isArray(j)) return j.map(Number).filter(Number.isFinite)}catch{}
  return String(v).split(/[\s,;|+\-]+/).map(Number).filter(Number.isFinite);
}
function v71Top(map,limit=10){return [...map.entries()].sort((a,b)=>b[1]-a[1]||a[0]-b[0]).slice(0,limit)}
function v71AddCounts(map, nums){nums.forEach(n=>map.set(n,(map.get(n)||0)+1))}
function v71Set(id,txt){const el=document.getElementById(id); if(el) el.textContent=txt}
function v71NomeJogo(id){return jogos?.[id]?.nome || ({euromilhoes:"EuroMilhões",totoloto:"Totoloto",eurodreams:"EuroDreams",milhao:"Milhão",lotaria_classica:"Lotaria Clássica",lotaria_popular:"Lotaria Popular"}[id]) || id || "Todos"}
function v71FiltroJogo(){return document.getElementById("v71GameFilter")?.value || "todos"}
function v71MaxNumeroPorJogo(jogo){return jogo==="totoloto"?49:(jogo==="eurodreams"?40:50)}
function v71BarList(id, data, label="x"){
  const el=document.getElementById(id); if(!el) return;
  const max=Math.max(1,...data.map(x=>x[1]||0));
  el.innerHTML=data.length?data.map(([n,c],idx)=>`<div class="v71-row premium-row" style="--w:${Math.max(4,Math.round(c/max*100))}%"><div class="v71-row-head"><b><small>#${idx+1}</small> ${n}</b><span>${c}${label}</span></div><div class="v71-track" aria-label="${n}: ${c}${label}"><i></i></div></div>`).join(""):`<div class="v71-empty">Sem dados suficientes.</div>`;
}
function v71Heat(id, data, maxN=50){
  const el=document.getElementById(id); if(!el) return;
  const map=new Map(data); const max=Math.max(1,...[...map.values()]);
  const chips=[];
  for(let i=1;i<=maxN;i++){const c=map.get(i)||0; const lvl=Math.min(5,Math.ceil(c/max*5)||0); chips.push(`<span class="v71-chip level-${lvl}" title="Número ${i}: ${c} ocorrência(s)"><b>${i}</b><small>${c}</small></span>`)}
  el.innerHTML=chips.join("");
}
function v71ApostasLocais(jogoFiltro="todos"){
  const out=[];
  try{Object.entries(apostas||{}).forEach(([j,l])=>{
    if(jogoFiltro!=="todos" && j!==jogoFiltro) return;
    (l||[]).forEach(a=>out.push({jogo:j,aposta:a}))
  })}catch{}
  return out;
}
function v71StatsFromApostas(jogoFiltro="todos"){
  const nums=new Map(), extras=new Map(), jogosMap=new Map(); let pares=0, impares=0, baixos=0, altos=0, soma=0, totalNums=0;
  const lista=v71ApostasLocais(jogoFiltro);
  for(const a of lista){
    jogosMap.set(a.jogo,(jogosMap.get(a.jogo)||0)+1);
    const p=String(a.aposta||"").split("+");
    const ns=v71ParseNums(p[0]); const ex=v71ParseNums(p[1]);
    v71AddCounts(nums,ns); v71AddCounts(extras,ex);
    ns.forEach(n=>{totalNums++; soma+=n; n%2?impares++:pares++; n<=25?baixos++:altos++;});
  }
  return {nums,extras,jogos:jogosMap,pares,impares,baixos,altos,soma,totalNums,apostas:lista.length,fonte:"apostas",jogoFiltro};
}
async function v71StatsFromCloud(jogoFiltro="todos"){
  if(!supabaseClient) return null;
  try{
    let q=supabaseClient.from("draw_results").select("game,draw_number,draw_date,numbers,stars,created_at,updated_at").order("draw_date",{ascending:false}).limit(500);
    if(jogoFiltro!=="todos") q=q.eq("game",jogoFiltro);
    const {data,error}=await q;
    if(error) throw error;
    if(!data?.length) return null;
    const nums=new Map(), extras=new Map(), jogosMap=new Map(); let pares=0,impares=0,baixos=0,altos=0,soma=0,totalNums=0;
    data.forEach(r=>{
      jogosMap.set(r.game,(jogosMap.get(r.game)||0)+1);
      const ns=v71ParseNums(r.numbers); const ex=v71ParseNums(r.stars);
      v71AddCounts(nums,ns); v71AddCounts(extras,ex);
      ns.forEach(n=>{totalNums++; soma+=n; n%2?impares++:pares++; n<=25?baixos++:altos++;});
    });
    return {nums,extras,jogos:jogosMap,pares,impares,baixos,altos,soma,totalNums,concursos:data.length,fonte:"resultados",jogoFiltro};
  }catch(e){console.warn("V71 cloud stats indisponíveis",e);return null;}
}
function v71Insight(stats){
  const top=v71Top(stats.nums,3).map(x=>x[0]).join(", ")||"—";
  const jogoTxt=stats.jogoFiltro&&stats.jogoFiltro!=="todos"?` para ${v71NomeJogo(stats.jogoFiltro)}`:" em todos os jogos";
  const maxN=stats.jogoFiltro&&stats.jogoFiltro!=="todos"?v71MaxNumeroPorJogo(stats.jogoFiltro):50;
  const atrasados=[];
  for(let i=1;i<=maxN;i++) if(!stats.nums.has(i)) atrasados.push(i);
  const media=stats.totalNums?Math.round(stats.soma/stats.totalNums):0;
  const parPct=(stats.pares+stats.impares)?stats.pares/(stats.pares+stats.impares):0;
  const fonte=stats.fonte==="resultados"?`${stats.concursos} resultado(s) oficial(is)${jogoTxt}`:`${stats.apostas} aposta(s) guardada(s)${jogoTxt}`;
  const jogosResumo=v71Top(stats.jogos,5).map(([j,c])=>`${v71NomeJogo(j)} (${c})`).join(", ");
  const base = [];
  base.push(`A análise premium processou ${fonte}. Podes alternar entre “Todos” e cada jogo para comparar padrões.`);
  if(stats.jogoFiltro==="todos" && jogosResumo) base.push(`Distribuição por jogo na amostra: ${jogosResumo}.`);
  base.push(top!=="—" ? `Os números com maior destaque nesta amostra são ${top}. Isto não prevê o futuro, mas ajuda a perceber o comportamento recente.` : `Ainda não existem dados suficientes para destacar números com confiança.`);
  base.push(media ? `A soma média das chaves analisadas está em ${media}, com distribuição ${v71FormatPct(parPct)} pares / ${v71FormatPct(1-parPct)} ímpares.` : `A soma média ainda não está disponível.`);
  base.push(atrasados.length ? `Números com presença muito baixa nesta amostra: ${atrasados.slice(0,8).join(", ")}.` : `Todos os números apareceram pelo menos uma vez na amostra analisada.`);
  return base;
}
function v71AtualizarFiltroJogos(stats){
  const sel=document.getElementById("v71GameFilter"); if(!sel) return;
  const atual=sel.value || "todos";
  const jogosDisponiveis=[...stats.jogos.keys()].sort((a,b)=>v71NomeJogo(a).localeCompare(v71NomeJogo(b),'pt-PT'));
  const fixos=["euromilhoes","totoloto","eurodreams","milhao"].filter(j=>jogosDisponiveis.includes(j));
  const restantes=jogosDisponiveis.filter(j=>!fixos.includes(j));
  const opts=["todos",...fixos,...restantes];
  sel.innerHTML=opts.map(j=>`<option value="${j}" ${j===atual?"selected":""}>${j==="todos"?"Todos os jogos":v71NomeJogo(j)}</option>`).join("");
  if(!opts.includes(atual)) sel.value="todos";
}
async function atualizarCentroEstatisticasV71(){
  const filtro=v71FiltroJogo();
  const cloud=await v71StatsFromCloud(filtro);
  const stats=cloud||v71StatsFromApostas(filtro);
  const agregadas=await v71StatsFromCloud("todos") || v71StatsFromApostas("todos");
  v71AtualizarFiltroJogos(agregadas);
  const totalBase=stats.fonte==="resultados"?stats.concursos:stats.apostas;
  const filtroTxt=filtro==="todos"?"todos os jogos":v71NomeJogo(filtro);
  v71Set("v71Resumo",`${totalBase||0} item(ns) — ${filtroTxt}`);
  v71Set("v71Fonte",stats.fonte==="resultados"?"Resultados oficiais na cloud":"Apostas guardadas neste dispositivo");
  v71Set("v71SomaMedia",stats.totalNums?String(Math.round(stats.soma/stats.totalNums)):"—");
  v71Set("v71ParImpar",(stats.pares+stats.impares)?`${v71FormatPct(stats.pares/(stats.pares+stats.impares))} / ${v71FormatPct(stats.impares/(stats.pares+stats.impares))}`:"—");
  v71Set("v71BaixoAlto",(stats.baixos+stats.altos)?`${v71FormatPct(stats.baixos/(stats.baixos+stats.altos))} / ${v71FormatPct(stats.altos/(stats.baixos+stats.altos))}`:"—");
  const topJogo=v71Top(stats.jogos,1)[0];
  v71Set("v71JogoTop",filtro!=="todos"?v71NomeJogo(filtro):(topJogo?`${v71NomeJogo(topJogo[0])} (${topJogo[1]})`:"—"));
  v71BarList("v71NumerosQuentes",v71Top(stats.nums,10),"x");
  const maxN=filtro!=="todos"?v71MaxNumeroPorJogo(filtro):50;
  const frios=[]; for(let i=1;i<=maxN;i++) frios.push([i,stats.nums.get(i)||0]);
  v71BarList("v71NumerosFrios",frios.sort((a,b)=>a[1]-b[1]||a[0]-b[0]).slice(0,10),"x");
  v71BarList("v71Estrelas",v71Top(stats.extras,10),"x");
  v71Heat("v71Heatmap",v71Top(stats.nums,maxN),maxN);
  const heatTitle=document.getElementById("v71HeatTitle"); if(heatTitle) heatTitle.textContent=`🔥 Heatmap premium 1–${maxN}`;
  const ins=document.getElementById("v71Insights"); if(ins) ins.innerHTML=v71Insight(stats).map(t=>`<div class="v71-insight">${t}</div>`).join("");
}
function instalarV71(){
  const sel=document.getElementById("v71GameFilter");
  if(sel && !sel.dataset.v71bound){ sel.dataset.v71bound="1"; sel.addEventListener("change",()=>atualizarCentroEstatisticasV71()); }
  setTimeout(()=>atualizarCentroEstatisticasV71(),700);
  setTimeout(()=>atualizarCentroEstatisticasV71(),2500);
  document.addEventListener("click",()=>setTimeout(()=>atualizarCentroEstatisticasV71(),300));
}
instalarV71();


// V72 - Premium Experience
function instalarV72Premium(){
  document.documentElement.classList.add('v72-premium');
  const badge=document.getElementById('v71Resumo');
  if(badge && !badge.dataset.v72){ badge.dataset.v72='1'; badge.title='Centro estatístico premium atualizado automaticamente'; }
}
instalarV72Premium();


// V73 - Dashboard Inteligente + Sugestões
function v73Set(id, html){ const el=document.getElementById(id); if(el) el.innerHTML = html; }
function v73Text(id, txt){ const el=document.getElementById(id); if(el) el.textContent = txt; }
function v73NomeJogo(id){
  return (typeof jogos !== 'undefined' && jogos?.[id]?.nome) || ({euromilhoes:'EuroMilhões',totoloto:'Totoloto',eurodreams:'EuroDreams',milhao:'M1lhão',joker:'Joker',lotaria_classica:'Lotaria Clássica',lotaria_popular:'Lotaria Popular'}[id]) || id || 'Jogo';
}
function v73Saudacao(){ const h=new Date().getHours(); return h<12?'Bom dia':(h<20?'Boa tarde':'Boa noite'); }
function v73ParseNums(v){
  if(Array.isArray(v)) return v.map(Number).filter(Number.isFinite);
  if(v==null) return [];
  try{ const j=JSON.parse(v); if(Array.isArray(j)) return j.map(Number).filter(Number.isFinite); }catch{}
  return String(v).split(/[\s,;|+\-]+/).map(Number).filter(Number.isFinite);
}
function v73GameToday(d=new Date()){
  const p=new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Lisbon',weekday:'short'}).format(d).toLowerCase();
  if(p.startsWith('tue')||p.startsWith('fri')) return {id:'euromilhoes',nome:'EuroMilhões',hora:'20:00'};
  if(p.startsWith('wed')||p.startsWith('sat')) return {id:'totoloto',nome:'Totoloto',hora:'20:00'};
  if(p.startsWith('mon')||p.startsWith('thu')) return {id:'eurodreams',nome:'EuroDreams',hora:'20:00'};
  return null;
}
function v73NextDraw(){
  const now=new Date();
  const dias=[
    {day:1,id:'eurodreams',nome:'EuroDreams',hora:'20:00'},
    {day:2,id:'euromilhoes',nome:'EuroMilhões',hora:'20:00'},
    {day:3,id:'totoloto',nome:'Totoloto',hora:'20:00'},
    {day:4,id:'eurodreams',nome:'EuroDreams',hora:'20:00'},
    {day:5,id:'euromilhoes',nome:'EuroMilhões',hora:'20:00'},
    {day:6,id:'totoloto',nome:'Totoloto',hora:'20:00'}
  ];
  const local=new Date(now.toLocaleString('en-US',{timeZone:'Europe/Lisbon'}));
  let best=null;
  for(let add=0; add<8; add++){
    const d=new Date(local); d.setDate(local.getDate()+add);
    const dow=d.getDay();
    for(const item of dias.filter(x=>x.day===dow)){
      const [hh,mm]=item.hora.split(':').map(Number);
      const target=new Date(d); target.setHours(hh,mm,0,0);
      if(target>local){ best={...item,date:target}; break; }
    }
    if(best) break;
  }
  return best;
}
function v73TempoRestante(target){
  if(!target) return '—';
  const local=new Date(new Date().toLocaleString('en-US',{timeZone:'Europe/Lisbon'}));
  let ms=target-local; if(ms<0) ms=0;
  const dias=Math.floor(ms/86400000); ms-=dias*86400000;
  const horas=Math.floor(ms/3600000); ms-=horas*3600000;
  const mins=Math.floor(ms/60000);
  if(dias>0) return `${dias}d ${horas}h`;
  if(horas>0) return `${horas}h ${mins}m`;
  return `${mins}m`;
}
function v73ApostasResumo(){
  let total=0, jogosMap=new Map();
  try{ Object.entries(apostas||{}).forEach(([j,l])=>{ const n=(l||[]).length; total+=n; if(n) jogosMap.set(j,n); }); }catch{}
  const top=[...jogosMap.entries()].sort((a,b)=>b[1]-a[1])[0];
  return {total, topJogo: top ? `${v73NomeJogo(top[0])} (${top[1]})` : '—'};
}
async function v73CloudResumo(){
  const out={push:'—',cloud:'—',lastRun:'—',lastResult:'—'};
  try{ out.push=document.getElementById('v672PushEngineStatus')?.textContent?.trim() || '—'; }catch{}
  try{ out.cloud=document.getElementById('v67CloudStatus')?.textContent?.trim() || '—'; }catch{}
  try{ out.lastRun=document.getElementById('v68PushEngineLastRun')?.textContent?.trim() || '—'; }catch{}
  try{
    if(window.supabaseClient){
      const {data}=await supabaseClient.from('draw_results').select('game,draw_number,draw_date').order('draw_date',{ascending:false}).limit(1);
      if(data?.[0]) out.lastResult=`${v73NomeJogo(data[0].game)} — ${data[0].draw_number || data[0].draw_date || 'último'}`;
    }
  }catch(e){ console.warn('V73 last result indisponível', e); }
  return out;
}
function v73SugestaoAleatoria(jogo='euromilhoes'){
  const maxN=jogo==='totoloto'?49:(jogo==='eurodreams'?40:50);
  const qtd=jogo==='eurodreams'?6:5;
  const maxExtra=jogo==='totoloto'?13:(jogo==='eurodreams'?5:12);
  const qtdExtra=jogo==='totoloto'?1:(jogo==='eurodreams'?1:2);
  const pick=(max,qtd)=>{ const s=new Set(); while(s.size<qtd) s.add(1+Math.floor(Math.random()*max)); return [...s].sort((a,b)=>a-b); };
  return {nums:pick(maxN,qtd), extras:pick(maxExtra,qtdExtra)};
}
async function v73SugestaoEstatistica(jogo='euromilhoes'){
  try{
    if(window.supabaseClient){
      const {data}=await supabaseClient.from('draw_results').select('numbers,stars,game').eq('game',jogo).limit(250);
      if(data?.length){
        const nums=new Map(), extras=new Map();
        data.forEach(r=>{ v73ParseNums(r.numbers).forEach(n=>nums.set(n,(nums.get(n)||0)+1)); v73ParseNums(r.stars).forEach(n=>extras.set(n,(extras.get(n)||0)+1)); });
        const maxN=jogo==='totoloto'?49:(jogo==='eurodreams'?40:50), qtd=jogo==='eurodreams'?6:5;
        const maxE=jogo==='totoloto'?13:(jogo==='eurodreams'?5:12), qtdE=jogo==='totoloto'?1:(jogo==='eurodreams'?1:2);
        const top=(map,max,qtd)=>{
          const arr=[]; for(let i=1;i<=max;i++) arr.push([i,map.get(i)||0]);
          // mistura quente e frio para não ser só "top": metade frequentes, metade atrasados
          const hot=arr.slice().sort((a,b)=>b[1]-a[1]||a[0]-b[0]).slice(0,Math.ceil(qtd/2)).map(x=>x[0]);
          const cold=arr.slice().sort((a,b)=>a[1]-b[1]||a[0]-b[0]).filter(x=>!hot.includes(x[0])).slice(0,qtd-hot.length).map(x=>x[0]);
          return [...hot,...cold].sort((a,b)=>a-b);
        };
        return {nums:top(nums,maxN,qtd), extras:top(extras,maxE,qtdE), fonte:`${data.length} resultado(s)`};
      }
    }
  }catch(e){ console.warn('V73 sugestão estatística indisponível', e); }
  return {...v73SugestaoAleatoria(jogo), fonte:'aleatória controlada'};
}
function v73RenderSugestao(tipo, jogo, sug){
  const nums=sug.nums.map(n=>`<span>${n}</span>`).join('');
  const extras=sug.extras.map(n=>`<span class="extra">${n}</span>`).join('');
  v73Set('v73SugestaoChave', `<div class="v73-bolas">${nums}</div><div class="v73-bolas v73-extras">${extras}</div>`);
  const label=tipo==='estatistica'?'Estatística':'Equilibrada';
  v73Text('v73SugestaoMeta', `${label} — ${v73NomeJogo(jogo)} · ${sug.fonte || 'gerada agora'}`);
}
async function v73GerarSugestao(tipo='estatistica'){
  const jogo=document.getElementById('v73SugestaoJogo')?.value || v73NextDraw()?.id || 'euromilhoes';
  const sug=tipo==='aleatoria' ? v73SugestaoAleatoria(jogo) : await v73SugestaoEstatistica(jogo);
  v73RenderSugestao(tipo,jogo,sug);
}
async function atualizarDashboardInteligenteV73(){
  const prox=v73NextDraw(); const hoje=v73GameToday(); const ap=v73ApostasResumo(); const cl=await v73CloudResumo();
  const nomeV73 = (aliasUtilizador || currentUser?.email?.split('@')?.[0] || 'Paulo');
  v73Text('v73Greeting', `${v73Saudacao()}, ${nomeV73} 👋`);
  v73Text('v73ProximoJogo', prox ? prox.nome : 'Sem sorteio próximo');
  v73Text('v73ProximoTempo', prox ? `Faltam ${v73TempoRestante(prox.date)} · ${prox.hora}` : '—');
  v73Text('v73Hoje', hoje ? `Hoje há ${hoje.nome}` : 'Hoje sem sorteio principal');
  v73Text('v73ApostasAtivas', String(ap.total || 0));
  v73Text('v73ApostasMeta', ap.topJogo !== '—' ? `Mais usado: ${ap.topJogo}` : 'Regista apostas para alimentar a IA.');
  v73Text('v73CloudResumo', cl.cloud || '—');
  v73Text('v73PushResumo', cl.push || '—');
  v73Text('v73UltimoResultado', cl.lastResult || '—');
  v73Text('v73UltimaExecucao', cl.lastRun || '—');
  const frase = hoje ? `Hoje é dia de ${hoje.nome}. O Assistente vai acompanhar o Push Engine e avisar-te se houver novidades.` : `O próximo destaque é ${prox?.nome || 'o próximo sorteio'}. Tudo fica preparado para receber resultados e notificações automaticamente.`;
  v73Text('v73Insight', frase);
}
function instalarV73(){
  document.documentElement.classList.add('v73-dashboard');
  const sel=document.getElementById('v73SugestaoJogo');
  if(sel && !sel.dataset.v73){ sel.dataset.v73='1'; sel.addEventListener('change',()=>v73GerarSugestao('estatistica')); }
  const b1=document.getElementById('v73GerarEstatistica'); if(b1 && !b1.dataset.v73){ b1.dataset.v73='1'; b1.addEventListener('click',()=>v73GerarSugestao('estatistica')); }
  const b2=document.getElementById('v73GerarAleatoria'); if(b2 && !b2.dataset.v73){ b2.dataset.v73='1'; b2.addEventListener('click',()=>v73GerarSugestao('aleatoria')); }
  setTimeout(()=>{ atualizarDashboardInteligenteV73(); v73GerarSugestao('estatistica'); },700);
  setTimeout(()=>{ atualizarDashboardInteligenteV73(); },2500);
  setInterval(()=>{ atualizarDashboardInteligenteV73(); },60000);
  document.addEventListener('click',()=>setTimeout(()=>atualizarDashboardInteligenteV73(),400));
}
instalarV73();


// V74 — Interface Limpa / Definições
(function initV74SettingsPanel(){
  function ready(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(() => {
    const btn = document.getElementById('settingsToggleV74');
    const close = document.getElementById('settingsCloseV74');
    const panel = document.getElementById('settingsPanelV74');
    if (!btn || !panel) return;

    const openPanel = () => {
      panel.hidden = false;
      panel.classList.add('v74-settings-open');
      try { panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch { panel.scrollIntoView(); }
    };

    const closePanel = () => {
      panel.classList.remove('v74-settings-open');
      panel.hidden = true;
    };

    btn.addEventListener('click', () => {
      if (panel.hidden) openPanel();
      else closePanel();
    });

    if (close) close.addEventListener('click', closePanel);
  });
})();


// V74.2 — topo compacto e painéis expansíveis
(function initV742CompactPanels(){
  function ready(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function(){
    document.body.classList.add('v742');

    // Guardar alias automaticamente ao sair do campo ou pressionar Enter.
    const alias = document.getElementById('aliasUtilizador');
    const aliasBtn = document.getElementById('guardarAliasBtn');
    if (alias && aliasBtn) {
      alias.addEventListener('change', () => aliasBtn.click());
      alias.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          aliasBtn.click();
          alias.blur();
        }
      });
    }

    const panels = [
      ['dashboardVivoCard', '🍀 Dashboard Vivo', false],
      ['dashboardBox', '📊 Dashboard', true],
      ['dashboardPremium', '🎲 Centro de Sorte', true],
      ['premiosPremium', '🏆 Prémios Premium', true],
      ['perfilApostador', '👤 Perfil do Apostador', true],
      ['estatisticasAvancadas', '📊 Estatísticas', true],
      ['graficosV54Card', '📈 Gráficos', true],
      ['numerosV54Card', '🔢 Números da Sorte', true],
      ['estatisticasInteligentes', '🧠 Estatísticas Inteligentes', true]
    ];

    panels.forEach(([id, title, collapsed]) => {
      const section = document.getElementById(id);
      if (!section || section.dataset.v742Ready === '1') return;
      section.dataset.v742Ready = '1';
      section.classList.add('v742-panel');
      if (collapsed) section.classList.add('v742-collapsed');

      const bar = document.createElement('button');
      bar.type = 'button';
      bar.className = 'v742-panel-toggle';
      bar.innerHTML = `<span>${title}</span><b>${collapsed ? 'Abrir' : 'Fechar'}</b>`;
      bar.addEventListener('click', () => {
        const isCollapsed = section.classList.toggle('v742-collapsed');
        bar.querySelector('b').textContent = isCollapsed ? 'Abrir' : 'Fechar';
      });
      section.insertBefore(bar, section.firstChild);
    });
  });
})();



// V75.4 — Navegação final por páginas (isolamento real)
(function initV754FinalNavigation(){
  function ready(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  const PAGE_ORDER = ['home','apostas','premios','estatisticas','perfil','definicoes'];
  const PAGE_LABELS = {
    home: 'Home', apostas: 'Apostas', premios: 'Prémios', estatisticas: 'Estatísticas', perfil: 'Perfil', definicoes: 'Definições'
  };

  function byId(id){ return document.getElementById(id); }
  function unique(list){ return Array.from(new Set((list || []).filter(Boolean))); }

  function getResultsSections(){
    const results = Array.from(document.querySelectorAll('section.results'));
    return {
      resultados: results.find(sec => sec.querySelector('#resultado')) || results[0] || null,
      historico: results.find(sec => sec.querySelector('#historico')) || results[1] || null
    };
  }

  function getGroups(){
    const gameTabs = byId('tabs');
    const gameCard = document.querySelector('section.game-card');
    const { resultados, historico } = getResultsSections();

    return {
      home: [
        byId('dashboardInteligenteV73'),
        byId('sugestoesInteligentesV73'),
        byId('dashboardVivoCard')
      ],
      apostas: [
        gameTabs,
        gameCard,
        resultados
      ],
      premios: [
        byId('premiosGestaoV58Card'),
        byId('statsBox'),
        historico
      ],
      estatisticas: [
        byId('centroEstatisticasV71'),
        byId('estatisticasAvancadas'),
        byId('graficosV54Card'),
        byId('numerosV54Card'),
        byId('estatisticasInteligentes')
      ],
      perfil: [
        byId('perfilApostador'),
        byId('dashboardPremium'),
        byId('premiosPremium')
      ],
      definicoes: [
        byId('settingsPanelV74')
      ]
    };
  }


  function normalizePageDomV76(){
    const settings = byId('settingsPanelV74');
    const premios = byId('premiosGestaoV58Card');
    const dashboard = byId('dashboardBox');
    if (settings && premios && settings.contains(premios)) {
      settings.insertAdjacentElement('afterend', premios);
    }
    // Remove toggles/linhas herdadas das V74/V75 que ficavam vazias entre páginas.
    document.querySelectorAll('.v742-panel-toggle, .v75-empty-strip').forEach(el => el.remove());
    document.querySelectorAll('#appBox > br').forEach(el => el.remove());
    if (dashboard && dashboard.parentElement && dashboard.nextElementSibling && dashboard.nextElementSibling.id === 'dashboardPremium') {
      // Mantém a ordem real dos blocos estável; a visibilidade é controlada em showPage().
    }
  }

  function cleanLegacyPanels(){
    document.body.classList.remove('v742');
    document.querySelectorAll('.v742-panel-toggle').forEach(el => el.remove());
    document.querySelectorAll('.v742-panel, .v742-collapsed').forEach(el => {
      el.classList.remove('v742-panel','v742-collapsed');
      delete el.dataset.v742Ready;
    });
  }

  function prepare(){
    const appBox = byId('appBox');
    const nav = byId('v75AppNav');
    if (!appBox || !nav) return null;

    cleanLegacyPanels();
    normalizePageDomV76();

    // Limpa marcas antigas das V75.x anteriores.
    document.querySelectorAll('.v75-page-section,.v754-managed,.v754-visible').forEach(el => {
      el.classList.remove('v75-page-section','v75-page-active','v754-managed','v754-visible');
      delete el.dataset.v75Page;
      el.hidden = false;
      el.style.display = '';
    });

    const groups = getGroups();
    const managed = unique(Object.values(groups).flat());

    // Todos os blocos de página ficam geridos explicitamente.
    managed.forEach(el => {
      el.classList.add('v754-managed');
      el.hidden = true;
      el.style.display = 'none';
    });

    // Qualquer filho direto do appBox que não seja a navegação nem um bloco gerido fica escondido.
    // Isto elimina restos da Home antiga, barras vazias e tabs fora de sítio.
    Array.from(appBox.children).forEach(child => {
      if (child === nav || child.classList.contains('v754-managed')) return;
      child.classList.add('v754-orphan-hidden');
      child.hidden = true;
      child.style.display = 'none';
    });

    return { appBox, nav, groups, managed, navButtons: Array.from(nav.querySelectorAll('[data-v75-nav]')) };
  }

  let ctx = null;

  function showPage(page, scrollTop = true){
    if (!PAGE_ORDER.includes(page)) page = 'home';
    if (!ctx) ctx = prepare();
    if (!ctx) return;

    document.body.classList.add('v75-pages','v754-pages','v76-pages');
    document.body.classList.remove('v753-pages');
    document.body.dataset.v75CurrentPage = page;

    ctx.managed.forEach(el => {
      const visible = (ctx.groups[page] || []).includes(el);
      el.classList.toggle('v754-visible', visible);
      el.classList.toggle('v75-page-active', visible);
      el.classList.toggle('v75-page-section', true);
      el.hidden = !visible;
      el.style.display = visible ? '' : 'none';
    });

    // Definições é um painel que contém sub-blocos. Quando está ativo, estes ficam visíveis.
    if (page === 'definicoes') {
      ['cloudV67Card','toolsV57Card','notificacoesFcmV58Card'].forEach(id => {
        const el = byId(id);
        if (el) { el.hidden = false; el.style.display = ''; }
      });
    }

    ctx.navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.v75Nav === page));

    // Atualiza filtros/estatísticas ao entrar em páginas que dependem de dados dinâmicos.
    try {
      if (page === 'perfil' && typeof atualizarPerfilApostador === 'function') atualizarPerfilApostador();
      if (page === 'estatisticas' && typeof renderCentroEstatisticasV71 === 'function') renderCentroEstatisticasV71();
      if (page === 'premios' && typeof renderPremiosGestaoV58 === 'function') renderPremiosGestaoV58();
      if (page === 'apostas' && typeof renderLista === 'function') renderLista();
    } catch (err) {
      console.warn('Atualização de página incompleta:', page, err);
    }

    try { history.replaceState(null, '', `${location.pathname}${location.search}#${page}`); } catch {}
    if (scrollTop) setTimeout(() => ctx.nav.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
    window.JSC_CURRENT_PAGE = page;
  }

  function install(){
    ctx = prepare();
    if (!ctx) return;

    ctx.navButtons.forEach(btn => {
      btn.onclick = (ev) => {
        ev.preventDefault();
        showPage(btn.dataset.v75Nav);
      };
    });

    const settingsBtn = byId('settingsToggleV74');
    if (settingsBtn) {
      settingsBtn.onclick = (ev) => {
        ev.preventDefault();
        showPage('definicoes');
      };
    }

    const closeSettings = byId('settingsCloseV74');
    if (closeSettings) {
      closeSettings.textContent = 'Voltar à Home';
      closeSettings.onclick = (ev) => {
        ev.preventDefault();
        showPage('home');
      };
    }

    window.JSC_SHOW_PAGE = showPage;

    const initial = (location.hash || '#home').replace('#','');
    showPage(PAGE_ORDER.includes(initial) ? initial : 'home', false);
  }

  // Corre depois da inicialização antiga e volta a limpar qualquer resíduo.
  ready(() => setTimeout(install, 450));
})();



// V76.4 — Dashboard Vivo / Login Premium UX
(function initV764DashboardVivo(){
  const VERSION_LABEL = 'V76.4';
  function ready(fn){ if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  function byId(id){ return document.getElementById(id); }
  function txt(id, value){ const el=byId(id); if(el) el.textContent = value; }
  function firstName(name){ return String(name || '').trim().split(/\s+/)[0] || 'Paulo'; }
  function userName(){
    try{
      const meta = window.currentUser?.user_metadata || currentUser?.user_metadata || {};
      return meta.full_name || meta.name || meta.preferred_username || window.currentUser?.email || currentUser?.email || localStorage.getItem('jsc_alias') || 'Paulo';
    }catch{ return localStorage.getItem('jsc_alias') || 'Paulo'; }
  }
  function userEmail(){ try{ return window.currentUser?.email || currentUser?.email || ''; }catch{ return ''; } }
  function userProvider(){ try{ return (window.currentUser?.app_metadata?.provider || currentUser?.app_metadata?.provider || 'email').toLowerCase(); }catch{ return 'email'; } }
  function parsePtDate(v){
    if(!v || v === '—') return null;
    const d=new Date(v); if(!isNaN(d)) return d;
    const m=String(v).match(/(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2})(?::(\d{2}))?/);
    if(m) return new Date(+m[3], +m[2]-1, +m[1], +m[4], +m[5], +(m[6]||0));
    return null;
  }
  function ago(d){
    if(!d) return 'a sincronizar';
    let s=Math.max(0, Math.floor((Date.now()-d.getTime())/1000));
    if(s<20) return 'agora mesmo';
    if(s<60) return `há ${s}s`;
    const m=Math.floor(s/60); if(m<60) return `há ${m} min`;
    const h=Math.floor(m/60); if(h<24) return `há ${h}h`;
    const days=Math.floor(h/24); return `há ${days}d`;
  }
  function countPrizes(){
    try{
      if(Array.isArray(window.historicoPremios)) return window.historicoPremios.length;
      const raw=localStorage.getItem('historicoPremios') || localStorage.getItem('jsc_historico_premios');
      const j=raw?JSON.parse(raw):[]; return Array.isArray(j)?j.length:0;
    }catch{ return 0; }
  }
  function totalApostas(){
    try{
      const ap = window.apostas || apostas || {};
      return Object.values(ap).reduce((n,l)=>n+(Array.isArray(l)?l.length:0),0);
    }catch{ return 0; }
  }
  function installed(){ return window.matchMedia && window.matchMedia('(display-mode: standalone)').matches; }
  function ensureActivityCard(){
    const top=document.querySelector('#dashboardInteligenteV73 .v73-hero-top');
    if(!top) return null;
    let card=byId('v764ActivityCard');
    if(!card){
      card=document.createElement('div');
      card.id='v764ActivityCard';
      card.className='v764-activity-card';
      card.innerHTML=`<small>🍀 A tua atividade</small><strong id="v764ActivityScore">—</strong><span id="v764ActivityText">A preparar...</span><div class="v764-progress"><i id="v764ActivityBar"></i></div>`;
      const next=top.querySelector('.v73-next');
      if(next) top.insertBefore(card,next); else top.appendChild(card);
    }
    return card;
  }
  function updateUserCard(){
    const name=userName(); const email=userEmail(); const provider=userProvider();
    const short=firstName(name);
    const userHead=document.querySelector('.v762-user-head');
    if(userHead){
      userHead.classList.add('v764-user-head');
      const emailEl=byId('userEmailV762');
      if(emailEl) emailEl.textContent=email || 'Sessão iniciada';
      let badge=byId('v764ProviderBadge');
      if(!badge){
        badge=document.createElement('div'); badge.id='v764ProviderBadge'; badge.className='v764-provider-badge';
        emailEl?.insertAdjacentElement('afterend', badge);
      }
      badge.textContent = provider === 'google' ? 'Google ✓ · Conta ligada' : 'Email · Conta ligada';
      const avatar=byId('userAvatarV762');
      if(avatar) avatar.classList.add('v764-avatar');
    }
    const uinfo=byId('userInfo'); if(uinfo) uinfo.textContent=`Olá, ${name}`;
    txt('v73Greeting', `${v73Saudacao ? v73Saudacao() : 'Olá'}, ${short} 👋`);
  }
  function updateDashboard(){
    document.querySelectorAll('.v72-pill,.v54-pill').forEach(el=>{ if(/^V\d+/.test(el.textContent.trim())) el.textContent=VERSION_LABEL; });
    const ap=totalApostas(); const prizes=countPrizes();
    const lastSync=parsePtDate(byId('v67CloudLastSync')?.textContent); const cloudAgo=ago(lastSync);
    const cloud=byId('v73CloudResumo'); if(cloud){ cloud.textContent='Sincronizado'; const small=cloud.parentElement?.querySelector('small'); if(small) small.textContent=`Última sincronização: ${cloudAgo}`; }
    const push=byId('v73PushResumo'); if(push){ const small=push.parentElement?.querySelector('small'); if(small) small.textContent=byId('v68PushEngineLastRun')?.textContent || 'A preparar próxima execução.'; }
    let action='Adicionar apostas', actionMeta='Começa por guardar apostas.';
    if(prizes>0){ action='Confirmar prémios'; actionMeta='Tens prémios no histórico.'; }
    else if(ap>=10){ action='Acompanhar resultados'; actionMeta='As tuas apostas já estão prontas.'; }
    txt('dvProximaAcao', action); txt('dvProximaAcaoMeta', actionMeta);
    txt('dvSequencia', `${prizes} prémio(s)`);
    const badge=byId('dvBadge'); if(badge) badge.textContent = prizes>0 ? 'Atenção' : 'Novo';
    const score=Math.min(100, Math.round(35 + Math.min(ap,20)*2 + (prizes>0?20:0) + (userProvider()==='google'?5:0) + (installed()?5:0)));
    ensureActivityCard();
    txt('v764ActivityScore', `${score}%`);
    txt('v764ActivityText', prizes>0 ? 'Há prémios para acompanhares.' : (ap ? `${ap} aposta(s) registadas.` : 'Começa por adicionar apostas.'));
    const bar=byId('v764ActivityBar'); if(bar) bar.style.width=`${score}%`;
    const insight=byId('v73Insight');
    if(insight){
      if(prizes>0) insight.textContent=`🎉 Encontrámos ${prizes} prémio(s) no teu histórico. Confirma e marca os que já levantaste.`;
      else if(ap===0) insight.textContent='👋 Bem-vindo! Adiciona a tua primeira aposta para ativar estatísticas, prémios e alertas.';
      else insight.textContent=`🍀 Tens ${ap} aposta(s) ativas. A cloud está sincronizada ${cloudAgo} e o assistente continua a acompanhar os resultados.`;
    }
  }
  function tick(){ try{ updateUserCard(); updateDashboard(); }catch(e){ console.warn('V76.4 dashboard vivo', e); } }
  ready(()=>{ document.body.classList.add('v764-dashboard-vivo'); setTimeout(tick,400); setTimeout(tick,1800); setInterval(tick,30000); document.addEventListener('click',()=>setTimeout(tick,300)); });
})();


// V76.5 — Premium Polish / atividade objetiva
(function initV765PremiumPolish(){
  window.APP_VERSION = window.APP_VERSION || `v${window.APP_INFO.version}-launch-ready`;
  const VERSION_LABEL = window.APP_INFO?.label || 'V78.0';
  function ready(fn){ if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  function byId(id){ return document.getElementById(id); }
  function getUser(){ try{ return window.currentUser || currentUser || null; }catch{ return window.currentUser || null; } }
  function totalApostas(){
    try{ const ap = window.apostas || apostas || {}; return Object.values(ap).reduce((n,l)=>n+(Array.isArray(l)?l.length:0),0); }catch{ return 0; }
  }
  function countPrizes(){
    try{
      if(Array.isArray(window.historicoPremios)) return window.historicoPremios.length;
      const raw=localStorage.getItem('historicoPremios') || localStorage.getItem('jsc_historico_premios');
      const j=raw?JSON.parse(raw):[]; return Array.isArray(j)?j.length:0;
    }catch{ return 0; }
  }
  function providerLabel(){
    const u=getUser();
    const provider = String(u?.app_metadata?.provider || 'email').toLowerCase();
    return provider === 'google' ? 'Conta Google ✓' : 'Conta ligada ✓';
  }
  function firstName(){
    const u=getUser();
    const meta=u?.user_metadata || {};
    const name=meta.full_name || meta.name || u?.email || localStorage.getItem('jsc_alias') || 'Paulo';
    return String(name).trim().split(/\s+/)[0] || 'Paulo';
  }
  function updateVersion(){
    document.querySelectorAll('.v72-pill,.v54-pill').forEach(el=>{ if(/^V\d+/.test((el.textContent||'').trim())) el.textContent=VERSION_LABEL; });
    const about=document.getElementById('sobreAppV57');
    if(about) about.textContent = `${window.APP_VERSION} · ${totalApostas()} aposta(s) · ${countPrizes()} prémio(s) · launch ready`;
  }
  function polishUserCard(){
    const emailEl=byId('userEmailV762');
    const provider=byId('v764ProviderBadge');
    const sync=byId('syncInfo');
    if(provider){
      provider.textContent = providerLabel();
      provider.classList.add('v765-provider-badge');
      if(emailEl && provider.nextElementSibling !== emailEl){
        emailEl.parentNode.insertBefore(provider, emailEl);
      }
    }
    if(emailEl){
      emailEl.classList.add('v765-email-line');
      if(!/^📧/.test(emailEl.textContent || '') && emailEl.textContent) emailEl.textContent = `📧 ${emailEl.textContent.replace(/^📧\s*/, '')}`;
    }
    if(sync){ sync.textContent = '☁ Cloud sincronizada'; sync.classList.add('v765-sync-line'); }
    const hero=byId('dashboardInteligenteV73');
    if(hero) hero.classList.add('v765-hero-polish');
    const greeting=byId('v73Greeting');
    if(greeting) greeting.textContent = `${(window.v73Saudacao ? window.v73Saudacao() : 'Olá')}, ${firstName()} 👋`;
  }
  function updateActivity(){
    const ap=totalApostas(); const prizes=countPrizes();
    const score=byId('v764ActivityScore');
    const text=byId('v764ActivityText');
    const small=document.querySelector('#v764ActivityCard small');
    const bar=byId('v764ActivityBar');
    if(small) small.textContent = '🔥 Atividade';
    if(score) score.textContent = ap >= 10 ? 'Muito ativa' : ap > 0 ? 'Ativa' : 'A começar';
    if(text){
      if(prizes>0) text.textContent = `${prizes} prémio(s) no histórico · ${ap} aposta(s)`;
      else if(ap>0) text.textContent = `${ap} aposta(s) · Cloud OK · ${providerLabel().replace(' ✓','')}`;
      else text.textContent = 'Adiciona a primeira aposta para ativar estatísticas.';
    }
    if(bar){
      const pct=Math.min(100, Math.max(18, ap*6 + (prizes?20:0) + 25));
      bar.style.width=`${pct}%`;
    }
  }
  function updateHeroMessage(){
    const sub=document.querySelector('#dashboardInteligenteV73 .v73-hero-title p');
    if(!sub) return;
    const ap=totalApostas(); const prizes=countPrizes();
    if(prizes>0) sub.textContent = `🎉 Tens ${prizes} prémio(s) no histórico. Confirma se há algo por levantar.`;
    else if(ap===0) sub.textContent = '👋 Começa por guardar a tua primeira aposta e o assistente trata do resto.';
    else sub.textContent = '🍀 O Assistente acompanha os resultados, sincroniza na cloud e avisa-te quando houver novidades.';
  }
  function tick(){ try{ updateVersion(); polishUserCard(); updateActivity(); updateHeroMessage(); }catch(e){ console.warn('V76.5 launch ready', e); } }
  ready(()=>{ document.body.classList.add('v765-premium-polish'); setTimeout(tick,450); setTimeout(tick,1900); setInterval(tick,30000); document.addEventListener('click',()=>setTimeout(tick,250)); });
})();

// V77.0 — Launch polish: splash, conquistas e níveis
(function initV770LaunchPolish(){
  window.APP_VERSION = window.APP_VERSION || `v${window.APP_INFO.version}-launch-ready`;
  const VERSION_LABEL = window.APP_INFO?.label || 'V78.0';
  function ready(fn){ if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  function byId(id){ return document.getElementById(id); }
  function getUser(){ try{ return window.currentUser || currentUser || null; }catch{ return window.currentUser || null; } }
  function totalApostas(){
    try{ const ap = window.apostas || apostas || {}; return Object.values(ap).reduce((n,l)=>n+(Array.isArray(l)?l.length:0),0); }catch{ return 0; }
  }
  function countPrizes(){
    try{
      if(Array.isArray(window.historicoPremios)) return window.historicoPremios.length;
      const raw=localStorage.getItem('historicoPremios') || localStorage.getItem('jsc_historico_premios');
      const j=raw?JSON.parse(raw):[]; return Array.isArray(j)?j.length:0;
    }catch{ return 0; }
  }
  function provider(){ const u=getUser(); return String(u?.app_metadata?.provider || 'email').toLowerCase(); }
  function installed(){ return window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true; }
  function notificationsOn(){ try{return Notification?.permission === 'granted'}catch{return false} }
  function firstName(){
    const u=getUser(); const m=u?.user_metadata || {};
    const name=m.full_name || m.name || u?.email || localStorage.getItem('jsc_alias') || 'Paulo';
    return String(name).trim().split(/\s+/)[0] || 'Paulo';
  }
  function levelInfo(points){
    const levels=[['Bronze',0],['Prata',50],['Ouro',120],['Platina',240],['Diamante',420]];
    let cur=levels[0], next=levels[1];
    for(let i=0;i<levels.length;i++){ if(points>=levels[i][1]){cur=levels[i]; next=levels[i+1]||null;} }
    const base=cur[1], target=next?next[1]:cur[1]+200;
    const pct=Math.max(6, Math.min(100, Math.round(((points-base)/(target-base))*100)));
    return {name:cur[0], next:next?.[0] || 'Máximo', pct, missing:Math.max(0,target-points)};
  }
  function points(){ return totalApostas()*4 + countPrizes()*25 + (provider()==='google'?10:0) + (notificationsOn()?8:0) + (installed()?8:0); }
  function achievements(){
    const ap=totalApostas(), pr=countPrizes();
    return [
      {icon:'🔐', title:'Conta Google', ok:provider()==='google', text:provider()==='google'?'Ativa':'Opcional'},
      {icon:'☁️', title:'Cloud ativa', ok:!!getUser(), text:!!getUser()?'Sincronizada':'Entrar'},
      {icon:'🔔', title:'Notificações', ok:notificationsOn(), text:notificationsOn()?'Ativas':'Ativar'},
      {icon:'🎯', title:'10 apostas', ok:ap>=10, text:`${ap}/10`},
      {icon:'🏆', title:'1.º prémio', ok:pr>=1, text:`${pr}/1`},
      {icon:'📱', title:'App instalada', ok:installed(), text:installed()?'Sim':'Opcional'}
    ];
  }
  function showSplash(){
    if(sessionStorage.getItem('jsc_v770_splash_seen')) return;
    sessionStorage.setItem('jsc_v770_splash_seen','1');
    const el=document.createElement('div');
    el.className='v770-splash';
    el.innerHTML=`<div class="v770-splash-card"><div class="v770-logo">🍀</div><strong>Assistente Jogos Santa Casa</strong><span>A preparar a tua dashboard...</span><i></i></div>`;
    document.body.appendChild(el);
    setTimeout(()=>el.classList.add('is-leaving'),1150);
    setTimeout(()=>el.remove(),1600);
  }
  function updateVersion(){
    document.querySelectorAll('.v72-pill,.v54-pill').forEach(el=>{ if(/^V\d+/.test((el.textContent||'').trim())) el.textContent=VERSION_LABEL; });
    const about=byId('sobreAppV57'); if(about) about.textContent=`${window.APP_VERSION} · ${totalApostas()} aposta(s) · ${countPrizes()} prémio(s) · launch ready`;
  }
  function ensureHomeProgress(){
    const hero=byId('dashboardInteligenteV73'); if(!hero) return;
    if(byId('v770LevelCard')) return;
    const ap=totalApostas(), pr=countPrizes(), pts=points(), lvl=levelInfo(pts);
    const card=document.createElement('div');
    card.id='v770LevelCard';
    card.className='v770-level-card';
    card.innerHTML=`
      <div class="v770-level-head"><span>🏅 Nível atual</span><strong>${lvl.name}</strong></div>
      <div class="v770-level-progress"><i style="width:${lvl.pct}%"></i></div>
      <small>${pts} pts · faltam ${lvl.missing} para ${lvl.next}</small>
      <div class="v770-mini-stats"><b>${ap}</b><span>apostas</span><b>${pr}</b><span>prémios</span></div>`;
    const top=hero.querySelector('.v73-hero-top');
    const next=hero.querySelector('.v73-next');
    if(top && next) top.insertBefore(card,next);
  }
  function ensureAchievements(){
    const container = byId('pagePerfil') || byId('perfilPage') || document.querySelector('[data-page="perfil"]') || document.querySelector('.page-perfil');
    const anchor = container || document.querySelector('main') || document.body;
    if(byId('v770Achievements')) return;
    const wrap=document.createElement('section');
    wrap.id='v770Achievements';
    wrap.className='card v770-achievements';
    const pts=points(), lvl=levelInfo(pts);
    wrap.innerHTML=`
      <div class="v770-section-title"><div><h2>🏆 Conquistas</h2><p>Objetivos e progresso da tua conta.</p></div><span>${pts} pts</span></div>
      <div class="v770-rank"><strong>${lvl.name}</strong><div class="v770-level-progress"><i style="width:${lvl.pct}%"></i></div><small>Faltam ${lvl.missing} pontos para ${lvl.next}.</small></div>
      <div class="v770-ach-grid">${achievements().map(a=>`<div class="v770-ach ${a.ok?'ok':''}"><span>${a.icon}</span><strong>${a.title}</strong><small>${a.text}</small></div>`).join('')}</div>`;
    anchor.appendChild(wrap);
  }
  function updateHero(){
    const sub=document.querySelector('#dashboardInteligenteV73 .v73-hero-title p');
    if(sub){
      const ap=totalApostas(), pr=countPrizes();
      if(pr>0) sub.textContent=`🎉 Tens ${pr} prémio(s) no histórico. Confirma o que já foi levantado.`;
      else if(ap>=10) sub.textContent=`🍀 Tens ${ap} apostas ativas. Cloud OK, conta ligada e resultados a serem acompanhados.`;
      else if(ap>0) sub.textContent=`🍀 Tens ${ap} aposta(s) guardada(s). Continua a construir o teu histórico.`;
      else sub.textContent='👋 Guarda a primeira aposta e deixa o assistente acompanhar os resultados.';
    }
    const activity=byId('v764ActivityScore');
    if(activity){
      const pts=points(), lvl=levelInfo(pts);
      activity.textContent = lvl.name;
      const txt=byId('v764ActivityText'); if(txt) txt.textContent=`${pts} pts · ${totalApostas()} apostas · Cloud OK`;
    }
  }
  function tick(){ try{ updateVersion(); ensureHomeProgress(); ensureAchievements(); updateHero(); }catch(e){ console.warn('V77 launch ready', e); } }
  ready(()=>{ document.body.classList.add('v770-launch-polish'); showSplash(); setTimeout(tick,500); setTimeout(tick,1800); setInterval(tick,30000); document.addEventListener('click',()=>setTimeout(tick,300)); });
})();


// V78.0 — Launch Ready: versão centralizada e limpeza final
(function initV780LaunchReady(){
  window.APP_INFO = window.APP_INFO || {
    version: "78.0",
    label: "V78.0",
    build: "2026.07.08",
    codename: "Launch Ready",
    environment: "Production",
    backend: "Supabase",
    push: "Firebase",
    cloud: true
  };
  window.APP_VERSION = `v${window.APP_INFO.version}-launch-ready`;
  function ready(fn){ if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  function byId(id){ return document.getElementById(id); }
  function totalApostas(){
    try{ const ap = window.apostas || apostas || {}; return Object.values(ap).reduce((n,l)=>n+(Array.isArray(l)?l.length:0),0); }catch{ return 0; }
  }
  function countPrizes(){
    try{
      if(Array.isArray(window.historicoPremios)) return window.historicoPremios.length;
      const raw=localStorage.getItem('historicoPremios') || localStorage.getItem('jsc_historico_premios');
      const j=raw?JSON.parse(raw):[]; return Array.isArray(j)?j.length:0;
    }catch{ return 0; }
  }
  function syncVersion(){
    document.querySelectorAll('.v72-pill,.v54-pill,[data-app-version],.version-badge').forEach(el=>{
      const t=(el.textContent||'').trim();
      if(!t || /^V\d+/.test(t) || el.hasAttribute('data-app-version')) el.textContent=window.APP_INFO.label;
    });
    const about=byId('sobreAppV57');
    if(about){
      about.textContent = `${window.APP_INFO.label} · ${window.APP_INFO.codename} · ${totalApostas()} aposta(s) · ${countPrizes()} prémio(s) · ${window.APP_INFO.backend} · ${window.APP_INFO.push}`;
    }
  }
  function exposeSupportInfo(){
    window.copyAppInfo = function(){
      const info = [
        'Assistente Jogos Santa Casa',
        `Versão: ${window.APP_INFO.label}`,
        `Build: ${window.APP_INFO.build}`,
        `Codename: ${window.APP_INFO.codename}`,
        `Backend: ${window.APP_INFO.backend}`,
        `Push: ${window.APP_INFO.push}`,
        `URL: ${location.href}`,
        `UserAgent: ${navigator.userAgent}`
      ].join('\n');
      navigator.clipboard?.writeText(info);
      return info;
    };
  }
  ready(()=>{
    document.body.classList.add('v780-launch-ready');
    syncVersion(); exposeSupportInfo();
    setTimeout(syncVersion, 500); setTimeout(syncVersion, 1800); setInterval(syncVersion, 30000);
    console.log('APP_VERSION', `${window.APP_INFO.label} (${window.APP_INFO.codename})`);
  });
})();
