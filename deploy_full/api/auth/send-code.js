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

    let mailOptions = {
      from: '"Guru Master AI" <suporte.gurumaster@gmail.com>',
      to: email,
      subject: `Seu código de acesso: ${code}`,
      html: `
        <div style="background: #000; padding: 20px; text-align: center;">
          <img src="cid:verify_image" style="max-width: 100%; border-radius: 15px;">
          <p style="color: #444; font-size: 10px; margin-top: 10px;">Código: ${code}</p>
        </div>
      `,
      attachments: []
    // Simple Text-only email for reliability
    mailOptions.html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2>Seu código de acesso</h2>
        <p>Olá! Você iniciou seu cadastro por indicação no Guru Master AI.</p>
        <p style="font-size: 24px; font-weight: bold; color: #000;">${code}</p>
        <p>Insira este código para prosseguir com a definição de sua senha.</p>
      </div>
    `;

    if (!process.env.SMTP_PASS) {
      console.error('SMTP_PASS não configurada');
      return res.status(500).json({ error: 'Configuração de e-mail ausente (SMTP_PASS)' });
    }

    await transporter.sendMail(mailOptions);
    return res.status(200).json({ message: 'Código enviado com sucesso' });
  } catch (error) {
    console.error('Send code error:', error);
    return res.status(500).json({ error: 'Erro interno ao processar cadastro: ' + error.message });
  }
}
