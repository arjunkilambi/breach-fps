// Public game-browser directory for BREACH multiplayer rooms.
// Hosts heartbeat their room here every few seconds; entries expire on their
// own (Redis TTL) if a host stops heartbeating, so there's nothing to clean up.
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});
const PREFIX = 'breach:room:';
const ROOM_TTL = 20; // seconds — must be longer than the client's heartbeat interval

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  if (req.method === 'GET') {
    const keys = await redis.keys(PREFIX + '*');
    const rooms = keys.length ? await redis.mget(...keys) : [];
    const list = rooms
      .filter(Boolean)
      .map(r => (typeof r === 'string' ? JSON.parse(r) : r));
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ rooms: list });
    return;
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    body = body || {};

    const code = String(body.code || '').toUpperCase().slice(0, 8);
    if (!/^[A-Z0-9]{4,8}$/.test(code)) { res.status(400).json({ error: 'bad room code' }); return; }

    const mode = ['coop', 'deathmatch', 'teams', 'ctf', 'tag', 'mission'].includes(body.mode) ? body.mode : 'coop';
    const hostName = String(body.hostName || 'Host').slice(0, 16);
    const mapName = String(body.mapName || 'Sector 7').slice(0, 24);
    const players = Math.max(1, Math.min(16, Number(body.players) || 1));
    const maxPlayers = Math.max(players, Math.min(16, Number(body.maxPlayers) || 8));

    const entry = { code, mode, hostName, mapName, players, maxPlayers, updatedAt: Date.now() };
    if (mode === 'teams' || mode === 'ctf') {
      entry.teamCount = Math.max(2, Math.min(8, Number(body.teamCount) || 2));
      entry.teamSize = Math.max(1, Math.min(6, Number(body.teamSize) || 1));
    }
    if (mode === 'tag') {
      entry.tagMinutes = [5, 10, 15].includes(Number(body.tagMinutes)) ? Number(body.tagMinutes) : 10;
    }
    await redis.set(PREFIX + code, JSON.stringify(entry), { ex: ROOM_TTL });
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method === 'DELETE') {
    const code = String((req.query && req.query.code) || '').toUpperCase();
    if (code) await redis.del(PREFIX + code);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'method not allowed' });
}
