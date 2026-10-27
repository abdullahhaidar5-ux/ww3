// SUPERSEDED (2026-10-26): the World War 3 servers in server/ include this as their /turn route, together with the
// game list and relay rooms (see server/README.md). Kept only for reference; don't deploy this file.
//
// Cloudflare Worker: hands out short-lived Cloudflare TURN relay logins to the World War 3 game, so players whose
// networks block direct browser-to-browser connections (strict NATs, mobile data, some ISPs, schools, offices) can
// still join, by relaying through Cloudflare's network. Free up to 1,000 GB of relayed traffic a month.
//
// Setup (about 5 minutes, free Cloudflare account):
//   1. Cloudflare dashboard > Realtime > TURN Server > Create. Copy the Key ID and the API Token.
//   2. Workers & Pages > Create > Worker. Name it e.g. "ww3-relay", Deploy, then Edit code: paste this whole file, Deploy.
//   3. The worker's Settings > Variables and Secrets: add two secrets, TURN_KEY_ID and TURN_KEY_API_TOKEN.
//   4. Put the worker's address (https://ww3-relay.<your-subdomain>.workers.dev) in RELAY_CF_URL in index.html.
//
// Only the game's own pages may ask for logins, so other websites can't spend your free relay allowance.
const ALLOWED = ['https://abdullahhaidar5-ux.github.io', 'http://localhost', 'http://127.0.0.1'];
export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const ok = ALLOWED.some(a => origin === a || origin.startsWith(a + ':'));
    const cors = { 'Access-Control-Allow-Origin': ok ? origin : ALLOWED[0], 'Vary': 'Origin', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: { ...cors, 'Access-Control-Allow-Methods': 'GET' } });
    if (!ok || req.method !== 'GET') return new Response('{"error":"not allowed"}', { status: 403, headers: cors });
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: 86400 })
    });
    return new Response(await r.text(), { status: r.status, headers: cors });
  }
};
