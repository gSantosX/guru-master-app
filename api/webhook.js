import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mntkcxqzqewsowaazoao.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = req.body;
  console.log('Webhook payload received:', JSON.stringify(payload, null, 2));

  // Cakto specific fields
  const status = payload.status || payload.event;
  const email = payload.customer?.email || payload.email;
  const name = payload.customer?.name || payload.name || 'Usuário Guru';

  // Standard Success Statuses for Cakto/Hotmart/etc.
  const isSuccess = ['paid', 'completed', 'approved', 'sucesso', 'active', 'pago'].includes(status?.toLowerCase());

  if (isSuccess && email) {
    try {
      console.log(`Processing valid payment for: ${email}`);
      
      // Upsert user: Create if not exists, update access if exists
      const { data, error } = await supabase
        .from('guru_users')
        .upsert({ 
          email: email.toLowerCase(),
          name: name,
          is_active: true,
          is_lifetime: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'email' });

      if (error) throw error;
      
      console.log(`User ${email} activated successfully.`);
      return res.status(200).json({ success: true, message: 'User activated' });
    } catch (error) {
      console.error('Database error in webhook:', error);
      return res.status(500).json({ error: 'Database activation failed' });
    }
  }

  return res.status(200).json({ message: 'Webhook received but no action taken' });
}
