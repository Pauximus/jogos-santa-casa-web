import webpush from 'web-push';

const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY'
];

for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required env: ${key}`);
}

const SUPABASE_URL = process.env.SUPABASE_URL.replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:pauximus@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function sb(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=minimal',
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Supabase ${res.status}: ${text}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }

  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function lisbonParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Lisbon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date).reduce((a, p) => {
    a[p.type] = p.value;
    return a;
  }, {});

  return {
    ...parts,
    isoDate: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute)
  };
}

function buildNotification() {
  const p = lisbonParts();
  const mode = process.env.PUSH_MODE || 'auto';
  const id = process.env.PUSH_TEST_ID || `${p.isoDate}-${p.hour}${String(p.minute).padStart(2, '0')}`;

  if (mode === 'test') {
    return {
      mode,
      game: 'teste',
      draw_number: `teste-${Date.now()}`,
      notification_type: 'teste_push',
      payload: {
        title: '🧪 Teste Push — Assistente Jogos Santa Casa',
        body: 'Se recebeste isto, o Push Engine está a funcionar com a app fechada.',
        tipo: 'teste',
        tag: `jsc-teste-${Date.now()}`,
        url: './'
      }
    };
  }

  if (mode === 'reminder') {
    return {
      mode,
      game: 'euromilhoes',
      draw_number: `reminder-${id}`,
      notification_type: 'lembrete_sorteio',
      payload: {
        title: '🎰 Hoje há sorteio',
        body: 'Não te esqueças de confirmar ou registar as tuas apostas.',
        tipo: 'lembrete',
        tag: `jsc-reminder-${id}`,
        url: './'
      }
    };
  }

  if (mode === 'soon') {
    return {
      mode,
      game: 'euromilhoes',
      draw_number: `soon-${id}`,
      notification_type: 'sorteio_breve',
      payload: {
        title: '⏰ Sorteio em breve',
        body: 'Falta pouco para o sorteio. Confirma se tens as apostas registadas.',
        tipo: 'sorteio_breve',
        tag: `jsc-soon-${id}`,
        url: './'
      }
    };
  }

  if (mode === 'results') {
    return {
      mode,
      game: 'euromilhoes',
      draw_number: `results-${id}`,
      notification_type: 'resultados_disponiveis',
      payload: {
        title: '📢 Resultados disponíveis',
        body: 'Já podes abrir a app para verificar as tuas apostas.',
        tipo: 'resultados',
        tag: `jsc-results-${id}`,
        url: './'
      }
    };
  }

  const wd = p.weekday.toLowerCase();
  const isEuro = wd.startsWith('tue') || wd.startsWith('fri');
  const isTotoloto = wd.startsWith('wed') || wd.startsWith('sat');

  if (isEuro && p.hour >= 18 && p.hour <= 21) {
    return {
      mode: 'auto',
      game: 'euromilhoes',
      draw_number: p.isoDate,
      notification_type: 'lembrete_sorteio',
      payload: {
        title: '🎰 Hoje há EuroMilhões',
        body: 'Não te esqueças de confirmar ou registar as tuas apostas.',
        tipo: 'lembrete',
        tag: `jsc-euromilhoes-${p.isoDate}`,
        url: './'
      }
    };
  }

  if (isTotoloto && p.hour >= 18 && p.hour <= 21) {
    return {
      mode: 'auto',
      game: 'totoloto',
      draw_number: p.isoDate,
      notification_type: 'lembrete_sorteio',
      payload: {
        title: '🎰 Hoje há Totoloto',
        body: 'Não te esqueças de confirmar ou registar as tuas apostas.',
        tipo: 'lembrete',
        tag: `jsc-totoloto-${p.isoDate}`,
        url: './'
      }
    };
  }

  return null;
}

async function createRun(notification) {
  const rows = await sb('push_engine_runs', {
    method: 'POST',
    prefer: 'return=representation',
    body: JSON.stringify({
      run_id: process.env.GITHUB_RUN_ID || `local-${Date.now()}`,
      mode: notification?.mode || process.env.PUSH_MODE || 'auto',
      status: 'running',
      notification_type: notification?.notification_type || null,
      title: notification?.payload?.title || null
    })
  });

  return rows?.[0]?.id || null;
}

async function updateRun(id, values) {
  if (!id) return;
  await sb(`push_engine_runs?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      ...values,
      finished_at: new Date().toISOString()
    })
  });
}

async function getSubscriptions() {
  return await sb('push_subscriptions?select=id,profile_id,device_id,endpoint,p256dh,auth,enabled&enabled=eq.true&limit=1000', {
    method: 'GET'
  }) || [];
}

async function logBeforeSend(sub, notification) {
  try {
    await sb('notification_log', {
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
  } catch (err) {
    if (err.status === 409 || String(err.body || '').includes('duplicate key')) return false;
    throw err;
  }
}

async function disableSubscription(sub, reason) {
  console.log(`Disabling subscription ${sub.id}: ${reason}`);
  await sb(`push_subscriptions?id=eq.${sub.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      enabled: false,
      updated_at: new Date().toISOString()
    })
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
    keys: {
      p256dh: sub.p256dh,
      auth: sub.auth
    }
  };

  try {
    await webpush.sendNotification(
      pushSub,
      JSON.stringify(notification.payload),
      { TTL: 60 * 60 * 6 }
    );

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
  const notification = buildNotification();
  const runId = await createRun(notification);

  if (!notification) {
    console.log('No notification scheduled for this run.');
    await updateRun(runId, {
      status: 'skipped',
      message: 'No notification scheduled for this run.'
    });
    return;
  }

  const subscriptions = await getSubscriptions();

  console.log(`Notification: ${notification.payload.title}`);
  console.log(`Mode: ${notification.mode}`);
  console.log(`Enabled subscriptions: ${subscriptions.length}`);

  const stats = {
    sent: 0,
    skipped: 0,
    disabled: 0,
    failed: 0
  };

  for (const sub of subscriptions) {
    try {
      const result = await sendToSubscription(sub, notification);
      if (result.sent) stats.sent++;
      else if (result.skipped) stats.skipped++;
      else if (result.disabled) stats.disabled++;
    } catch {
      stats.failed++;
    }
  }

  console.log('Push Engine stats:', stats);

  await updateRun(runId, {
    status: stats.failed > 0 ? 'failed' : 'success',
    enabled_subscriptions: subscriptions.length,
    sent: stats.sent,
    skipped: stats.skipped,
    disabled: stats.disabled,
    failed: stats.failed,
    message: `sent=${stats.sent}, skipped=${stats.skipped}, disabled=${stats.disabled}, failed=${stats.failed}`
  });

  if (stats.failed > 0) process.exitCode = 1;
}

main().catch(async err => {
  console.error(err);
  process.exit(1);
});