import webpush from 'web-push';

const APP_VERSION = 'v70-premios-automaticos';
const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required env: ${key}`);
}

const SUPABASE_URL = process.env.SUPABASE_URL.replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BACKEND_API = process.env.BACKEND_API || 'https://jogos-santa-casa-backend.onrender.com';

async function supabaseRequest(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
    ...(options.headers || {})
  };

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();

  if (!res.ok) {
    let parsed;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
    const err = new Error(`Supabase REST error ${res.status}: ${text || res.statusText}`);
    err.status = res.status;
    err.body = parsed;
    err.code = parsed?.code;
    throw err;
  }

  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}


async function createRunLog(mode) {
  const payload = {
    mode,
    status: 'running',
    started_at: new Date().toISOString(),
    app_version: APP_VERSION
  };
  const data = await supabaseRequest('push_engine_runs?select=id', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(payload)
  });
  return Array.isArray(data) && data[0] ? data[0].id : null;
}

async function finishRunLog(id, patch) {
  if (!id) return;
  try {
    await supabaseRequest(`push_engine_runs?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...patch, finished_at: new Date().toISOString() })
    });
  } catch (e) {
    console.warn('Could not update push_engine_runs:', e.message || e);
  }
}



function parseJsonPossivel(valor, fallback = null) {
  if (valor == null || valor === '') return fallback;
  if (typeof valor === 'object') return valor;
  try { return JSON.parse(valor); } catch { return fallback; }
}

function arrayNumeros(valor) {
  if (Array.isArray(valor)) return valor.map(Number).filter(Number.isFinite);
  if (valor == null) return [];
  return String(valor).trim().split(/[\s,;|-]+/).map(Number).filter(Number.isFinite);
}

