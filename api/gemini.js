/**
 * Guru Master — Gemini API Proxy
 * Routes all /api/gemini/* calls to generativelanguage.googleapis.com
 * The sub-path is passed via the `path` query param by vercel.json rewrite.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // The rewrite in vercel.json passes everything after /api/gemini/ as ?path=...
    const rawPath = req.query.path || '';
    delete req.query.path;

    // Se a requisição veio sem o parâmetro "key" ou com a chave mascarada, injeta a chave Global Mestra.
    // Tenta usar a variável de ambiente primeiro, senão faz o fallback para as chaves conhecidas.
    const GLOBAL_KEY = process.env.GEMINI_API_KEY || "AIzaSyAA2D1mqTD59Czg6iz6eYcfL29VNyRoPnE";
    
    if (!req.query.key || req.query.key === 'GLOBAL_MASTER_KEY_ACTIVE' || req.query.key === 'AIzaSyAA2D1mqTD59Czg6iz6eYcfL29VNyRoPnE') {
      req.query.key = GLOBAL_KEY;
    }

    // Rebuild remaining query string
    const qs = Object.keys(req.query).length
      ? '?' + new URLSearchParams(req.query).toString()
      : '';

    const targetUrl = `https://generativelanguage.googleapis.com/${rawPath}${qs}`;
    console.log('[gemini proxy]', req.method, targetUrl.replace(req.query.key, '***KEY_HIDDEN***'));

    const fetchOptions = {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(55000) // 55s — alinhado ao maxDuration:60 do vercel.json
    };

    if (req.method === 'POST' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const googleRes = await fetch(targetUrl, fetchOptions);
    const text = await googleRes.text();

    res.setHeader('Content-Type', googleRes.headers.get('content-type') || 'application/json');
    return res.status(googleRes.status).send(text);
  } catch (err) {
    console.error('[gemini proxy] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
