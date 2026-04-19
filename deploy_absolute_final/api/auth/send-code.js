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

    // Robust Text-only email for maximum reliability
    const mailOptions = {
      from: '"Guru Master AI" <suporte.gurumaster@gmail.com>',
      to: email,
      subject: `Código de Acesso: ${code}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; text-align: center; background: #f9f9f9; border-radius: 10px;">
          <h2 style="color: #000;">Seu código de verificação</h2>
          <p style="font-size: 32px; font-weight: bold; color: #4F46E5; margin: 20px 0;">${code}</p>
          <p style="color: #666;">Use este código para completar seu cadastro por indicação no Guru Master.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999;">Se você não solicitou este código, ignore este e-mail.</p>
        </div>
      `
    };

    if (!process.env.SMTP_PASS) {
      console.error('ERRO: SMTP_PASS não encontrada no ambiente');
      return res.status(500).json({ error: 'Configuração de e-mail incompleta no servidor' });
    }

    console.log('Tentando enviar e-mail para:', email);
    await transporter.sendMail(mailOptions);
    console.log('E-mail enviado com sucesso.');
    
    return res.status(200).json({ message: 'Código enviado com sucesso' });
  } catch (error) {
    console.error('Send code critical error:', error);
    return res.status(500).json({ error: 'Erro ao processar cadastro: ' + error.message });
  }
}
