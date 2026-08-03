// Issues short-lived Cloudflare TURN credentials for WebRTC clients. The TURN
// Key ID + API Token stay server-side only (Vercel env vars) - the client
// never sees them, just the generated username/credential pair, which is
// exactly what a TURN "REST API" credential scheme is meant for.
const TURN_KEY_ID = process.env.CF_TURN_KEY_ID;
const TURN_KEY_API_TOKEN = process.env.CF_TURN_KEY_API_TOKEN;
const TTL_SECONDS = 3600; // 1 hour - comfortably longer than any single match

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'method not allowed' }); return; }

  if (!TURN_KEY_ID || !TURN_KEY_API_TOKEN) {
    // Not configured yet - the client falls back to STUN-only, which still
    // works for same-network play, just not across real NATs.
    res.status(200).json({ iceServers: [{ urls: ['stun:stun.cloudflare.com:3478'] }] });
    return;
  }

  try {
    const r = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${TURN_KEY_ID}/credentials/generate-ice-servers`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TURN_KEY_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ttl: TTL_SECONDS }),
      }
    );
    if (!r.ok) {
      res.status(200).json({ iceServers: [{ urls: ['stun:stun.cloudflare.com:3478'] }] });
      return;
    }
    const data = await r.json();
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ iceServers: data.iceServers || [] });
  } catch {
    res.status(200).json({ iceServers: [{ urls: ['stun:stun.cloudflare.com:3478'] }] });
  }
}
