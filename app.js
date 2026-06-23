window.APP_VERSION = "v8-login-sync-password";

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

const authBox = document.getElementById("authBox"), userBox = document.getElementById("userBox"), appBox = document.getElementById("appBox");
const authEmail = document.getElementById("authEmail"), authPassword = document.getElementById("authPassword"), authMsg = document.getElementById("authMsg");
const userInfo = document.getElementById("userInfo"), syncInfo = document.getElementById("syncInfo");
const jogoSelect = document.getElementById("jogo"), tabs = document.getElementById("tabs"), camposDiv = document.getElementById("campos");
const listaApostas = document.getElementById("lista-apostas"), resultado = document.getElementById("resultado"), historicoDiv = document.getElementById("historico"), estado = document.getElementById("estado");

let currentUser = null;
let jogoAtual = "euromilhoes";
let apostas = {};
let historico = [];
for (const key of Object.keys(jogos)) apostas[key] = [];

function storageKey(nome){ return currentUser ? `${nome}_${currentUser.id}` : nome; }
function msg(texto,tipo="warn"){ authMsg.className=`result-card ${tipo}`; authMsg.textContent=texto; authMsg.style.display="block"; }
function clearMsg(){ authMsg.style.display="none"; }
function carregarLocal(){ apostas=JSON.parse(localStorage.getItem(storageKey("apostasJSC"))||"{}"); historico=JSON.parse(localStorage.getItem(storageKey("historicoJSC"))||"[]"); for(const k of Object.keys(jogos)) if(!apostas[k]) apostas[k]=[]; }
function guardar(){ localStorage.setItem(storageKey("apostasJSC"), JSON.stringify(apostas)); }
function guardarHist(){ localStorage.setItem(storageKey("historicoJSC"), JSON.stringify(historico)); }

async function login(){
  clearMsg(); const email=authEmail.value.trim(), password=authPassword.value;
  if(!email||!password) return msg("Preenche email e password.");
  const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
  if(error) return msg("Erro ao entrar: "+error.message,"bad");
  currentUser=data.user; await iniciarApp();
}
async function criarConta(){
  clearMsg(); const email=authEmail.value.trim(), password=authPassword.value;
  if(!email||!password) return msg("Preenche email e password.");
  if(password.length<6) return msg("A password deve ter pelo menos 6 caracteres.");
  const {data,error}=await supabaseClient.auth.signUp({email,password,options:{emailRedirectTo:"https://pauximus.github.io/jogos-santa-casa-web/"}});
  if(error) return msg("Erro ao criar conta: "+error.message,"bad");
  if(data.user&&!data.session) return msg("Conta criada. Confirma o email antes de entrar.");
  currentUser=data.user; await iniciarApp();
}
async function recuperarPassword(){
  clearMsg(); const email=authEmail.value.trim(); if(!email) return msg("Escreve o email para recuperar a password.");
  const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:"https://pauximus.github.io/jogos-santa-casa-web/"});
  if(error) return msg("Erro ao enviar recuperação: "+error.message,"bad");
  msg("Email de recuperação enviado. Verifica a caixa de entrada.");
}
async function logout(){ await supabaseClient.auth.signOut(); currentUser=null; apostas={}; historico=[]; authBox.style.display=""; userBox.style.display="none"; appBox.style.display="none"; authPassword.value=""; estado.textContent="Sessão terminada."; }

async function iniciarApp(){
  if(!currentUser) return; carregarLocal(); authBox.style.display="none"; userBox.style.display=""; appBox.style.display="";
  userInfo.textContent=`Olá, ${currentUser.email}`; inicializarInterface(); await sincronizarTudo(); mudarJogo(jogoAtual); estado.textContent="Sessão iniciada.";
}
async function sincronizarTudo(){ await carregarApostasCloud(false); await carregarHistoricoCloud(false); syncInfo.textContent=`Última sincronização: ${new Date().toLocaleString("pt-PT")}`; }

