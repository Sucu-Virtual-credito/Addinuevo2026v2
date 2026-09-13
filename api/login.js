// 🔒 Valida la contraseña del dashboard EN EL SERVIDOR (nunca está en el repo).
// El secreto vive en: Vercel → Settings → Environment Variables → DASH_PASS
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const clave = (req.body && req.body.clave) ? String(req.body.clave) : '';
  if (clave && clave === process.env.DASH_PASS) {
    res.json({ ok: true });
  } else {
    res.status(401).json({ ok: false });
  }
}