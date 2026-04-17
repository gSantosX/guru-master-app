import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabaseUrl = 'https://mntkcxqzqewsowaazoao.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'E-mail é obrigatório' });
  }

  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    // Save to Supabase
    const { error: dbError } = await supabase
      .from('guru_verification_codes')
      .upsert({ email, code, expires_at: expiresAt.toISOString() });

    if (dbError) throw dbError;

    // Send E-mail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'suporte.gurumaster@gmail.com',
        pass: process.env.SMTP_PASS
      }
    });

    const mailOptions = {
      from: '"Guru Master AI" <suporte.gurumaster@gmail.com>',
      to: email,
      subject: `Seu código de acesso: ${code}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded: 10px;">
          <h2 style="color: #00f3ff; text-align: center;">Guru Master AI</h2>
          <p>Olá!</p>
          <p>Seu código de verificação para acesso à plataforma é:</p>
          <div style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333; margin: 20px 0;">
            ${code}
          </div>
          <p style="font-size: 12px; color: #666; text-align: center;">Este código expira em 15 minutos.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: 'Código enviado com sucesso' });
  } catch (error) {
    console.error('Send code error:', error);
    return res.status(500).json({ error: 'Erro ao enviar código de verificação' });
  }
}
