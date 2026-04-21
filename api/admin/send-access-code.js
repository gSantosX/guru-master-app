import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabaseUrl = 'https://mntkcxqzqewsowaazoao.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'E-mail e código são obrigatórios' });
  }

  try {
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
      subject: `🎁 Seu Acesso Vitalício Guru Master chegou! Código: ${code}`,
      html: `
        <div style="background: #020203; padding: 40px; text-align: center; font-family: sans-serif; color: #fff; border-radius: 20px;">
          <h1 style="color: #00f3ff; font-size: 24px;">Parabéns!</h1>
          <p style="color: #ccc; font-size: 16px;">Você acaba de receber <b>Acesso Vitalício</b> ao Guru Master.</p>
          <div style="background: #101015; border: 1px border #00f3ff; padding: 20px; border-radius: 12px; margin: 30px 0;">
            <p style="color: #555; text-transform: uppercase; font-size: 10px; letter-spacing: 2px; margin-bottom: 10px;">Seu Código de Ativação</p>
            <h2 style="color: #fff; font-size: 32px; letter-spacing: 5px; margin: 0;">${code}</h2>
          </div>
          <p style="color: #666; font-size: 12px;">Use este código no momento do cadastro para liberar seu acesso ilimitado.</p>
          <hr style="border: 0; border-top: 1px solid #222; margin: 30px 0;">
          <p style="color: #444; font-size: 10px;">Este é um e-mail automático. Não responda.</p>
        </div>
      `,
      attachments: []
    };

    try {
      const Jimp = (await import('jimp')).default;
      const path = await import('path');
      const templatePath = path.join(process.cwd(), 'public', 'lifetime_template.jpg');
      
      // Check if template exists
      const fs = await import('fs');
      if (fs.existsSync(templatePath)) {
        const image = await Jimp.read(templatePath);
        const font = await Jimp.loadFont(path.join(process.cwd(), 'public', 'fonts', 'font_black_64.fnt')).catch(() => Jimp.loadFont(Jimp.FONT_SANS_64_WHITE));
        
        // Horizontal centering
        const textWidth = Jimp.measureText(font, code);
        const x = (image.bitmap.width - textWidth) / 2;
        
        // Vertical positioning (estimated for the new template box)
        // Adjusting y to hit the middle of the underscored box area
        const y = image.bitmap.height * 0.57; 
        
        image.print(font, x, y, code);
        const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
        
        mailOptions.attachments.push({
          filename: 'acesso_vitalicio.jpg',
          content: buffer,
          cid: 'lifetime_image'
        });

        // Update body to use image
        mailOptions.html = `
          <div style="background: #000; padding: 10px; text-align: center;">
            <img src="cid:lifetime_image" style="max-width: 100%; border-radius: 15px;">
            <p style="color: #222; font-size: 8px;">Code: ${code}</p>
          </div>
        `;
      }
    } catch (imgError) {
      console.error('Image processing error:', imgError);
      // Fallback to the clean HTML layout above
    }

    await transporter.sendMail(mailOptions);
    return res.status(200).json({ message: 'Código enviado com sucesso' });
  } catch (error) {
    console.error('Send access code error:', error);
    return res.status(500).json({ error: 'Erro ao enviar e-mail de acesso vitalício' });
  }
}
