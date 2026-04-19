import { createClient } from '@supabase/supabase-js';

// Vercel Serverless Function to handle Kiwify/Hotmart Webhooks
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Gateway Payload (Example for Kiwify)
  // {
  //   order_id: '1234',
  //   order_status: 'paid', // approved, refunded, chargeback
  //   Customer: { email: 'cliente@gmail.com' }, ...
  // }
  
  const payload = req.body;
  
  // Minimal detection logic - You might need to adjust this depending on the exact Gateway JSON schema
  const email = payload?.Customer?.email || payload?.data?.buyer?.email || payload?.email;
  const status = payload?.order_status || payload?.status || payload?.event;

  if (!email) {
    return res.status(400).json({ error: 'No email found in webhook payload' });
  }

  // Check if it's a paid/approved status
  const isApproved = ['paid', 'approved', 'COMPLETED'].includes(status?.toLowerCase());
  const isRefunded = ['refunded', 'chargeback', 'canceled'].includes(status?.toLowerCase());

  if (!isApproved && !isRefunded) {
    return res.status(200).json({ message: 'Status ignored' });
  }

  // Connect to Supabase using env keys or hardcoded (since this is server-side securely running on Vercel)
  const supabaseUrl = 'https://mntkcxqzqewsowaazoao.supabase.co';
  const supabaseKey = 'sb_publishable_qobuvzXBNQBIxI9b1Q6lBQ_uxf8h5p3'; // Replace with Service Role Key for security in prod
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Update User Status in Database
  const { data, error } = await supabase
    .from('guru_users')
    .update({ is_active: isApproved })
    .eq('email', email);

  if (error) {
    console.error('Database Update Error:', error);
    return res.status(500).json({ error: 'Database error' });
  }

  return res.status(200).json({ message: `User ${email} activation status set to ${isApproved}` });
}
