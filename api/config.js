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

      // Fallback: buscar chaves resilientes da tabela guru_user_data
      const { data: userData } = await supabase
        .from('guru_user_data')
        .select('data_key, data_value')
        .eq('email', email)
        .in('data_key', ['gemini_prompts_key', 'youtube_key']);

      const baseConfig = data || { ...DEFAULTS, email };
      if (userData?.length > 0) {
        userData.forEach(row => {
          baseConfig[row.data_key] = row.data_value;
        });
      }

      // --- GLOBAL MASTER KEY FALLBACK ---
      // Se chaves essenciais estiverem vazias, buscar do admin (suporte.gurumaster@gmail.com)
      const ADMIN_EMAIL = 'suporte.gurumaster@gmail.com';
      if (email !== ADMIN_EMAIL) {
         const needsGemini = !baseConfig.gemini_key?.trim();
         const needsPrompts = !baseConfig.gemini_prompts_key?.trim();
         const needsYoutube = !baseConfig.youtube_key?.trim();

         if (needsGemini || needsPrompts || needsYoutube) {
            // Buscar config do admin
            const { data: adminConfig } = await supabase
              .from(TABLE)
              .select('gemini_key, gpt_key, grok_key')
              .eq('email', ADMIN_EMAIL)
              .single();
            
            // Buscar chaves resilientes do admin
            const { data: adminData } = await supabase
              .from('guru_user_data')
              .select('data_key, data_value')
              .eq('email', ADMIN_EMAIL)
              .in('data_key', ['gemini_prompts_key', 'youtube_key']);

            if (needsGemini && adminConfig?.gemini_key) {
               baseConfig.gemini_key = adminConfig.gemini_key;
            }
            if (needsPrompts) {
               const adminPromptKey = adminData?.find(d => d.data_key === 'gemini_prompts_key')?.data_value;
               if (adminPromptKey) baseConfig.gemini_prompts_key = adminPromptKey;
               else if (adminConfig?.gemini_key) baseConfig.gemini_prompts_key = adminConfig.gemini_key; // Double fallback
            }
            if (needsYoutube) {
               const adminYoutubeKey = adminData?.find(d => d.data_key === 'youtube_key')?.data_value;
               if (adminYoutubeKey) baseConfig.youtube_key = adminYoutubeKey;
            }
         }
      }

      return res.status(200).json(baseConfig);
    } catch (err) {
      console.error('Config GET error:', err);
      return res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { email: _e, gemini_prompts_key, youtube_key, ...rest } = req.body;
      
      // 1. Salvar config principal (removendo chaves extras para evitar erro de coluna inexistente)
      const payload = { email, ...rest, updated_at: new Date().toISOString() };
      const { error } = await supabase
        .from(TABLE)
        .upsert(payload, { onConflict: 'email' });

      if (error) throw error;

      // 2. Salvar chaves resilientes na tabela flexível guru_user_data
      const fallbackKeys = { gemini_prompts_key, youtube_key };
      for (const [key, value] of Object.entries(fallbackKeys)) {
        if (value !== undefined) {
          const { error: errF } = await supabase
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
          if (errF) console.error(`Error saving fallback key ${key}:`, errF);
        }
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('Config POST error:', err);
      return res.status(500).json({ error: 'Erro ao salvar configurações' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
