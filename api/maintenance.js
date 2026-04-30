/**
 * Guru Master — Sistema de Manutenção Global
 * GET  /api/maintenance  → { active: bool }
 * POST /api/maintenance  → body: { active: bool } → { ok: true }
 *
 * Usa a mesma tabela guru_user_data com email='_system_' e data_key='maintenance_mode'.
 * Utiliza o Supabase SDK igual ao config.js para garantir compatibilidade.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mntkcxqzqewsowaazoao.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SYSTEM_EMAIL = '_system_';
const DATA_KEY = 'maintenance_mode';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — lê o estado atual
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('guru_user_data')
        .select('data_value')
        .eq('email', SYSTEM_EMAIL)
        .eq('data_key', DATA_KEY)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found (normal)

      const active = data?.data_value === 'true';
      return res.status(200).json({ active });
    } catch (err) {
      console.error('[maintenance GET]', err);
      return res.status(200).json({ active: false }); // fail-safe — nunca bloquear por erro
    }
  }

  // POST — define o estado
  if (req.method === 'POST') {
    const { active } = req.body || {};
    const value = active ? 'true' : 'false';
    try {
      const { error } = await supabase
        .from('guru_user_data')
        .upsert(
          {
            email: SYSTEM_EMAIL,
            data_key: DATA_KEY,
            data_value: value,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'email,data_key' }
        );

      if (error) throw error;
      return res.status(200).json({ ok: true, active: !!active });
    } catch (err) {
      console.error('[maintenance POST]', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
