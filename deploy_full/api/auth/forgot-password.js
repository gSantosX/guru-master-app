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
    const resetUrl = `https://guru-master-website.vercel.app/#/reset?token=${token}`;

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
      subject: 'Redefinição de Senha - Guru Master AI',
      html: `
        <div style="background: #000; padding: 20px; text-align: center;">
          <img src="cid:reset_image" style="max-width: 100%; border-radius: 15px;">
          <p style="margin-top: 20px;">
            <a href="${resetUrl}" style="color: #00f3ff; text-decoration: underline; font-size: 12px;">Clique aqui se não conseguir ver o link acima</a>
          </p>
        </div>
      `,
      attachments: []
    };

    try {
      const Jimp = (await import('jimp')).default;
      const path = await import('path');
      const templatePath = path.join(process.cwd(), 'public', 'reset_template.jpg');
      
      const image = await Jimp.read(templatePath);
      // Use a smaller font for the link
      const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK); 
      
      const textWidth = Jimp.measureText(font, resetUrl);
      const x = (image.bitmap.width - textWidth) / 2;
      const y = image.bitmap.height * 0.65; // Estimated box position
      
      image.print(font, x, y, resetUrl);
      const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
      
      mailOptions.attachments.push({
        filename: 'reset.jpg',
        content: buffer,
        cid: 'reset_image'
      });
    } catch (imgError) {
      console.error('Image processing error:', imgError);
      mailOptions.html = `<p>Clique no link para redefinir sua senha: <a href="${resetUrl}">${resetUrl}</a></p>`;
    }

    await transporter.sendMail(mailOptions);
    return res.status(200).json({ message: 'E-mail de recuperação enviado' });

  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Erro ao processar recuperação de senha' });
  }
}
