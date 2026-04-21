/**
 * Guru Master — Unified Auth Handler
 * Replaces: auth/send-code, auth/verify-code, auth/forgot-password, auth/reset-password
 *
 * Routes (via vercel.json rewrite sending ?action=...):
 *   POST /api/auth/send-code        → ?action=send-code
 *   POST /api/auth/verify-code      → ?action=verify-code
 *   POST /api/auth/forgot-password  → ?action=forgot-password
 *   POST /api/auth/reset-password   → ?action=reset-password
 */
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const supabase = createClient(
  'https://mntkcxqzqewsowaazoao.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const createTransporter = () => nodemailer.createTransport({
  service: 'gmail',
  auth: { user: 'suporte.gurumaster@gmail.com', pass: process.env.SMTP_PASS }
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const action = req.query.action;

  // ── SEND CODE ──────────────────────────────────────────────────────
  if (action === 'send-code') {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'E-mail é obrigatório' });
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const { error: dbError } = await supabase
        .from('guru_verification_codes')
        .upsert({ email, code, expires_at: expiresAt.toISOString() });
      if (dbError) throw dbError;

      let mailOptions = {
        from: '"Guru Master AI" <suporte.gurumaster@gmail.com>',
        to: email,
        subject: `Seu código de acesso: ${code}`,
        html: `<p>Seu código de verificação Guru Master: <b>${code}</b></p>`,
        attachments: []
      };
      try {
        const Jimp = (await import('jimp')).default;
        const path = await import('path');
        const templatePath = path.join(process.cwd(), 'public', 'verify_template.jpg');
        const image = await Jimp.read(templatePath);
        const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
        const textWidth = Jimp.measureText(font, code);
        image.print(font, (image.bitmap.width - textWidth) / 2, image.bitmap.height * 0.65, code);
        const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
        mailOptions.attachments.push({ filename: 'verify.jpg', content: buffer, cid: 'verify_image' });
        mailOptions.html = `<div style="background:#000;padding:20px;text-align:center;"><img src="cid:verify_image" style="max-width:100%;border-radius:15px;"><p style="color:#444;font-size:10px;margin-top:10px;">Código: ${code}</p></div>`;
      } catch {}

      await createTransporter().sendMail(mailOptions);
      return res.status(200).json({ message: 'Código enviado com sucesso' });
    } catch (error) {
      console.error('Send code error:', error);
      return res.status(500).json({ error: 'Erro ao enviar código de verificação' });
    }
  }

  // ── VERIFY CODE ─────────────────────────────────────────────────────
  if (action === 'verify-code') {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'E-mail e código são obrigatórios' });
    try {
      const { data: record, error } = await supabase
        .from('guru_verification_codes')
        .select('*').eq('email', email).eq('code', code)
        .gt('expires_at', new Date().toISOString()).single();
      if (error || !record) return res.status(400).json({ error: 'Código inválido ou expirado' });
      await supabase.from('guru_verification_codes').delete().eq('id', record.id);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Verify code error:', error);
      return res.status(500).json({ error: 'Erro interno ao verificar código' });
    }
  }

  // ── FORGOT PASSWORD ─────────────────────────────────────────────────
  if (action === 'forgot-password') {
    const { email } = req.body;
    try {
      const { data: user, error: userError } = await supabase
        .from('guru_users').select('email').eq('email', email.toLowerCase()).single();
      if (userError || !user) return res.status(404).json({ error: 'Usuário não encontrado' });

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const { error: resetError } = await supabase
        .from('guru_password_resets')
        .upsert({ email: email.toLowerCase(), token, expires_at: expiresAt.toISOString() });
      if (resetError) throw resetError;

      const resetUrl = `https://www.gurumaster.shop/#/reset?t=${token}&e=${encodeURIComponent(email)}`;
      let mailOptions = {
        from: '"Guru Master AI" <suporte.gurumaster@gmail.com>',
        to: email,
        subject: 'Redefinicao de Senha - Guru Master AI',
        html: `<div style="background:#0d0d12;padding:40px;text-align:center;font-family:sans-serif;color:#fff;border-radius:20px;"><h2 style="color:#00f3ff;margin-bottom:20px;">Redefinir sua Senha</h2><p style="color:#64748b;font-size:14px;margin-bottom:30px;">Clique no botão abaixo para restaurar seu acesso ao Guru Master:</p><a href="${resetUrl}" style="background:#00f3ff;color:#000;padding:18px 40px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">Redefinir Minha Senha</a></div>`,
        attachments: []
      };
      try {
        const Jimp = (await import('jimp')).default;
        const path = await import('path');
        const templatePath = path.join(process.cwd(), 'public', 'reset_template.jpg');
        const image = await Jimp.read(templatePath);
        const shortUrl = `gurumaster.shop/reset?t=${token.substring(0, 8)}...`;
        const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
        const textWidth = Jimp.measureText(font, shortUrl);
        image.print(font, (image.bitmap.width - textWidth) / 2, image.bitmap.height * 0.535, shortUrl);
        const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
        mailOptions.attachments.push({ filename: 'reset_guru.jpg', content: buffer, cid: 'reset_image' });
        mailOptions.html = `<div style="background:#0d0d12;padding:40px;text-align:center;"><a href="${resetUrl}"><img src="cid:reset_image" style="max-width:100%;border-radius:15px;"></a><br><a href="${resetUrl}" style="background:#00f3ff;color:#000;padding:12px 30px;border-radius:8px;margin-top:20px;display:inline-block;font-weight:bold;">Redefinir Senha</a></div>`;
      } catch {}

      await createTransporter().sendMail(mailOptions);
      return res.status(200).json({ message: 'E-mail de recuperação enviado' });
    } catch (error) {
      console.error('Forgot password error:', error);
      return res.status(500).json({ error: 'Erro ao processar recuperação de senha' });
    }
  }

  // ── RESET PASSWORD ──────────────────────────────────────────────────
  if (action === 'reset-password') {
    const { token, password } = req.body;
    try {
      const { data: entry, error: tokenError } = await supabase
        .from('guru_password_resets').select('*').eq('token', token)
        .gt('expires_at', new Date().toISOString()).single();
      if (tokenError || !entry) return res.status(400).json({ error: 'Token inválido ou expirado' });
      const { error: updateError } = await supabase
        .from('guru_users').update({ password }).eq('email', entry.email);
      if (updateError) throw updateError;
      await supabase.from('guru_password_resets').delete().eq('token', token);
      return res.status(200).json({ message: 'Senha atualizada com sucesso' });
    } catch (error) {
      console.error('Reset password error:', error);
      return res.status(500).json({ error: 'Erro ao redefinir senha' });
    }
  }

  return res.status(400).json({ error: 'Ação inválida' });
}
