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
    };

    try {
      const Jimp = (await import('jimp')).default;
      const path = await import('path');
      const templatePath = path.join(process.cwd(), 'public', 'verify_template.jpg');
      
      const image = await Jimp.read(templatePath);
      const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
      
      const textWidth = Jimp.measureText(font, code);
      const x = (image.bitmap.width - textWidth) / 2;
      const y = image.bitmap.height * 0.65; // Estimated box position
      
      image.print(font, x, y, code);
      const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
      
      mailOptions.attachments.push({
        filename: 'verify.jpg',
        content: buffer,
        cid: 'verify_image'
      });
    } catch (imgError) {
      console.error('Image processing error:', imgError);
      mailOptions.html = `<p>Seu código de verificação: <b>${code}</b></p>`;
    }

    await transporter.sendMail(mailOptions);
    return res.status(200).json({ message: 'Código enviado com sucesso' });
  } catch (error) {
    console.error('Send code error:', error);
    return res.status(500).json({ error: 'Erro ao enviar código de verificação' });
  }
}
