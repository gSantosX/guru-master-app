import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mntkcxqzqewsowaazoao.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'E-mail e código são obrigatórios' });
  }

  try {
    const { data: record, error } = await supabase
      .from('guru_verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !record) {
      return res.status(400).json({ error: 'Código inválido ou expirado' });
    }

    // Optional: Delete code after verification
    await supabase.from('guru_verification_codes').delete().eq('id', record.id);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Verify code error:', error);
    return res.status(500).json({ error: 'Erro interno ao verificar código' });
  }
}
