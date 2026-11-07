// Salva gli appunti in Cloudflare KV (binding "NOTES"). Passa dal middleware: serve il login.
const json = { 'Content-Type': 'application/json' };

export async function onRequest({ request, env }) {
  if (!env.NOTES) return new Response('KV non configurato', { status: 501 });
  if (request.method === 'GET') {
    return new Response((await env.NOTES.get('notes')) || '{}', { headers: json });
  }
  if (request.method === 'PUT') {
    if (request.headers.get('Origin') !== new URL(request.url).origin) return new Response('Origine non valida', { status: 403 });
    const text = await request.text();
    if (text.length > 200000) return new Response('Troppo grande', { status: 413 });
    let data;
    try { data = JSON.parse(text); } catch { return new Response('JSON non valido', { status: 400 }); }
    const clean = {};
    for (const [k, v] of Object.entries(data || {})) {
      if (/^[a-z_]{1,30}$/.test(k) && typeof v === 'string') clean[k] = v.slice(0, 5000);
    }
    await env.NOTES.put('notes', JSON.stringify(clean));
    return new Response(null, { status: 204 });
  }
  return new Response('Metodo non consentito', { status: 405 });
}
