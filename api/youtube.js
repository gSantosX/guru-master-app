/**
 * Guru Master — YouTube Data API v3 Proxy  [v2 - 2026-04-22]
 * Route: /api/youtube?path=<endpoint>&part=...&email=user@example.com
 *
 * Reads the user's youtube_key from Supabase and proxies to YouTube Data API v3.
 * Called by frontend with path param: search, channels, videos, commentThreads
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mntkcxqzqewsowaazoao.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const YT_BASE = 'https://www.googleapis.com/youtube/v3';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── 1. Determine YouTube endpoint ─────────────────────────────────
  const endpoint = req.query.path || 'search';

  // ── 2. Look up youtube_key from Supabase ──────────────────────────
  let apiKey = null;
  const email = (req.query.email || '').toLowerCase().trim();

  if (email) {
    try {
      const { data: userData } = await supabase
        .from('guru_user_data')
        .select('data_value')
        .eq('email', email)
        .eq('data_key', 'youtube_key')
        .single();

      if (userData?.data_value) {
        apiKey = userData.data_value;
      } else {
        const { data: configData } = await supabase
          .from('guru_user_configs')
          .select('youtube_key')
          .eq('email', email)
          .single();
        if (configData?.youtube_key) apiKey = configData.youtube_key;
      }
    } catch (err) {
      console.error('[youtube] Supabase lookup failed:', err.message);
    }
  }

  if (!apiKey && process.env.YOUTUBE_API_KEY) {
    apiKey = process.env.YOUTUBE_API_KEY;
  }

  if (!apiKey) {
    return res.status(401).json({
      error: {
        code: 401,
        message: 'YouTube API key not configured. Please add your YouTube Data API key in Settings.',
        status: 'UNAUTHENTICATED'
      }
    });
  }

  // ── 3. Proxy to YouTube ───────────────────────────────────────────
  const { path: _path, email: _email, ...ytParams } = req.query;
  const params = new URLSearchParams({ ...ytParams, key: apiKey });
  const ytUrl = `${YT_BASE}/${endpoint}?${params.toString()}`;

  try {
    const ytRes = await fetch(ytUrl, { signal: AbortSignal.timeout(15000) });
    const body = await ytRes.json();
    return res.status(ytRes.status).json(body);
  } catch (err) {
    const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    return res.status(503).json({
      error: {
        code: 503,
        message: isTimeout ? 'YouTube API timed out.' : `Proxy error: ${err.message}`,
        status: 'UNAVAILABLE'
      }
    });
  }
}
