// Prueba rápida de la conexión a Upstash. Uso (PowerShell):
//   $env:UPSTASH_REDIS_REST_URL="https://...upstash.io"; $env:UPSTASH_REDIS_REST_TOKEN="..."; node probar-redis.js
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
if (!url || !token) { console.log('Faltan UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN'); process.exit(1); }
const cmd = c => fetch(url, { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: JSON.stringify(c) }).then(r => r.json());
(async () => {
  const w = await cmd(['SET', 'prueba-santa', 'ok']);
  const r = await cmd(['GET', 'prueba-santa']);
  await cmd(['DEL', 'prueba-santa']);
  console.log(w.error || r.error ? 'ERROR: ' + (w.error || r.error) : r.result === 'ok' ? 'Conexión OK: puede guardar y leer.' : 'Respuesta inesperada: ' + JSON.stringify(r));
})().catch(e => console.log('ERROR de red:', e.message));
