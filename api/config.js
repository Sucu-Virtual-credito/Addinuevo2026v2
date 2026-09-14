// ============================================================================
//  🔒 Entrega la configuración de Firebase al navegador LEYENDO las variables
//  de entorno de Vercel. Así los datos (apiKey, projectId, etc.) NO están
//  escritos en el código ni en el repositorio: solo en Vercel.
//
//  Variables que usa (Vercel → Settings → Environment Variables):
//    FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID,
//    FIREBASE_STORAGE_BUCKET, FIREBASE_MESSAGING_SENDER_ID, FIREBASE_APP_ID,
//    FIREBASE_ADMIN_TOKEN
// ============================================================================
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
  // Si no defines authDomain/storageBucket, los completamos desde el projectId
  const projectId = process.env.FIREBASE_PROJECT_ID || '';
  res.json({
    apiKey: process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || (projectId ? projectId + '.firebaseapp.com' : ''),
    projectId: projectId,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || (projectId ? projectId + '.firebasestorage.app' : ''),
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.FIREBASE_APP_ID || '',
    adminToken: process.env.FIREBASE_ADMIN_TOKEN || ''
  });
}