async function carregarApostasCloud(chamarVerificar=true){
  if(!currentUser) return; estado.textContent="A sincronizar apostas...";
  try{ const {data,error}=await supabaseClient.from(SUPABASE_APOSTAS).select("*").eq("user_id",currentUser.id).order("data_registo",{ascending:true}).limit(1000); if(error) throw error;
    const novas={}; for(const k of Object.keys(jogos)) novas[k]=[];
    (data||[]).forEach(r=>{ if(novas[r.jogo]&&r.aposta&&!novas[r.jogo].includes(r.aposta)) novas[r.jogo].push(r.aposta); });
    for(const k of Object.keys(jogos)) apostas[k]=[...new Set([...(novas[k]||[]),...(apostas[k]||[])])];
    guardar(); renderLista(); if(chamarVerificar) verificar();
  }catch(e){ console.warn(e); estado.textContent="Não foi possível sincronizar apostas."; renderLista(); }
}
async function apostaExisteNaCloud(jogo,aposta){
  if(!currentUser) return false; const {data,error}=await supabaseClient.from(SUPABASE_APOSTAS).select("id").eq("user_id",currentUser.id).eq("jogo",jogo).eq("aposta",aposta).limit(1); if(error){console.warn(error); return false;} return (data||[]).length>0;
}
async function guardarApostaCloud(jogo,aposta){
  if(!currentUser) return alert("Tens de iniciar sessão para guardar apostas na cloud.");
  try{ if(await apostaExisteNaCloud(jogo,aposta)) return; const {error}=await supabaseClient.from(SUPABASE_APOSTAS).insert({jogo,aposta,user_id:currentUser.id}); if(error) throw error; }
  catch(e){ console.warn(e); alert("Não foi possível guardar a aposta na cloud: "+e.message); }
}
async function apagarApostaCloud(jogo,aposta){ if(!currentUser)return; try{ const {error}=await supabaseClient.from(SUPABASE_APOSTAS).delete().eq("user_id",currentUser.id).eq("jogo",jogo).eq("aposta",aposta); if(error) throw error; }catch(e){console.warn(e);} }
function normalizarRegistoCloud(h){ return {idLocal:`cloud-${h.id}`, jogo:h.jogo||"", sorteio:h.sorteio||"último sorteio", dataSorteio:h.data_sorteio||"", aposta:h.aposta||"", resultado:h.acertos||"", premio:h.premio||"", dataRegisto:h.data_registo?new Date(h.data_registo).toLocaleString("pt-PT"):""}; }
async function carregarHistoricoCloud(){
  if(!currentUser) return; historicoDiv.innerHTML='<div class="result-card warn">A sincronizar histórico...</div>';
  try{ const {data,error}=await supabaseClient.from(SUPABASE_HISTORICO).select("*").eq("user_id",currentUser.id).order("data_registo",{ascending:false}).limit(200); if(error) throw error; historico=(data||[]).map(normalizarRegistoCloud); guardarHist(); renderHistorico(); }
  catch(e){ console.warn(e); estado.textContent="Não foi possível sincronizar histórico."; renderHistorico(); }
}
async function premioExisteNaCloud(ev){ if(!currentUser)return false; const {data,error}=await supabaseClient.from(SUPABASE_HISTORICO).select("id").eq("user_id",currentUser.id).eq("jogo",ev.jogo).eq("aposta",ev.aposta).eq("premio",ev.premio).eq("sorteio",ev.sorteio).limit(1); if(error){console.warn(error);return false;} return (data||[]).length>0; }
async function guardarPremioCloud(ev){ if(!currentUser)return; try{ if(await premioExisteNaCloud(ev)) return; const {error}=await supabaseClient.from(SUPABASE_HISTORICO).insert({jogo:ev.jogo,aposta:ev.aposta,premio:ev.premio,sorteio:ev.sorteio,acertos:ev.resultado,user_id:currentUser.id}); if(error) throw error; }catch(e){console.warn(e);} }

