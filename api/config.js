import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mntkcxqzqewsowaazoao.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TABLE = 'guru_user_configs';

// Chave mestra principal — usada por TODOS os usuários como fallback
const MASTER_GEMINI_KEY = 'AIzaSyAA2D1mqTD59Czg6iz6eYcfL29VNyRoPnE';

const DEFAULTS = {
  gemini_key: MASTER_GEMINI_KEY,
  gpt_key: '',
  grok_key: '',
  anthropic_key: '',
  deepseek_key: '',
  elevenlabs_key: '',
  leonardo_key: '',
  youtube_key: '',
  google_script_key: '', // chave gratuita exclusiva para criação de roteiros
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

      // Fallback: buscar chave resiliente youtube_key da tabela guru_user_data
      const { data: userData } = await supabase
        .from('guru_user_data')
        .select('data_key, data_value')
        .eq('email', email)
        .in('data_key', ['youtube_key', 'google_script_key']);

      const baseConfig = data || { ...DEFAULTS, email };

      // Garante que a chave mestra SEMPRE está presente se o usuário não tiver uma chave configurada
      if (!baseConfig.gemini_key || !baseConfig.gemini_key.trim()) {
        baseConfig.gemini_key = MASTER_GEMINI_KEY;
      }
      // Remove a chave exclusiva de prompts (descontinuada)
      delete baseConfig.gemini_prompts_key;

      if (userData?.length > 0) {
        userData.forEach(row => {
          baseConfig[row.data_key] = row.data_value;
        });
      }

      return res.status(200).json(baseConfig);
    } catch (err) {
      console.error('Config GET error:', err);
      return res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { email: _e, gemini_prompts_key: _gpk, youtube_key, google_script_key, ...rest } = req.body;
      
      // 1. Salvar config principal (gemini_prompts_key descontinuada — ignorada)
      const payload = { email, ...rest, updated_at: new Date().toISOString() };
      const { error } = await supabase
        .from(TABLE)
        .upsert(payload, { onConflict: 'email' });

      if (error) throw error;

      // 2. Salvar chaves flexíveis na tabela guru_user_data
      const flexKeys = [];
      if (youtube_key !== undefined) flexKeys.push({ data_key: 'youtube_key', data_value: youtube_key });
      if (google_script_key !== undefined) flexKeys.push({ data_key: 'google_script_key', data_value: google_script_key });

      for (const fk of flexKeys) {
        const { error: errF } = await supabase
          .from('guru_user_data')
          .upsert(
            { email, ...fk, updated_at: new Date().toISOString() },
            { onConflict: 'email,data_key' }
          );
        if (errF) console.error(`Error saving ${fk.data_key}:`, errF);
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('Config POST error:', err);
      return res.status(500).json({ error: 'Erro ao salvar configurações' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
