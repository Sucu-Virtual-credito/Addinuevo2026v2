// 🔒 Envía mensajes y botones de acción al bot de Telegram SIN exponer el TOKEN en el código.
// El secreto vive en: Vercel → Settings → Environment Variables → TELEGRAM_BOT_TOKEN y ADMIN_CHAT_ID
//
// Body aceptado:
//   { content: "texto (acepta **negrita** y `codigo`)", buttons: [[{ text, callback_data }, ...], ...] }
//   `buttons` es opcional: cuando llega, se dibujan como botones inline en el mensaje.

function aHtml(s) {
  // Primero escapamos < > & para que el HTML de Telegram no se rompa,
  // luego convertimos **negrita** → <b> y `codigo` → <code>.
  s = String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  return s;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat  = process.env.ADMIN_CHAT_ID;
  if (!token || !chat) {
    res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN y ADMIN_CHAT_ID no configurados en Vercel' });
    return;
  }

  const content = (req.body && req.body.content) ? String(req.body.content) : '';
  const buttons = (req.body && Array.isArray(req.body.buttons)) ? req.body.buttons : [];

  const payload = {
    chat_id: chat,
    text: aHtml(content),
    parse_mode: 'HTML',
    disable_web_page_preview: true
  };

  if (buttons.length) {
    const rows = buttons
      .map(fila => (Array.isArray(fila) ? fila : [fila])
        .map(b => ({
          text: String(b.text || '').slice(0, 64),
          callback_data: String(b.callback_data || b.cb || '').slice(0, 64)
        }))
        .filter(b => b.text && b.callback_data))
      .filter(fila => fila.length);
    if (rows.length) payload.reply_markup = { inline_keyboard: rows };
  }

  try {
    const r = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    res.status(r.status).send('');
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}