function dataISO(valor) {
  if (!valor) return null;
  const s = String(valor).trim();
  const pt = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (pt) return `${pt[3]}-${pt[2].padStart(2,'0')}-${pt[1].padStart(2,'0')}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0,10);
}

function nomeJogo(id) {
  return {
    euromilhoes: 'EuroMilhões',
    totoloto: 'Totoloto',
    eurodreams: 'EuroDreams',
    milhao: 'M1lhão',
    lotaria_classica: 'Lotaria Clássica',
    lotaria_popular: 'Lotaria Popular'
  }[id] || id || 'Jogo';
}

function normalizarResultado(row) {
  const jogo = String(row?.jogo || row?.game || '').toLowerCase().trim();
  if (!jogo) return null;
  const numeros = arrayNumeros(row.numeros || row.numbers);
  const extras = arrayNumeros(row.extras || row.stars || row.estrelas);
  const data = dataISO(row.data_sorteio || row.data || row.draw_date);
  const drawNumber = String(row.sorteio || row.draw_number || row.concurso || data || 'ultimo').trim();
  const premios = parseJsonPossivel(row.premios, row.premios || null);
  const assinatura = JSON.stringify({ jogo, drawNumber, data, numeros, extras, codigo: row.codigo || '', premios });
  return {
    game: jogo,
    draw_number: drawNumber,
    draw_date: data,
    numbers: numeros,
    stars: extras,
    official_prize_info: { premios, raw: row, assinatura },
    result_signature: assinatura
  };
}

async function fetchBackendJson(path, timeoutMs = 70000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BACKEND_API}${path}`, { cache: 'no-store', signal: ctrl.signal });
    if (!res.ok) throw new Error(`Backend ${path} HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function importarResultadosOficiais(gamePreferido = null) {
  try {
    await fetchBackendJson('/atualizar', 70000);
  } catch (e) {
    console.warn('Backend /atualizar indisponível:', e.message || e);
  }

  const data = await fetchBackendJson('/resultados', 70000);
  const lista = Array.isArray(data) ? data : (Array.isArray(data?.resultados) ? data.resultados : []);
  const normalizados = lista.map(normalizarResultado).filter(Boolean);
  const filtrados = gamePreferido ? normalizados.filter(r => r.game === gamePreferido) : normalizados;

  const stats = { lidos: normalizados.length, guardados: 0, novos: 0, atualizados: 0, semAlteracao: 0, ultimo: null };

  for (const r of filtrados) {
    if (!r.numbers.length && !r.official_prize_info?.raw?.codigo && !r.official_prize_info?.raw?.premios) continue;

    const existente = await supabaseRequest(
      `draw_results?select=id,result_signature,created_at&game=eq.${encodeURIComponent(r.game)}&draw_number=eq.${encodeURIComponent(r.draw_number)}&limit=1`,
      { method: 'GET', headers: { Accept: 'application/json' } }
    ) || [];

    const anterior = existente[0];
    const mudou = !anterior || anterior.result_signature !== r.result_signature;

    await supabaseRequest('draw_results', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        game: r.game,
        draw_number: r.draw_number,
        draw_date: r.draw_date,
        numbers: r.numbers,
        stars: r.stars,
        official_prize_info: r.official_prize_info,
        result_signature: r.result_signature,
        updated_at: new Date().toISOString()
      })
    });

    stats.guardados++;
    stats.ultimo = r;
    if (!anterior) stats.novos++;
    else if (mudou) stats.atualizados++;
    else stats.semAlteracao++;
  }

  return stats;
}



function categoriaTemPremioServidor(jogo, n, e) {
  const map = {
    euromilhoes: new Set(['5+2','5+1','5+0','4+2','4+1','3+2','4+0','2+2','3+1','3+0','1+2','2+1','2+0']),
    totoloto: new Set(['5+1','5+0','4+1','4+0','3+1','3+0','2+1']),
    eurodreams: new Set(['6+1','6+0','5+1','5+0','4+1','4+0','3+1','2+1'])
  };
  return map[jogo]?.has(`${n}+${e}`) || false;
}

function parseApostaServidor(aposta) {
  const [numsTxt = '', extrasTxt = ''] = String(aposta || '').split('+');
  return {
    nums: numsTxt.trim().split(/[\s,;|-]+/).map(Number).filter(Number.isFinite),
    extras: extrasTxt.trim().split(/[\s,;|-]+/).map(Number).filter(Number.isFinite)
  };
}

function obterPremioInfoServidor(resultado, categoria) {
  const info = resultado?.official_prize_info || {};
  const premios = info?.premios || info?.raw?.premios || {};
  if (!premios) return null;
  if (Array.isArray(premios)) return premios.find(p => String(p.categoria || p.chave || p.tipo || '').trim() === categoria) || null;
  return premios[categoria] || premios[String(categoria)] || null;
}

function valorPremioTexto(info) {
  if (!info) return 'valor a consultar';
  if (typeof info === 'string') return info;
  return info.valor || info.value || info.premio_valor || info.amount || 'valor a consultar';
}

function nomePremioTexto(info, categoria) {
  if (!info) return `Prémio ${categoria}`;
  if (typeof info === 'string') return `Prémio ${categoria}`;
  return info.premio || info.nome || info.rank || `Prémio ${categoria}`;
}

function valorNumericoPremio(texto) {
  const m = String(texto || '').match(/(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|\d+(?:,\d{2})?)/);
  if (!m) return 0;
  return Number(m[1].replace(/\s/g, '').replace(/\./g, '').replace(',', '.')) || 0;
}

async function obterResultadoGuardado(game, drawNumber = null) {
  let path = `draw_results?select=*&game=eq.${encodeURIComponent(game)}`;
  if (drawNumber) path += `&draw_number=eq.${encodeURIComponent(drawNumber)}`;
  path += '&order=draw_date.desc,updated_at.desc&limit=1';
  const rows = await supabaseRequest(path, { method: 'GET', headers: { Accept: 'application/json' } }) || [];
  return rows[0] || null;
}

async function carregarApostasServidor(game) {
  return await supabaseRequest(
    `apostas_guardadas?select=id,user_id,jogo,aposta,data_registo&jogo=eq.${encodeURIComponent(game)}&limit=5000`,
    { method: 'GET', headers: { Accept: 'application/json' } }
  ) || [];
}

async function premioHistoricoExiste(ev) {
  const rows = await supabaseRequest(
    `historico_premios?select=id&user_id=eq.${encodeURIComponent(ev.user_id)}&jogo=eq.${encodeURIComponent(ev.jogo)}&aposta=eq.${encodeURIComponent(ev.aposta)}&sorteio=eq.${encodeURIComponent(ev.sorteio)}&premio=eq.${encodeURIComponent(ev.premio)}&limit=1`,
    { method: 'GET', headers: { Accept: 'application/json' } }
  ) || [];
  return rows.length > 0;
}

async function guardarPremioHistoricoServidor(ev) {
  if (await premioHistoricoExiste(ev)) return false;
  await supabaseRequest('historico_premios', {
    method: 'POST',
    body: JSON.stringify({
      user_id: ev.user_id,
      jogo: ev.jogo,
      aposta: ev.aposta,
      premio: ev.premio,
      sorteio: ev.sorteio,
      acertos: ev.acertos,
      data_sorteio: ev.data_sorteio || null
    })
  });
  return true;
}

async function calcularPremiosAutomaticos(resultado) {
  const stats = { analisadas: 0, premiadas: 0, novos: 0, totalValor: 0, porPerfil: new Map() };
  if (!resultado?.game || !Array.isArray(resultado.numbers)) return stats;

  const apostas = await carregarApostasServidor(resultado.game);
  const numeros = arrayNumeros(resultado.numbers);
  const extras = arrayNumeros(resultado.stars);

  for (const row of apostas) {
    stats.analisadas++;
    const parsed = parseApostaServidor(row.aposta);
    const n = parsed.nums.filter(x => numeros.includes(Number(x))).length;
    const e = parsed.extras.filter(x => extras.includes(Number(x))).length;
    const categoria = `${n}+${e}`;
    const info = obterPremioInfoServidor(resultado, categoria);
    const premiado = !!info || categoriaTemPremioServidor(resultado.game, n, e);
    if (!premiado) continue;

    const nomePremio = nomePremioTexto(info, categoria);
    const valorTxt = valorPremioTexto(info);
    const premio = `${nomePremio} — ${valorTxt}`;
    const ev = {
      user_id: row.user_id,
      jogo: nomeJogo(resultado.game),
      aposta: row.aposta,
      premio,
      sorteio: resultado.draw_number || 'último sorteio',
      acertos: `${n} número(s) + ${e} extra(s)`,
      data_sorteio: resultado.draw_date || null,
      valor: valorNumericoPremio(valorTxt)
    };

    stats.premiadas++;
    const novo = await guardarPremioHistoricoServidor(ev);
    if (novo) {
      stats.novos++;
      stats.totalValor += ev.valor || 0;
      const atual = stats.porPerfil.get(row.user_id) || { profile_id: row.user_id, premios: 0, valor: 0, exemplos: [] };
      atual.premios++;
      atual.valor += ev.valor || 0;
      if (atual.exemplos.length < 3) atual.exemplos.push({ aposta: row.aposta, premio, acertos: ev.acertos });
      stats.porPerfil.set(row.user_id, atual);
    }
  }

  return stats;
}

function criarNotificacaoPremio(resultado, resumoPerfil) {
  const valorTxt = resumoPerfil.valor > 0
    ? resumoPerfil.valor.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
    : 'valor a consultar';
  const plural = resumoPerfil.premios === 1 ? 'prémio' : 'prémios';
  const exemplo = resumoPerfil.exemplos?.[0];
  return {
    game: resultado.game,
    draw_number: resultado.draw_number,
    notification_type: 'premio_encontrado',
    target_profile_id: resumoPerfil.profile_id,
    payload: {
      title: `🏆 Encontrámos ${resumoPerfil.premios} ${plural}!`,
      body: exemplo ? `${nomeJogo(resultado.game)}: ${exemplo.acertos}. Total: ${valorTxt}.` : `${nomeJogo(resultado.game)}: total ${valorTxt}.`,
      tipo: 'premio',
      tag: `jsc-${resultado.game}-premio-${resultado.draw_number}-${resumoPerfil.profile_id}`,
      url: './#historico',
      version: APP_VERSION
    }
  };
}

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:pauximus@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

function lisbonParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Lisbon',
    year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(date).reduce((a, p) => (a[p.type] = p.value, a), {});
  return { ...parts, isoDate: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), minute: Number(parts.minute) };
}

function gameForToday(parts) {
  const wd = parts.weekday.toLowerCase();
  if (wd.startsWith('tue') || wd.startsWith('fri')) return { id: 'euromilhoes', name: 'EuroMilhões' };
  if (wd.startsWith('wed') || wd.startsWith('sat')) return { id: 'totoloto', name: 'Totoloto' };
  return null;
}

function buildNotification(mode = process.env.PUSH_MODE || 'scheduled', now = new Date()) {
  const p = lisbonParts(now);
  const forceTest = process.env.PUSH_FORCE_TEST === '1' || mode === 'test';

  if (forceTest) {
    const testId = process.env.PUSH_TEST_ID || `${p.isoDate}-${p.hour}${String(p.minute).padStart(2, '0')}-${Date.now()}`;
    return {
      game: 'teste',
      draw_number: `teste-${testId}`,
      notification_type: 'teste_push',
      payload: {
        title: '🧪 Teste Push — Assistente Jogos Santa Casa',
        body: process.env.PUSH_TEST_MESSAGE || `Teste V68 OK. Push Engine ativo com a app fechada.`,
        tipo: 'teste',
        tag: `jsc-teste-${testId}`,
        url: './',
        version: APP_VERSION
      }
    };
  }

  const game = gameForToday(p);
  if (!game) return null;

  const explicitReminder = mode === 'reminder';
  const explicitResults = mode === 'results';
  const explicitSoon = mode === 'soon';
  const reminderWindow = p.hour >= 18 && p.hour <= 21;
  const resultsWindow = p.hour >= 22 || p.hour <= 1;

  if (explicitSoon) {
    return {
      game: game.id,
      draw_number: p.isoDate,
      notification_type: 'lembrete_30_min',
      payload: {
        title: `⏰ Falta pouco — ${game.name}`,
        body: 'Se ainda não registaste as apostas, esta é a altura ideal.',
        tipo: 'sorteio',
        tag: `jsc-${game.id}-30min-${p.isoDate}`,
        url: './',
        version: APP_VERSION
      }
    };
  }

  if (explicitResults || (mode === 'scheduled' && resultsWindow)) {
    return {
      game: game.id,
      draw_number: p.isoDate,
      notification_type: 'resultado_disponivel',
      payload: {
        title: `🎉 Resultados disponíveis — ${game.name}`,
        body: `Já podes abrir o Assistente Jogos Santa Casa e analisar as tuas apostas de hoje.`,
        tipo: 'resultado',
        tag: `jsc-${game.id}-resultado-${p.isoDate}`,
        url: './',
        version: APP_VERSION
      }
    };
  }

  if (explicitReminder || (mode === 'scheduled' && reminderWindow)) {
    return {
      game: game.id,
      draw_number: p.isoDate,
      notification_type: 'lembrete_sorteio',
      payload: {
        title: `🍀 Hoje há ${game.name}`,
        body: 'Não te esqueças de confirmar ou registar as tuas apostas.',
        tipo: 'sorteio',
        tag: `jsc-${game.id}-lembrete-${p.isoDate}`,
        url: './',
        version: APP_VERSION
      }
    };
  }

  return null;
}

async function getSubscriptions() {
  return await supabaseRequest('push_subscriptions?select=id,profile_id,device_id,endpoint,p256dh,auth,enabled&enabled=eq.true&limit=1000', {
    method: 'GET',
    headers: { Accept: 'application/json' }
  }) || [];
}

async function logBeforeSend(sub, notification) {
  try {
    await supabaseRequest('notification_log', {
      method: 'POST',
      body: JSON.stringify({
        profile_id: sub.profile_id,
        device_id: sub.device_id,
        game: notification.game,
        draw_number: notification.draw_number,
        notification_type: notification.notification_type,
        title: notification.payload.title,
        body: notification.payload.body
      })
    });
    return true;
  } catch (error) {
    if (error.code === '23505') return false;
    throw error;
  }
}

async function disableSubscription(sub, reason) {
  console.log(`Disabling subscription ${sub.id}: ${reason}`);
  await supabaseRequest(`push_subscriptions?id=eq.${encodeURIComponent(sub.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled: false, updated_at: new Date().toISOString() })
  });
}

