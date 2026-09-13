// 🔒 Reenvía el mensaje a Discord SIN exponer el webhook en el código.
// El secreto vive en: Vercel → Settings → Environment Variables → DISCORD_WEBHOOK
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const webhook = process.env.DISCORD_WEBHOOK;
  if (!webhook) { res.status(500).json({ error: 'DISCORD_WEBHOOK no configurado en Vercel' }); return; }
  try {
    const r = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {})
    });
    res.status(r.status).send('');
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}