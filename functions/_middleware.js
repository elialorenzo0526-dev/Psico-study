// Cloudflare Pages Function: protegge OGNI file del sito.
// Senza sessione valida non viene servito nulla (nemmeno JS o CSS).
// Variabili segrete (Cloudflare > Settings > Variables and Secrets): APP_USER, APP_PASSWORD, SESSION_SECRET

const COOKIE = '__Host-sid';
const TTL = 60 * 60 * 12; // sessione di 12 ore
const enc = new TextEncoder();

const APP_CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; " +
  "connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";
const LOGIN_CSP =
  "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'";

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Confronto a tempo costante
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Difesa CSRF: con Referrer-Policy rigida l'header Origin può valere "null", quindi si usa Sec-Fetch-Site
function sameOrigin(request, url) {
  const site = request.headers.get('Sec-Fetch-Site');
  if (site) return site === 'same-origin';
  return request.headers.get('Origin') === url.origin;
}

function harden(res, csp) {
  const r = new Response(res.body, res);
  r.headers.set('Content-Security-Policy', csp);
  r.headers.set('X-Content-Type-Options', 'nosniff');
  r.headers.set('X-Frame-Options', 'DENY');
  r.headers.set('Referrer-Policy', 'same-origin');
  r.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  r.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  r.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  r.headers.set('X-Robots-Tag', 'noindex, nofollow');
  r.headers.set('Cache-Control', 'private, no-store');
  return r;
}

async function isAuthed(request, env) {
  const raw = (request.headers.get('Cookie') || '').split(';').map((s) => s.trim()).find((s) => s.startsWith(COOKIE + '='));
  if (!raw) return false;
  const [exp, sig] = raw.slice(COOKIE.length + 1).split('.');
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now() / 1000) return false;
  return safeEqual(sig, await hmac(env.SESSION_SECRET, 'v1.' + exp));
}

function loginPage(error) {
  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Accesso</title><style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0e1824;color:#e6edf3;font:16px/1.5 system-ui,sans-serif}
form{width:min(92vw,340px);display:grid;gap:14px;padding:28px;background:#162334;border:1px solid #2c4057;border-radius:10px}
h1{margin:0 0 4px;font:600 24px Georgia,serif}label{display:grid;gap:4px;font-size:14px;color:#9fb3c8}
input{padding:10px;border-radius:6px;border:1px solid #3a516b;background:#0e1824;color:#e6edf3;font:inherit}
input:focus-visible,button:focus-visible{outline:2px solid #5fd0c4;outline-offset:2px}
button{padding:11px;border:0;border-radius:6px;background:#5fd0c4;color:#08202a;font:600 16px system-ui;cursor:pointer}
.e{margin:0;color:#ff9b8a;font-size:14px}</style></head><body>
<form method="post" action="/login"><h1>Atlante del cervello</h1>
${error ? '<p class="e" role="alert">Credenziali non corrette.</p>' : ''}
<label>Utente<input name="u" autocomplete="username" required maxlength="100"></label>
<label>Password<input name="p" type="password" autocomplete="current-password" required maxlength="200"></label>
<button type="submit">Entra</button></form></body></html>`;
  return harden(new Response(html, { status: error ? 401 : 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }), LOGIN_CSP);
}

export async function onRequest({ request, env, next }) {
  // Se mancano i segreti il sito resta chiuso (fail closed)
  if (!env.APP_USER || !env.APP_PASSWORD || !env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
    return new Response('Configurazione mancante', { status: 500 });
  }
  const url = new URL(request.url);

  if (url.pathname === '/logout') {
    const r = new Response(null, { status: 303, headers: { Location: '/' } });
    r.headers.append('Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`);
    return harden(r, APP_CSP);
  }

  if (url.pathname === '/login' && request.method === 'POST') {
    // Difesa CSRF: l'origine deve essere il sito stesso
    if (!sameOrigin(request, url)) return new Response('Richiesta non valida', { status: 403 });
    if (Number(request.headers.get('Content-Length') || 0) > 2000) return new Response('Troppo grande', { status: 413 });
    const form = await request.formData();
    const u = String(form.get('u') || '');
    const p = String(form.get('p') || '');
    const [a, b, c, d] = await Promise.all([
      hmac(env.SESSION_SECRET, 'u.' + u), hmac(env.SESSION_SECRET, 'u.' + env.APP_USER),
      hmac(env.SESSION_SECRET, 'p.' + p), hmac(env.SESSION_SECRET, 'p.' + env.APP_PASSWORD),
    ]);
    if (safeEqual(a, b) & safeEqual(c, d)) {
      const exp = Math.floor(Date.now() / 1000) + TTL;
      const r = new Response(null, { status: 303, headers: { Location: '/' } });
      r.headers.append('Set-Cookie', `${COOKIE}=${exp}.${await hmac(env.SESSION_SECRET, 'v1.' + exp)}; Path=/; Max-Age=${TTL}; HttpOnly; Secure; SameSite=Strict`);
      return harden(r, APP_CSP);
    }
    await new Promise((res) => setTimeout(res, 800)); // rallenta i tentativi
    return loginPage(true);
  }

  if (await isAuthed(request, env)) return harden(await next(), APP_CSP);
  return loginPage(false);
}