async function sendToSubscription(sub, notification) {
  const shouldSend = await logBeforeSend(sub, notification);
  if (!shouldSend) {
    console.log(`Skipped duplicate for ${sub.profile_id} / ${notification.game} / ${notification.draw_number} / ${notification.notification_type}`);
    return { skipped: true };
  }

  const pushSub = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth }
  };

  try {
    await webpush.sendNotification(pushSub, JSON.stringify(notification.payload), { TTL: 60 * 60 * 6 });
    return { sent: true };
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      await disableSubscription(sub, `expired ${err.statusCode}`);
      return { disabled: true };
    }
    console.error('Push failed:', err.statusCode, err.body || err.message);
    throw err;
  }
}

async function main() {
  console.log(`Assistente Jogos Santa Casa — ${APP_VERSION}`);
  const mode = process.env.PUSH_MODE || 'scheduled';
  const runId = await createRunLog(mode);
  let notification = null;
  let importStats = null;
  let subscriptions = [];
  const stats = { sent: 0, skipped: 0, disabled: 0, failed: 0 };

  try {
    notification = buildNotification(mode);

    if (notification?.notification_type === 'resultado_disponivel') {
      console.log('A importar resultados oficiais para draw_results...');
      importStats = await importarResultadosOficiais(notification.game);
      console.log('Resultados oficiais:', importStats);
      if (importStats.guardados > 0 && importStats.ultimo) {
        notification.draw_number = importStats.ultimo.draw_number;
        notification.payload.title = `📢 Resultados disponíveis — ${nomeJogo(importStats.ultimo.game)}`;
        notification.payload.body = importStats.novos || importStats.atualizados
          ? `Resultado oficial importado para a cloud. Abre a app para analisar as tuas apostas.`
          : `Resultado já estava na cloud. Abre a app para consultar.`;
        notification.payload.tag = `jsc-${importStats.ultimo.game}-resultado-${importStats.ultimo.draw_number}`;
      }
    }

    let premiosStats = null;
    let resultadoPremios = null;
    let notificacoesPremio = [];

    if (notification?.notification_type === 'resultado_disponivel') {
      resultadoPremios = await obterResultadoGuardado(notification.game, notification.draw_number);
      if (resultadoPremios) {
        console.log('A calcular prémios automáticos...');
        premiosStats = await calcularPremiosAutomaticos(resultadoPremios);
        console.log('Prémios automáticos:', {
          analisadas: premiosStats.analisadas,
          premiadas: premiosStats.premiadas,
          novos: premiosStats.novos,
          perfis: premiosStats.porPerfil.size
        });
        notificacoesPremio = [...premiosStats.porPerfil.values()].map(p => criarNotificacaoPremio(resultadoPremios, p));
      }
    }

    if (!notification) {
      console.log(`No notification scheduled for this run. mode=${mode}`);
      await finishRunLog(runId, { status: 'idle', message: `Sem notificação agendada para mode=${mode}` });
      return;
    }

    subscriptions = await getSubscriptions();
    console.log(`Notification: ${notification.payload.title}`);
    console.log(`Type: ${notification.notification_type} | Game: ${notification.game} | Draw: ${notification.draw_number}`);
    console.log(`Enabled subscriptions: ${subscriptions.length}`);

    if (!subscriptions.length) {
      console.log('No enabled push subscriptions. Abre a app, permite notificações e clica em Registar Push Cloud.');
    }

    if (notificacoesPremio.length) {
      console.log(`Prize notifications: ${notificacoesPremio.length}`);
      for (const premioNotif of notificacoesPremio) {
        const alvo = subscriptions.filter(s => s.profile_id === premioNotif.target_profile_id);
        for (const sub of alvo) {
          try {
            const result = await sendToSubscription(sub, premioNotif);
            if (result.sent) stats.sent++;
            else if (result.skipped) stats.skipped++;
            else if (result.disabled) stats.disabled++;
          } catch (e) {
            stats.failed++;
            console.error(`Failed prize subscription ${sub.id}:`, e.message || e);
          }
        }
      }
    } else {
      for (const sub of subscriptions) {
        try {
          const result = await sendToSubscription(sub, notification);
          if (result.sent) stats.sent++;
          else if (result.skipped) stats.skipped++;
          else if (result.disabled) stats.disabled++;
        } catch (e) {
          stats.failed++;
          console.error(`Failed subscription ${sub.id}:`, e.message || e);
        }
      }
    }

    console.log('Push Engine stats:', stats);
    await finishRunLog(runId, {
      status: stats.failed > 0 ? 'partial_failure' : 'success',
      game: notification.game,
      draw_number: notification.draw_number,
      notification_type: notification.notification_type,
      notification_title: notificacoesPremio.length ? `🏆 ${notificacoesPremio.length} utilizador(es) com prémio` : notification.payload.title,
      subscriptions_count: subscriptions.length,
      sent: stats.sent,
      skipped: stats.skipped,
      disabled: stats.disabled,
      failed: stats.failed,
      message: stats.failed > 0 ? 'Algumas subscrições falharam.' : `Execução concluída. resultados=${importStats ? importStats.guardados : 'n/a'}, prémios=${premiosStats ? premiosStats.novos : 'n/a'}`
    });
    if (stats.failed > 0) process.exitCode = 1;
  } catch (err) {
    await finishRunLog(runId, {
      status: 'error',
      message: err.message || String(err),
      subscriptions_count: subscriptions.length,
      sent: stats.sent,
      skipped: stats.skipped,
      disabled: stats.disabled,
      failed: stats.failed || 1,
      notification_title: notification?.payload?.title || null
    });
    throw err;
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
