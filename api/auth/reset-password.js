import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mntkcxqzqewsowaazoao.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token, password } = req.body;

  try {
    // 1. Validate token
    const { data: entry, error: tokenError } = await supabase
      .from('guru_password_resets')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !entry) {
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }

    // 2. Update user password
    const { error: updateError } = await supabase
      .from('guru_users')
      .update({ password })
      .eq('email', entry.email);

    if (updateError) throw updateError;

    // 3. Delete token after use
    await supabase.from('guru_password_resets').delete().eq('token', token);

    return res.status(200).json({ message: 'Senha atualizada com sucesso' });

  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Erro ao redefinir senha' });
  }
}