function inicializarInterface(){ jogoSelect.innerHTML=""; tabs.innerHTML=""; for(const [key,cfg] of Object.entries(jogos)){ const opt=document.createElement("option"); opt.value=key; opt.textContent=cfg.nome; jogoSelect.appendChild(opt); const tab=document.createElement("button"); tab.className="tab "+key; tab.textContent=cfg.tab; tab.dataset.jogo=key; tab.onclick=()=>mudarJogo(key); tabs.appendChild(tab); } }
function mudarJogo(key){ jogoAtual=key; jogoSelect.value=key; document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.jogo===key)); renderCampos(); renderLista(); verificar(); }
function renderCampos(){ const cfg=jogos[jogoAtual]; camposDiv.innerHTML=""; if(cfg.codigo){camposDiv.innerHTML='<label>Código:</label><input id="codigo" class="large" placeholder="ABC12345">';return;} if(cfg.lotaria){camposDiv.innerHTML='<label>Número:</label><input id="numeroLotaria" class="large" placeholder="Número">';return;} for(let i=1;i<=cfg.numeros;i++) camposDiv.insertAdjacentHTML("beforeend",`<label>Nº${i}:</label><input class="num" inputmode="numeric">`); camposDiv.insertAdjacentHTML("beforeend","<strong> + </strong>"); for(let i=1;i<=cfg.extras;i++){ const label=cfg.extraLabel==="⭐"?`⭐ ${i}`:cfg.extraLabel; camposDiv.insertAdjacentHTML("beforeend",`<label>${label}:</label><input class="extra" inputmode="numeric">`); } }
function normalizarAposta(){ const cfg=jogos[jogoAtual]; if(cfg.codigo) return document.getElementById("codigo").value.trim().toUpperCase().replace(/\s+/g,""); if(cfg.lotaria) return document.getElementById("numeroLotaria").value.replace(/\D/g,"").padStart(5,"0"); const nums=[...document.querySelectorAll(".num")].map(i=>i.value.trim()); const extras=[...document.querySelectorAll(".extra")].map(i=>i.value.trim()); if(nums.some(v=>!v)||extras.some(v=>!v)){alert("Preenche todos os campos.");return "";} const ns=nums.map(Number), es=extras.map(Number); if(new Set(ns).size!==ns.length){alert("Tens números repetidos.");return "";} if(new Set(es).size!==es.length){alert("Tens extras repetidos.");return "";} if(ns.some(n=>n<1||n>cfg.maxNum)){alert(`Os números devem estar entre 1 e ${cfg.maxNum}.`);return "";} if(es.some(n=>n<1||n>cfg.maxExtra)){alert(`Os extras devem estar entre 1 e ${cfg.maxExtra}.`);return "";} return ns.sort((a,b)=>a-b).join(" ")+" + "+es.sort((a,b)=>a-b).join(" "); }
function parseAposta(aposta){ const [n,e]=aposta.split("+"); return {nums:n.trim().split(/\s+/).map(Number), extras:e?e.trim().split(/\s+/).map(Number):[]}; }
function renderLista(){ listaApostas.innerHTML=""; apostas[jogoAtual].forEach((aposta,index)=>{ const li=document.createElement("li"); li.textContent=`${index+1}) ${aposta}`; const btn=document.createElement("button"); btn.className="delete"; btn.textContent="Apagar"; btn.onclick=async()=>{apostas[jogoAtual].splice(index,1); guardar(); await apagarApostaCloud(jogoAtual,aposta); renderLista(); verificar();}; li.appendChild(btn); listaApostas.appendChild(li); }); }
async function adicionarAposta(){ const aposta=normalizarAposta(); if(!aposta)return; if(apostas[jogoAtual].includes(aposta)){alert("Essa aposta já existe.");return;} apostas[jogoAtual].push(aposta); guardar(); await guardarApostaCloud(jogoAtual,aposta); renderCampos(); renderLista(); verificar(); }
function converterParaArray(v){ if(Array.isArray(v)) return v.map(Number); if(typeof v==="string") return v.trim().split(/\s+/).map(Number); return []; }
function categoriaTemPremio(j,n,e){ const map={euromilhoes:new Set(["5+2","5+1","5+0","4+2","4+1","3+2","4+0","2+2","3+1","3+0","1+2","2+1","2+0"]),totoloto:new Set(["5+1","5+0","4+1","4+0","3+1","3+0","2+1"]),eurodreams:new Set(["6+1","6+0","5+1","5+0","4+1","4+0","3+1","2+1"])}; return map[j]?.has(`${n}+${e}`)||false; }
async function obterResultadoAtual(){ const cfg=jogos[jogoAtual]; const res=await fetch(`${API}/${cfg.endpoint}`); const data=await res.json(); if(data.erro) throw new Error(data.erro); return data; }
async function verificar(){ if(!currentUser)return; const cfg=jogos[jogoAtual]; estado.textContent="A obter resultados..."; try{ const data=await obterResultadoAtual(); let eventos=[]; if(cfg.tipo==="numeros_extra") eventos=renderResultadoNumerosExtra(data); else if(cfg.tipo==="codigo") eventos=renderResultadoCodigo(data); else if(cfg.tipo==="lotaria") eventos=renderResultadoLotaria(data); await guardarEventosHistorico(data,eventos); estado.textContent=`${cfg.nome}: ${apostas[jogoAtual].length} aposta(s)`; }catch(e){ resultado.innerHTML=`<div class="result-card bad">Erro ao obter resultados: ${e.message}</div>`; estado.textContent="Erro."; } }
function renderCabecalhoResultado(data,conteudo){ return `<div class="result-title">${data.jogo.toUpperCase()}</div><div class="result-meta"><div>Sorteio: ${data.sorteio||"último sorteio"}</div><div>Data: ${data.data||""}</div>${conteudo}</div>`; }
function renderResultadoNumerosExtra(data){ const numeros=converterParaArray(data.numeros), extras=converterParaArray(data.extras), eventos=[]; let html=renderCabecalhoResultado(data,`<div>Resultado: [${numeros.join(", ")}] + [${extras.join(", ")}]</div>`); if(!apostas[jogoAtual].length) html+=`<div class="result-card warn">Sem apostas guardadas.</div>`; apostas[jogoAtual].forEach((aposta,index)=>{ const {nums,extras:apostaExtras}=parseAposta(aposta); const an=nums.filter(n=>numeros.includes(n)).length, ae=apostaExtras.filter(e=>extras.includes(e)).length; const categoria=`${an}+${ae}`, premioInfo=data.premios?data.premios[categoria]:null; const premiado=!!premioInfo||categoriaTemPremio(jogoAtual,an,ae); let titulo="🔴 SEM PRÉMIO", classe="bad", premio="", valor=""; if(premiado){premio=premioInfo?.premio||"Prémio"; valor=premioInfo?.valor||"valor a consultar"; titulo=`🏆 PREMIADO — ${premio} — ${valor}`; classe="ok";} else if(an||ae){titulo="🟡 COM ACERTOS — sem prémio"; classe="warn";} if(premiado) eventos.push({jogo:data.jogo,aposta,resultado:`${an} número(s) + ${ae} ${data.extra_nome||"extra"}(s)`,sorteio:data.sorteio||"último sorteio",premio:`${premio} — ${valor}`}); html+=`<div class="result-card ${classe}"><strong>${titulo}</strong><br>Aposta ${index+1}: ${aposta}<br>Acertos: ${an} número(s) + ${ae} ${data.extra_nome||"extra"}(s)</div>`; }); resultado.innerHTML=html; return eventos; }
function renderResultadoCodigo(data){ const codigoResultado=(data.codigo||"").replace(/\s+/g,"").toUpperCase(), eventos=[]; let html=renderCabecalhoResultado(data,`<div>Resultado: ${codigoResultado||"não encontrado"}</div>`); if(!apostas[jogoAtual].length) html+=`<div class="result-card warn">Sem códigos guardados.</div>`; apostas[jogoAtual].forEach((aposta,index)=>{ const premiado=aposta.replace(/\s+/g,"").toUpperCase()===codigoResultado; if(premiado) eventos.push({jogo:data.jogo,aposta,resultado:codigoResultado,sorteio:data.sorteio||"último sorteio",premio:"M1lhão — valor a consultar"}); html+=`<div class="result-card ${premiado?"ok":"bad"}"><strong>${premiado?"🏆 PREMIADO":"🔴 SEM PRÉMIO"}</strong><br>Código ${index+1}: ${aposta}</div>`; }); resultado.innerHTML=html; return eventos; }
function renderResultadoLotaria(data){ const premios=data.premios||[], numsPrem=premios.map(p=>String(p.numero).padStart(5,"0")), eventos=[]; let html=renderCabecalhoResultado(data,`<div>${premios.map(p=>`${p.premio}: ${p.numero}`).join("<br>")||"Prémios não encontrados"}</div>`); if(!apostas[jogoAtual].length) html+=`<div class="result-card warn">Sem números guardados.</div>`; apostas[jogoAtual].forEach((aposta,index)=>{ const numero=String(aposta).padStart(5,"0"), pos=numsPrem.indexOf(numero), premiado=pos>=0, premio=premiado?premios[pos].premio:""; if(premiado) eventos.push({jogo:data.jogo,aposta:numero,resultado:numero,sorteio:data.sorteio||"último sorteio",premio}); html+=`<div class="result-card ${premiado?"ok":"bad"}"><strong>${premiado?`🏆 PREMIADO — ${premio}`:"🔴 SEM PRÉMIO"}</strong><br>Número ${index+1}: ${numero}</div>`; }); resultado.innerHTML=html; return eventos; }
async function guardarEventosHistorico(data,eventos){ if(!eventos.length){renderHistorico();return;} for(const ev of eventos){ const idLocal=`${ev.jogo}|${ev.sorteio}|${ev.aposta}|${ev.premio}|${ev.resultado}`; if(!historico.some(h=>h.idLocal===idLocal)){ historico.unshift({idLocal,jogo:ev.jogo,sorteio:ev.sorteio,aposta:ev.aposta,resultado:ev.resultado,premio:ev.premio,dataRegisto:new Date().toLocaleString("pt-PT")}); await guardarPremioCloud(ev); }} historico=historico.slice(0,200); guardarHist(); await carregarHistoricoCloud(); }
function renderHistorico(){ if(!historico.length){historicoDiv.innerHTML=`<div class="result-card warn">Ainda não há prémios guardados no histórico.</div>`;return;} historicoDiv.innerHTML=historico.map(h=>`<div class="history-item"><strong>🏆 ${h.jogo} — ${h.premio}</strong><br>Sorteio: ${h.sorteio}${h.dataSorteio?" — "+h.dataSorteio:""}<br>Aposta: ${h.aposta}<br>Acertos/resultado: ${h.resultado}<br><span class="small">Guardado em: ${h.dataRegisto||""}</span></div>`).join(""); }
function exportarHistorico(){ const blob=new Blob([JSON.stringify(historico,null,2)],{type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="historico_premios_jogos_santa_casa.json"; a.click(); URL.revokeObjectURL(url); }
function limparHistorico(){ if(!confirm("Queres mesmo limpar o histórico local? A cloud não será apagada.")) return; historico=[]; guardarHist(); renderHistorico(); }

document.getElementById("loginBtn").addEventListener("click",login); document.getElementById("signupBtn").addEventListener("click",criarConta); document.getElementById("resetPasswordBtn").addEventListener("click",recuperarPassword); document.getElementById("logoutBtn").addEventListener("click",logout); document.getElementById("syncNowBtn").addEventListener("click",sincronizarTudo); authPassword.addEventListener("keydown",e=>{if(e.key==="Enter")login();}); jogoSelect.addEventListener("change",()=>mudarJogo(jogoSelect.value)); document.getElementById("adicionar").addEventListener("click",adicionarAposta); document.getElementById("exportarHistorico").addEventListener("click",exportarHistorico); document.getElementById("limparHistorico").addEventListener("click",limparHistorico);
supabaseClient.auth.onAuthStateChange(async (event,session)=>{ currentUser=session?.user||null; if(currentUser&&event!=="INITIAL_SESSION") await iniciarApp(); });
(async function boot(){ console.log("APP_VERSION",window.APP_VERSION); const {data,error}=await supabaseClient.auth.getSession(); if(error) console.warn(error); currentUser=data?.session?.user||null; if(currentUser) await iniciarApp(); else{ authBox.style.display=""; userBox.style.display="none"; appBox.style.display="none"; estado.textContent="Inicia sessão para continuar."; }})();
