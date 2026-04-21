/**
 * Guru Master - Per-User Cloud Data API
 * GET  /api/user-data?email=x           → Load ALL keys for user
 * GET  /api/user-data?email=x&key=y     → Load one key
 * POST /api/user-data { email, key, value } → Save one key
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mntkcxqzqewsowaazoao.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const email = ((req.query?.email || req.body?.email || '')).toLowerCase().trim();
  if (!email) return res.status(400).json({ error: 'email is required' });

  // ── GET: Load data ──────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const key = req.query?.key;
      let query = supabase.from('guru_user_data').select('data_key, data_value').eq('email', email);
      if (key) query = query.eq('data_key', key);

      const { data, error } = await query;
      if (error) throw error;

      if (key) {
        // Return just the value for a single key
        const row = data?.[0];
        return res.status(200).json({ value: row?.data_value ?? null });
      }

      // Return all keys as a flat object: { scripts: [...], profile: {...}, ... }
      const result = {};
      (data || []).forEach(row => { result[row.data_key] = row.data_value; });
      return res.status(200).json(result);
    } catch (err) {
      console.error('user-data GET error:', err);
      return res.status(500).json({ error: 'Erro ao carregar dados' });
    }
  }

  // ── POST: Save data ─────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const { key, value } = req.body;
      if (!key) return res.status(400).json({ error: 'key is required' });

      const { error } = await supabase
        .from('guru_user_data')
        .upsert(
          { email, data_key: key, data_value: value, updated_at: new Date().toISOString() },
          { onConflict: 'email,data_key' }
        );

      if (error) throw error;
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('user-data POST error:', err);
      return res.status(500).json({ error: 'Erro ao salvar dados' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
