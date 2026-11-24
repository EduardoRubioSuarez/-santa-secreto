// Santa Secreto: logica compartida (local con node server.js, o en Vercel).
// Datos: en Vercel van a Redis (Upstash); en local, a data.json.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA = path.join(__dirname, 'data.json');
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = 'santa-secreto';

async function redis(cmd) {
  const r = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + REDIS_TOKEN },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

async function load() {
  let d;
  if (REDIS_URL) {
    const s = await redis(['GET', KEY]);
    d = s ? JSON.parse(s) : null;
  } else if (fs.existsSync(DATA)) {
    d = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  }
  if (!d) {
    // Lista inicial de nombres (solo nombres, nada secreto) desde names.txt
    const f = path.join(__dirname, 'names.txt');
    const names = fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').map(n => n.trim()).filter(Boolean) : [];
    d = { drawn: false, participants: names.map(n => ({ name: n, wish: '' })) };
    if (!REDIS_URL) d.adminKey = crypto.randomBytes(6).toString('hex');
    await save(d);
  }
  return d;
}
async function save(d) {
  if (REDIS_URL) await redis(['SET', KEY, JSON.stringify(d)]);
  else fs.writeFileSync(DATA, JSON.stringify(d, null, 2));
}
// En Vercel la clave viene de la variable ADMIN_KEY; en local, de data.json.
const adminKey = d => process.env.ADMIN_KEY || d.adminKey;

const norm = s => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
const find = (d, name) => d.participants.find(p => norm(p.name) === norm(name));

// Un solo ciclo aleatorio: nadie se toca a si mismo y no hay parejas cerradas de 2.
function draw(d) {
  const ps = d.participants.slice();
  for (let i = ps.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [ps[i], ps[j]] = [ps[j], ps[i]];
  }
  ps.forEach((p, i) => { p.target = ps[(i + 1) % ps.length].name; });
  d.drawn = true;
}

// PIN: se guarda hasheado. La primera vez que alguien entra, el PIN que escribe queda como su PIN.
// 5 intentos fallidos = 1 minuto bloqueado.
const hashPin = (name, pin) => crypto.createHash('sha256').update(norm(name) + ':' + pin).digest('hex');
async function checkPin(d, me, pin) {
  pin = String(pin || '').trim();
  if (!/^\d{4}$/.test(pin)) return { error: 'El PIN debe tener 4 números.' };
  d.fails = d.fails || {};
  const k = norm(me.name);
  const f = d.fails[k] || { n: 0, until: 0 };
  if (Date.now() < f.until) return { error: 'Demasiados intentos. Espera 1 minuto.' };
  if (!me.pin) { me.pin = hashPin(me.name, pin); await save(d); return { created: true }; }
  if (me.pin !== hashPin(me.name, pin)) {
    f.n++; if (f.n >= 5) { f.n = 0; f.until = Date.now() + 60000; }
    d.fails[k] = f; await save(d);
    return { error: 'PIN incorrecto. Si lo olvidaste, pídele al organizador que lo reinicie.' };
  }
  if (d.fails[k]) { delete d.fails[k]; await save(d); }
  return {};
}

function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}
function body(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body); // Vercel ya lo lee
  return new Promise(r => {
    let s = '';
    req.on('data', c => { s += c; if (s.length > 1e5) req.destroy(); });
    req.on('end', () => { try { r(JSON.parse(s || '{}')); } catch { r({}); } });
  });
}

// Maneja las rutas /api/*
async function api(req, res) {
  const url = new URL(req.url, 'http://x');
  try {
    const d = await load();

    // --- admin ---
    if (url.pathname.startsWith('/api/admin')) {
      const k = adminKey(d);
      if (!k) return send(res, 500, { error: 'Falta configurar ADMIN_KEY en Vercel' });
      if (req.headers['x-key'] !== k) return send(res, 401, { error: 'Clave incorrecta' });
      if (url.pathname === '/api/admin' && req.method === 'GET')
        return send(res, 200, { drawn: d.drawn, participants: d.participants.map(p => ({ name: p.name, hasWish: !!p.wish, hasPin: !!p.pin })) });
      const b = await body(req);
      if (url.pathname === '/api/admin/participants') {
        if (d.drawn) return send(res, 400, { error: 'Ya se sorteo. Reinicia primero.' });
        const names = [...new Set((b.names || []).map(n => String(n).trim()).filter(Boolean))];
        if (new Set(names.map(norm)).size !== names.length) return send(res, 400, { error: 'Hay nombres repetidos' });
        const old = Object.fromEntries(d.participants.map(p => [norm(p.name), p]));
        d.participants = names.map(n => ({ name: n, wish: (old[norm(n)] || {}).wish || '', pin: (old[norm(n)] || {}).pin }));
        await save(d); return send(res, 200, { ok: true });
      }
      if (url.pathname === '/api/admin/draw') {
        if (d.participants.length < 3) return send(res, 400, { error: 'Minimo 3 participantes' });
        if (d.drawn) return send(res, 400, { error: 'Ya se sorteo' });
        draw(d); await save(d); return send(res, 200, { ok: true });
      }
      if (url.pathname === '/api/admin/reset') {
        d.drawn = false; d.participants.forEach(p => delete p.target);
        await save(d); return send(res, 200, { ok: true });
      }
      if (url.pathname === '/api/admin/resetpin') {
        const p = find(d, b.name);
        if (!p) return send(res, 404, { error: 'No existe ese nombre' });
        delete p.pin; await save(d); return send(res, 200, { ok: true });
      }
      return send(res, 404, { error: 'No existe' });
    }

    // --- publico ---
    if (url.pathname === '/api/me' && req.method === 'POST') {
      const { name, pin } = await body(req);
      const me = find(d, name);
      if (!me) return send(res, 404, { error: 'No encontre ese nombre. Revisa como lo escribio el organizador.' });
      const c = await checkPin(d, me, pin);
      if (c.error) return send(res, 403, { error: c.error });
      const out = { name: me.name, wish: me.wish, drawn: d.drawn, created: !!c.created };
      if (d.drawn) { const t = find(d, me.target); out.target = t.name; out.targetWish = t.wish; }
      return send(res, 200, out);
    }
    if (url.pathname === '/api/wish' && req.method === 'POST') {
      const { name, pin, wish } = await body(req);
      const me = find(d, name);
      if (!me) return send(res, 404, { error: 'Nombre no encontrado' });
      if ((await checkPin(d, me, pin)).error || !me.pin) return send(res, 403, { error: 'PIN incorrecto' });
      me.wish = String(wish || '').slice(0, 500);
      await save(d); return send(res, 200, { ok: true });
    }
    return send(res, 404, { error: 'No existe' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'Error del servidor' });
  }
}

module.exports = { api, load, adminKey };
