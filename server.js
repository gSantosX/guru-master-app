import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// API Handlers
import sendCodeHandler from './api/auth/send-code.js';
import verifyCodeHandler from './api/auth/verify-code.js';
import forgotPasswordHandler from './api/auth/forgot-password.js';
import resetPasswordHandler from './api/auth/reset-password.js';
import createPaymentHandler from './api/create-payment.js';
import webhookHandler from './api/webhook.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Helper to adapt Vercel handler to Express
const vercelToExpress = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// API Routes
app.post('/api/auth/send-code', vercelToExpress(sendCodeHandler));
app.post('/api/auth/verify-code', vercelToExpress(verifyCodeHandler));
app.post('/api/auth/forgot-password', vercelToExpress(forgotPasswordHandler));
app.post('/api/auth/reset-password', vercelToExpress(resetPasswordHandler));
app.post('/api/create-payment', vercelToExpress(createPaymentHandler));
app.post('/api/webhook', vercelToExpress(webhookHandler));

// Serve Static Files (Frontend)
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Guru Master Server running on port ${PORT}`);
});
