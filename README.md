# Atlante del cervello

Web app personale per studiare l'encefalo: modello 3D girevole, sezione sagittale, trasparenza della corteccia e schede di spiegazione. Accesso protetto da login lato server.

## Struttura
- `public/` sito statico (HTML, CSS, JS, three.js in locale)
- `functions/_middleware.js` login, sessione firmata e header di sicurezza (Cloudflare Pages Functions)

## Prova in locale
1. Copia `.dev.vars.example` in `.dev.vars` e inserisci utente, password e segreto (`openssl rand -hex 32`).
2. `npx wrangler pages dev public`
3. Apri l'indirizzo indicato (http://localhost:8788).

## GitHub
```
git init && git add . && git commit -m "Atlante del cervello"
git branch -M main
git remote add origin git@github.com:TUO-UTENTE/atlante-cervello.git
git push -u origin main
```
Usa un repository **privato**. `.dev.vars` è già escluso da `.gitignore`: non committare mai password o segreti.

## Cloudflare Pages
1. Workers & Pages > Create > Pages > Connect to Git, scegli il repository.
2. Build command: vuoto. Build output directory: `public`.
3. Settings > Variables and Secrets (tipo Secret): `APP_USER`, `APP_PASSWORD`, `SESSION_SECRET` (almeno 32 caratteri casuali). Poi rifai il deploy.
4. Consigliato: Security > WAF > Rate limiting rules, per esempio 10 richieste/minuto su `/login` (metodo POST).

Senza i tre segreti il sito risponde 500 e non mostra nulla.

## Sicurezza (cosa è stato fatto)
- Ogni file è servito solo con sessione valida (cookie `__Host-` HttpOnly, Secure, SameSite=Strict, firmato HMAC, 12 ore).
- Confronti a tempo costante, ritardo sui tentativi errati, controllo Origin contro CSRF.
- Content-Security-Policy restrittiva (solo script e stili dello stesso sito), HSTS, noindex, nessun contenuto da terzi, nessun `innerHTML`.
- Alternativa ancora più robusta: Cloudflare Access (Zero Trust, gratuito fino a 50 utenti) davanti al sito.

## Appunti (Cloudflare KV)
1. Storage & databases > KV > Create namespace, nome `atlante-appunti`.
2. Pages > il tuo progetto > Settings > Bindings > Add > KV namespace: variable name `NOTES`, scegli il namespace.
3. Rifai il deploy. Senza questo passaggio gli appunti restano solo nel browser (localStorage).
