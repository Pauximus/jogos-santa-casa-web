import webpush from 'web-push';

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required env: ${key}`);
}

const SUPABASE_URL = process.env.SUPABASE_URL.replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

function scheduledNotification(now = new Date()) {
  const p = lisbonParts(now);
  const force = process.env.PUSH_FORCE_TEST === '1' || process.env.PUSH_MODE === 'test';
  if (force) {
    return {
      game: 'teste',
      draw_number: `teste-${process.env.PUSH_TEST_ID || `${p.isoDate}-${p.hour}${String(p.minute).padStart(2, '0')}-${Date.now()}`}`,
      notification_type: 'teste_push',
      payload: {
        title: '🧪 Teste Push — Assistente Jogos Santa Casa',
        body: process.env.PUSH_TEST_MESSAGE || 'Se recebeste isto, o GitHub Actions + Push Engine está a funcionar com a app fechada.',
        tipo: 'teste',
        tag: `jsc-teste-${process.env.PUSH_TEST_ID || p.isoDate}`,
        url: './'
      }
    };
  }

  // V67.4: motor automático via GitHub Actions sem WebSocket/Reatime.
  // Nesta fase envia lembretes automáticos e testes reais.
  // A comparação de prémios fica para a fase seguinte, quando ligarmos a recolha automática dos resultados oficiais.
  const wd = p.weekday.toLowerCase();
  const hour = p.hour;
  const isEuro = wd.startsWith('tue') || wd.startsWith('fri');
  const isTotoloto = wd.startsWith('wed') || wd.startsWith('sat');

  if (isEuro && hour >= 18 && hour <= 21) {
    return {
      game: 'euromilhoes',
      draw_number: p.isoDate,
      notification_type: 'lembrete_sorteio',
      payload: {
        title: '🍀 Hoje há EuroMilhões',
        body: 'Não te esqueças de confirmar ou registar as tuas apostas.',
        tipo: 'sorteio',
        tag: `jsc-euromilhoes-${p.isoDate}`,
        url: './'
      }
    };
  }

  if (isTotoloto && hour >= 18 && hour <= 21) {
    return {
      game: 'totoloto',
      draw_number: p.isoDate,
      notification_type: 'lembrete_sorteio',
      payload: {
        title: '🍀 Hoje há Totoloto',
        body: 'Não te esqueças de confirmar ou registar as tuas apostas.',
        tipo: 'sorteio',
        tag: `jsc-totoloto-${p.isoDate}`,
        url: './'
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
    // 23505 = unique violation. Evita repetir a mesma notificação.
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
    console.log(`Skipped duplicate for ${sub.profile_id} / ${notification.game} / ${notification.draw_number}`);
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
  const notification = scheduledNotification();
  if (!notification) {
    console.log('No notification scheduled for this run.');
    return;
  }

  const subscriptions = await getSubscriptions();
  console.log(`Notification: ${notification.payload.title}`);
  console.log(`Enabled subscriptions: ${subscriptions.length}`);

  if (!subscriptions.length) {
    console.log('No enabled push subscriptions. Abre a app, permite notificações e clica em Registar Push Cloud.');
  }

  const stats = { sent: 0, skipped: 0, disabled: 0, failed: 0 };
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
  console.log('Push Engine stats:', stats);
  if (stats.failed > 0) process.exitCode = 1;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
