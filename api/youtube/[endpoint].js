/**
 * Guru Master — YouTube Data API v3 Proxy
 * Route: /api/youtube/[endpoint] (dynamic route — catches search, channels, videos, commentThreads, etc.)
 *
 * Reads the user's youtube_key from Supabase using the email query param,
 * then proxies the request to the real YouTube Data API v3.
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

  // ── 1. Determine which YouTube endpoint to call ──────────────────
  // Vercel passes the dynamic segment as req.query.endpoint
  const endpoint = req.query.endpoint || 'search';

  // ── 2. Get the user's youtube_key from Supabase ──────────────────
  let apiKey = null;
  const email = (req.query.email || '').toLowerCase().trim();

  if (email) {
    try {
      // Primary: guru_user_data (resilient key store)
      const { data: userData } = await supabase
        .from('guru_user_data')
        .select('data_value')
        .eq('email', email)
        .eq('data_key', 'youtube_key')
        .single();

      if (userData?.data_value) {
        apiKey = userData.data_value;
      } else {
        // Fallback: guru_user_configs table
        const { data: configData } = await supabase
          .from('guru_user_configs')
          .select('youtube_key')
          .eq('email', email)
          .single();

        if (configData?.youtube_key) {
          apiKey = configData.youtube_key;
        }
      }
    } catch (err) {
      console.error('[youtube proxy] Supabase lookup failed:', err.message);
    }
  }

  // Server-wide fallback key (optional env var)
  if (!apiKey && process.env.YOUTUBE_API_KEY) {
    apiKey = process.env.YOUTUBE_API_KEY;
  }

  if (!apiKey) {
    return res.status(401).json({
      error: {
        code: 401,
        message: 'YouTube API key not configured. Please add your YouTube Data API key in Settings and save.',
        status: 'UNAUTHENTICATED'
      }
    });
  }

  // ── 3. Build YouTube API URL ─────────────────────────────────────
  // Strip internal params, pass everything else to YouTube
  const { endpoint: _endpoint, email: _email, ...ytParams } = req.query;
  const params = new URLSearchParams({ ...ytParams, key: apiKey });
  const ytUrl = `${YT_BASE}/${endpoint}?${params.toString()}`;

  // ── 4. Proxy the request ─────────────────────────────────────────
  try {
    const ytRes = await fetch(ytUrl, {
      signal: AbortSignal.timeout(15000),
    });

    const body = await ytRes.json();
    return res.status(ytRes.status).json(body);
  } catch (err) {
    const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    console.error('[youtube proxy] Fetch error:', err.message);
    return res.status(503).json({
      error: {
        code: 503,
        message: isTimeout
          ? 'YouTube API timed out. Please try again.'
          : `Proxy error: ${err.message}`,
        status: 'UNAVAILABLE'
      }
    });
  }
}
