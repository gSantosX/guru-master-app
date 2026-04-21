import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mntkcxqzqewsowaazoao.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TABLE = 'guru_user_configs';

const DEFAULTS = {
  gemini_key: '',
  gpt_key: '',
  grok_key: '',
  gemini_prompts_key: '',
  anthropic_key: '',
  deepseek_key: '',
  elevenlabs_key: '',
  leonardo_key: '',
  youtube_key: '',
  google_client_id: '',
  active_ai: 'Gemini',
  active_model: 'gemini-2.5-flash',
  gemini_active_idx: 0,
  gpt_active_idx: 0,
  grok_active_idx: 0,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Extract email from query (GET) or body (POST)
  const email = (req.query?.email || req.body?.email || '').toLowerCase().trim();

  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return res.status(200).json(data || { ...DEFAULTS, email });
    } catch (err) {
      console.error('Config GET error:', err);
      return res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { email: _e, ...rest } = req.body;
      const payload = { email, ...rest, updated_at: new Date().toISOString() };

      const { error } = await supabase
        .from(TABLE)
        .upsert(payload, { onConflict: 'email' });

      if (error) throw error;

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('Config POST error:', err);
      return res.status(500).json({ error: 'Erro ao salvar configurações' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
