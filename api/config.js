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

// DATABASE SCHEME SAFE-LIST: Apenas estas colunas existem na tabela principal guru_user_configs
const SAFE_COLUMNS = [
  'email', 'gemini_key', 'gpt_key', 'grok_key', 
  'active_ai', 'active_model', 
  'gemini_active_idx', 'gpt_active_idx', 'grok_active_idx'
];

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

      // Fallback: buscar TODAS as chaves extras da tabela guru_user_data para este usuário
      const { data: extraData } = await supabase
        .from('guru_user_data')
        .select('data_key, data_value')
        .eq('email', email);

      const baseConfig = data || { ...DEFAULTS, email };
      if (extraData?.length > 0) {
        extraData.forEach(row => {
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
      const { email: _e, ...rest } = req.body;
      
      // Separar o que é coluna segura do que é campo dinâmico/novo
      const safePayload = { email, updated_at: new Date().toISOString() };
      const extraPayload = {};
      
      Object.keys(rest).forEach(key => {
        if (SAFE_COLUMNS.includes(key)) {
          safePayload[key] = rest[key];
        } else {
          extraPayload[key] = rest[key];
        }
      });

      // 1. Salvar na tabela principal (Apenas colunas Whitelisted)
      const { error } = await supabase
        .from(TABLE)
        .upsert(safePayload, { onConflict: 'email' });

      if (error) {
        console.error('Core config save error:', error);
        // Continuamos mesmo se o core falhar, tentando ao menos salvar o extra
      }

      // 2. Salvar campos extras na tabela flexível guru_user_data
      const fallbackPromises = Object.entries(extraPayload).map(([key, value]) => {
        if (value === undefined) return Promise.resolve();
        return supabase
          .from('guru_user_data')
          .upsert(
            { 
              email, 
              data_key: key, 
              data_value: value, 
              updated_at: new Date().toISOString() 
            },
            { onConflict: 'email,data_key' }
          );
      });

      await Promise.allSettled(fallbackPromises);

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('Config POST error:', err);
      return res.status(500).json({ error: 'Erro ao salvar configurações' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
