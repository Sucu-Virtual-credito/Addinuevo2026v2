// ============================================================================
//  🔒 Entrega la configuración de Firebase al navegador LEYENDO las variables
//  de entorno de Vercel. Así los datos (apiKey, projectId, etc.) NO están
//  escritos en el código ni en el repositorio: solo en Vercel.
//
//  Si falta algo, devuelve `ok:false` con la lista `missing` para que la página
//  le muestre al dueño exactamente qué variable debe crear en
//  Vercel → Settings → Environment Variables, en vez de quedarse colgada.
// ============================================================================
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.sendStatus(204); return; }

  const projectId = process.env.FIREBASE_PROJECT_ID || '';
  const apiKey = process.env.FIREBASE_API_KEY || '';
  const authDomain = process.env.FIREBASE_AUTH_DOMAIN || (projectId ? projectId + '.firebaseapp.com' : '');
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || (projectId ? projectId + '.firebasestorage.app' : '');
  const messagingSenderId = process.env.FIREBASE_MESSAGING_SENDER_ID || '';
  const appId = process.env.FIREBASE_APP_ID || '';
  const adminToken = process.env.FIREBASE_ADMIN_TOKEN || '';

  // Sin estas variables la página no puede conectar con la base de datos ni
  // escribir (las reglas de Firestore exigen el adminToken del asesor).
  const obligatorias = {
    FIREBASE_API_KEY: apiKey,
    FIREBASE_PROJECT_ID: projectId,
    FIREBASE_ADMIN_TOKEN: adminToken
  };
  const missing = Object.keys(obligatorias).filter(k => !obligatorias[k]);

  res.json({
    ok: missing.length === 0,
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    adminToken,
    missing
  });
}