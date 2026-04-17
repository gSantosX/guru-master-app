import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const supabaseUrl = 'https://mntkcxqzqewsowaazoao.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body;

  try {
    // 1. Check if user exists
    const { data: user, error: userError } = await supabase
      .from('guru_users')
      .select('email')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // 2. Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    // 3. Save to guru_password_resets
    const { error: resetError } = await supabase
      .from('guru_password_resets')
      .upsert({ email, token, expires_at: expiresAt.toISOString() });

    if (resetError) throw resetError;

    // 4. Send E-mail
    const resetUrl = `https://guru-master-app.vercel.app/#reset-password?token=${token}`;

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
      subject: 'Redefinição de Senha - Guru Master AI',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #eee; border-radius: 20px; background-color: #0a0a0f; color: #ffffff;">
          <h1 style="color: #00f3ff; text-align: center;">Guru Master AI</h1>
          <p style="font-size: 16px;">Olá,</p>
          <p style="font-size: 16px;">Recebemos um pedido para redefinir a senha da sua conta no Guru Master AI.</p>
          <p style="font-size: 16px;">Clique no botão abaixo para escolher uma nova senha:</p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${resetUrl}" style="background-color: #00f3ff; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; display: inline-block;">Redefinir Minha Senha</a>
          </div>
          
          <p style="font-size: 14px; color: #888;">Este link é válido por 2 horas. Se você não solicitou a redefinição, pode ignorar este e-mail.</p>
          <hr style="border: 0; border-top: 1px solid #333; margin: 30px 0;">
          <p style="font-size: 12px; color: #555; text-align: center;">Guru Master AI - Protocolo Seguro de Autenticação</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return res.status(200).json({ message: 'E-mail de recuperação enviado' });

  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Erro ao processar recuperação de senha' });
  }
}
