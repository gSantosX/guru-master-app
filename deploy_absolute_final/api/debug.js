export default function handler(req, res) {
  res.status(200).json({
    smtpConfigured: !!process.env.SMTP_PASS,
    supabaseConfigured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    nodeVersion: process.version,
    cwd: process.cwd(),
  });
}
