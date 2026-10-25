// Cloudflare Worker: hands out short-lived Cloudflare TURN relay logins to the World War 3 game.
// Setup: Cloudflare dashboard > Realtime > TURN Server > Create (copy the Key ID and API Token),
// then Workers & Pages > Create Worker, paste this file, and add two secrets: TURN_KEY_ID and TURN_KEY_API_TOKEN.
export default {
  async fetch(req, env) {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: { ...cors, 'Access-Control-Allow-Methods': 'GET' } });
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: 86400 })
    });
    return new Response(await r.text(), { status: r.status, headers: cors });
  }
};
