/**
 * Guru Master System Check & Bulk Key Validator
 * GET  /api/check          → System health status
 * POST /api/check          → Bulk key validation (body: { provider, keys[] })
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // POST = Bulk API Key Validation
  if (req.method === 'POST') {
    const { provider, keys } = req.body || {};
    if (!provider || !Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: 'provider and keys[] are required' });
    }
    const results = await Promise.all(
      keys.map(async (key) => {
        if (!key || typeof key !== 'string' || key.trim() === '') return { status: 'offline', reason: 'empty_key' };
        let actualKey = key.trim();
        if (actualKey === 'GLOBAL_MASTER_KEY_ACTIVE' && (provider === 'gemini' || provider === 'prompts_key')) {
          actualKey = process.env.GEMINI_API_KEY || "AIzaSyCvRK5Xtutiy9pCsvnrwJRdN3eczhogp2s";
        }
        return pingKey(provider, actualKey);
      })
    );
    // Return statuses array for backward compat, plus debug info
    return res.status(200).json({
      statuses: results.map(r => (typeof r === 'string' ? r : r.status)),
      debug: results.map(r => (typeof r === 'string' ? r : r.reason))
    });
  }

  // GET = System Health Check
  const smtpConfigured = !!process.env.SMTP_PASS;
  const status = {
    online: true,
    platform: "Vercel Serverless",
    environment: process.env.NODE_ENV || "production",
    version: "v3.2.1-debug",
    rendering: "online",
    ffmpeg: "Not found",
    ffprobe: "Not found",
    smtp: smtpConfigured,
    smtpConfigured,
    ai: {}
  };
  return res.status(200).json(status);
}

async function pingKey(provider, key) {
  try {
    if (provider === 'gemini' || provider === 'prompts_key') {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=1`,
        { signal: AbortSignal.timeout(12000) }
      );
      if (res.ok) return { status: 'online', reason: `http_${res.status}` };
      if (res.status === 429) return { status: 'quota', reason: 'rate_limited_429' };
      // Try to get error details
      let body = '';
      try { body = await res.text(); } catch {}
      return { status: 'offline', reason: `http_${res.status}_${body.substring(0, 100)}` };
    }
    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models?limit=1', {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(12000)
      });
      if (res.ok) return { status: 'online', reason: `http_${res.status}` };
      if (res.status === 429) return { status: 'quota', reason: 'rate_limited_429' };
      return { status: 'offline', reason: `http_${res.status}` };
    }
    if (provider === 'grok') {
      const res = await fetch('https://api.x.ai/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(12000)
      });
      if (res.ok) return { status: 'online', reason: `http_${res.status}` };
      if (res.status === 429) return { status: 'quota', reason: 'rate_limited_429' };
      return { status: 'offline', reason: `http_${res.status}` };
    }
    if (provider === 'youtube') {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=id&chart=mostPopular&maxResults=1&key=${key}`,
        { signal: AbortSignal.timeout(12000) }
      );
      if (res.ok) return { status: 'online', reason: `http_${res.status}` };
      if (res.status === 429) return { status: 'quota', reason: 'rate_limited_429' };
      let body = '';
      try { body = await res.text(); } catch {}
      return { status: 'offline', reason: `http_${res.status}_${body.substring(0, 100)}` };
    }
    return { status: 'offline', reason: 'unknown_provider' };
  } catch (err) {
    const reason = err?.name === 'TimeoutError' ? 'timeout_12s' :
                   err?.name === 'AbortError'   ? 'aborted'    :
                   `network_${err?.message?.substring(0, 60)}`;
    console.error(`[check] pingKey ${provider} failed:`, reason);
    return { status: 'offline', reason };
  }
}
